// Browser checks of the frontend security changes, via headless Chrome (CDP) against :4200
// (dev bundle + ISOLATED backend). Poisoned values are written straight into the throwaway db to
// prove the page itself refuses them, even if the API guard were bypassed.
const { spawn } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');
const BACKEND = 'C:/Users/Acer/Desktop/New folder/backend/backend';
const mongoose = require(BACKEND + '/node_modules/mongoose');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (id, ok, msg) => { results.push({ id, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' - ' + msg); };
const OUT = __dirname;

(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27700/sec_audit_test');
  const db = mongoose.connection.db;
  // make sure the settings document exists, then poison it
  await fetch('http://127.0.0.1:5700/api/admin/settings');
  await db.collection('adminsettings').updateOne({}, { $set: {
    'footer.mapUrl': 'javascript:document.title="PWNED-map"',
    'footer.navButtons': [{ label: { en: 'Evil link' }, path: 'javascript:document.title="PWNED-nav"' }, { label: { en: 'Events' }, path: '/events' }],
    'liveVideo.url': 'javascript:document.title="PWNED-live"//embed/',
  } });
  await db.collection('socials').deleteMany({}).catch(() => {});

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9341', `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
  try {
    let list; for (let i = 0; i < 40; i++) { try { list = await (await fetch('http://127.0.0.1:9341/json/list')).json(); if (list.length) break; } catch {} await sleep(500); }
    const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
    let id = 0; const pending = new Map(); const errors = [];
    ws.onmessage = (e) => { const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
      else if (m.method === 'Runtime.exceptionThrown') errors.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 160)); };
    const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); return r.result.value; };
    const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, name), Buffer.from(r.data, 'base64')); };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'http://localhost:4200/robots.txt' }); await sleep(1500);
    await ev(`localStorage.clear(); localStorage.setItem('lang','en'); localStorage.setItem('lang_user_set','1'); sessionStorage.clear(); 1`);

    const waitFor = async (expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(600); } return false; };
    const dismiss = async () => {
      for (let k = 0; k < 3; k++) {
        await ev(`(() => { const b=[...document.querySelectorAll('button')]; const a=b.find(x=>/^accept$/i.test(x.textContent.trim())); if(a)a.click(); const c=b.find(x=>/close/i.test(x.getAttribute('aria-label')||'')); if(c)c.click(); return 1; })()`);
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await sleep(600);
      }
    };

    // 1. home page with poisoned settings
    await send('Page.navigate', { url: 'http://localhost:4200/' });
    check('U0 home page renders', await waitFor(`document.querySelectorAll('footer, [role=contentinfo]').length > 0 && document.body.innerText.length > 500`), 'footer present');
    await sleep(3000); await dismiss();
    const probe = JSON.parse(await ev(`JSON.stringify({
      title: document.title,
      jsLinks: [...document.querySelectorAll('a[href^="javascript:" i]')].map(a => a.textContent.trim()),
      jsFrames: [...document.querySelectorAll('iframe')].map(f => f.getAttribute('src') || '').filter(s => /^\\s*javascript:/i.test(s)),
      mapFrame: [...document.querySelectorAll('iframe')].map(f => f.getAttribute('src') || '').find(s => /google\\.com\\/maps/.test(s)) || null,
      footerLinks: [...document.querySelectorAll('footer a')].map(a => a.textContent.trim()).filter(Boolean).slice(0, 14),
    })`));
    check('X1 footer map: javascript: address replaced by the default Google map', !probe.jsFrames.length && !!probe.mapFrame, 'map iframe = ' + String(probe.mapFrame).slice(0, 60));
    check('X2 footer nav: javascript: link not rendered, normal links are', !probe.jsLinks.length && probe.footerLinks.includes('Events') && !probe.footerLinks.includes('Evil link'), probe.footerLinks.join(' | '));
    check('X3 nothing executed (title unchanged)', !/PWNED/.test(probe.title), 'title = ' + probe.title);
    // live video: click play if there is a facade
    await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>/play|watch/i.test((x.getAttribute('aria-label')||'')+x.textContent)); if(b) b.click(); return 1; })()`);
    await sleep(1500);
    const live = JSON.parse(await ev(`JSON.stringify({ title: document.title, jsFrames: [...document.querySelectorAll('iframe')].map(f=>f.getAttribute('src')||'').filter(s=>/^\\s*javascript:/i.test(s)) })`));
    check('X4 live-video address: javascript: never reaches an iframe', !live.jsFrames.length && !/PWNED/.test(live.title), 'title = ' + live.title);

    // 2. login modal -> forgot password -> 6 code boxes
    await ev(`(() => { window.dispatchEvent(new CustomEvent('open-auth', { detail: 'login' })); return 1; })()`);
    await sleep(1200);
    const opened = await waitFor(`!![...document.querySelectorAll('button')].find(x=>/forgot password/i.test(x.textContent))`, 8000);
    await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>/forgot password/i.test(x.textContent)); if(b) b.click(); return 1; })()`);
    await sleep(1200);
    check('F0 forgot-password dialog opens', opened && await ev(`!![...document.querySelectorAll('button')].find(x=>/send otp/i.test(x.textContent))`), 'Send OTP button present');
    await ev(`(() => { const i=[...document.querySelectorAll('input')].find(x=>x.type==='email'&&x.closest('form,div[class*=fixed],[role=dialog]')&&/@|email/i.test(x.placeholder||'')||x.type==='email'); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; const all=[...document.querySelectorAll('input[type=email]')]; const target=all[all.length-1]; set.call(target,'someone@test.local'); target.dispatchEvent(new Event('input',{bubbles:true})); const b=[...document.querySelectorAll('button')].find(x=>/send otp/i.test(x.textContent)); if(b) b.click(); return 1; })()`);
    const boxes = await waitFor(`document.querySelectorAll('input[id^="otp-"]').length >= 1`, 15000);
    if (!boxes) {
      console.log('   debug:', JSON.stringify(await ev(`JSON.stringify({ emails: [...document.querySelectorAll('input[type=email]')].map(i=>i.value), modal: (([...document.querySelectorAll('h3,h4')].find(h=>/forgot|otp|reset/i.test(h.textContent))||{}).textContent), err: [...document.querySelectorAll('div')].filter(d=>/text-red|bg-red/.test(d.className)&&d.children.length===0).map(d=>d.textContent).slice(0,3), sendBtn: !![...document.querySelectorAll('button')].find(x=>/send otp/i.test(x.textContent)) })`)));
      await shot('ui-debug-forgot.png');
    }
    const n = await ev(`document.querySelectorAll('input[id^="otp-"]').length`);
    check('F1 reset code has 6 boxes', boxes && n === 6, 'boxes = ' + n);
    // paste a 6-digit code into the first box (React-controlled input: use the native setter)
    await ev(`(() => { const i=document.getElementById('otp-0'); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(i,'48 2 9 1 7'); i.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
    await sleep(500);
    const filled = await ev(`[...document.querySelectorAll('input[id^="otp-"]')].map(i=>i.value).join('')`);
    check('F2 a pasted code is spread over the boxes and non-digits are dropped', filled === '482917', 'boxes hold "' + filled + '"');
    await shot('ui-forgot-6digit.png');

    check('Z0 no uncaught page errors during all of the above', errors.length === 0, errors.length ? errors.join(' || ') : 'none');
    ws.close();
  } finally { chrome.kill(); await mongoose.disconnect(); }
  console.log('\nFAILED:', results.filter((x) => !x.ok).length, 'of', results.length);
})().catch((e) => { console.error('UI TEST ERROR', e); process.exit(1); });
