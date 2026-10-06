// Tiny headless-Chrome driver (CDP over ws) for verifying UI flows when the Browser pane is hidden.
// usage: node drive.js steps.json
// steps.json = { "width":1440, "height":900, "steps":[ {"nav":"http://..."}, {"eval":"js"}, {"wait":500},
//   {"click":"css or text=Label"}, {"type":["css","text"]}, {"shot":"name.png"}, {"log":"js expr -> printed"} ] }
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('C:/Users/Acer/Desktop/New folder/frontend/frontend/node_modules/ws');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const W = cfg.width || 1440, H = cfg.height || 900;
const PORT = 9333 + Math.floor(Math.random() * 500);
const profile = path.join(__dirname, 'chrome-profile-' + PORT);

const getJson = (url) => new Promise((res, rej) => {
  http.get(url, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    `--window-size=${W},${H}`, '--hide-scrollbars', '--no-first-run', '--disable-gpu', '--disable-extensions', 'about:blank',
  ], { stdio: 'ignore' });

  let targets;
  for (let i = 0; i < 40; i++) {
    try { targets = await getJson(`http://127.0.0.1:${PORT}/json`); if (targets.find((t) => t.type === 'page')) break; } catch { /* starting */ }
    await sleep(250);
  }
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.on('open', r));
  let id = 0; const pending = new Map(); const consoleErrors = [];
  ws.on('message', (m) => {
    const msg = JSON.parse(m);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') consoleErrors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') consoleErrors.push(msg.params.args.map((a) => a.value || a.description).join(' ').slice(0, 300));
  });
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) return { error: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text };
    return { value: r.result?.result?.value };
  };

  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: cfg.scale || 1, mobile: !!cfg.mobile });

  const clickJs = (sel) => `(() => {
    const sel = ${JSON.stringify(sel)};
    let el;
    if (sel.startsWith('text=')) {
      const want = sel.slice(5).toLowerCase();
      const all = [...document.querySelectorAll('button,a,[role=menuitem],[role=option],[role=radio],[role=tab],label')];
      el = all.find((e) => e.offsetParent !== null && (e.innerText || '').trim().toLowerCase() === want)
        || all.find((e) => e.offsetParent !== null && (e.innerText || '').trim().toLowerCase().includes(want));
    } else {
      el = [...document.querySelectorAll(sel)].find((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed') || document.querySelector(sel);
    }
    if (!el) return 'NOT FOUND: ' + sel;
    el.scrollIntoView({ block: 'center' });
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    el.click();
    return 'clicked ' + sel;
  })()`;
  const typeJs = (sel, text) => `(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return 'NOT FOUND: ${sel}';
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : (el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype);
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(text)});
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    return 'typed into ' + ${JSON.stringify(sel)};
  })()`;

  for (const step of cfg.steps) {
    if (step.nav) { await send('Page.navigate', { url: step.nav }); await sleep(step.after || 2500); }
    else if (step.login) {
      // Session minted for the ISOLATED test instance (mint.js): <name>.json holds { token, user }.
      const s = JSON.parse(fs.readFileSync(path.join(__dirname, step.login + '.json'), 'utf8'));
      const r = await evalJs(`localStorage.setItem('token', ${JSON.stringify(s.token)}); localStorage.setItem('user', ${JSON.stringify(JSON.stringify(s.user))}); localStorage.setItem('rcmt:cookie-consent','declined'); sessionStorage.setItem('rcmt:notice-dismissed','1'); 'ok'`);
      if (r.error) console.log('LOGIN ERROR:', r.error);
    }
    else if (step.eval) { const r = await evalJs(step.eval); if (r.error) console.log('EVAL ERROR:', r.error); }
    else if (step.log) { const r = await evalJs(step.log); console.log('LOG:', JSON.stringify(r.value ?? r.error)); }
    else if (step.click) { const r = await evalJs(clickJs(step.click)); if (/NOT FOUND/.test(r.value || '')) console.log(r.value); await sleep(step.after || 400); }
    else if (step.type) { const r = await evalJs(typeJs(step.type[0], step.type[1])); if (/NOT FOUND/.test(r.value || '')) console.log(r.value); await sleep(step.after || 300); }
    else if (step.key) {
      // Real key press: {"key":"Escape"} or {"key":"ArrowDown","after":300}
      const codes = { Escape: 27, ArrowDown: 40, ArrowUp: 38, Tab: 9, Enter: 13, Home: 36, End: 35 };
      const vk = codes[step.key] || step.key.toUpperCase().charCodeAt(0);
      const code = step.key.length === 1 ? 'Key' + step.key.toUpperCase() : step.key;
      const mods = step.modifiers || 0; // 1 alt, 2 ctrl, 4 meta, 8 shift
      await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: step.key, code, modifiers: mods, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: step.key, code, modifiers: mods, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
      await sleep(step.after || 400);
    }
    else if (step.wait) await sleep(step.wait);
    else if (step.resize) { await send('Emulation.setDeviceMetricsOverride', { width: step.resize[0], height: step.resize[1], deviceScaleFactor: cfg.scale || 1, mobile: !!step.mobile }); await sleep(400); }
    else if (step.shot) {
      const clip = step.fullPage ? undefined : undefined;
      const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!step.fullPage, ...(clip || {}) });
      fs.writeFileSync(path.join(OUT, step.shot), Buffer.from(r.result.data, 'base64'));
      console.log('shot:', path.join(OUT, step.shot));
    }
  }
  if (consoleErrors.length) console.log('PAGE ERRORS (' + consoleErrors.length + '):\n' + [...new Set(consoleErrors)].slice(0, 8).join('\n'));
  ws.close(); chrome.kill();
  await sleep(500);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* best effort */ }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
