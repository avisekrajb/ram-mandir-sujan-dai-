// Screenshots of the new top strip (real site on :4000) at several widths + a click-through check.
const { spawn } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = __dirname;
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9346', `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
  try {
    let list; for (let i = 0; i < 40; i++) { try { list = await (await fetch('http://127.0.0.1:9346/json/list')).json(); if (list.length) break; } catch {} await sleep(500); }
    const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
    let id = 0; const pending = new Map();
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
    const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (x) => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); return r.result.value; };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Page.navigate', { url: 'http://localhost:4000/robots.txt' }); await sleep(1200);
    const shot = async (name, w, h, clipH) => {
      const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: clipH || h, scale: 1 } });
      fs.writeFileSync(path.join(OUT, name), Buffer.from(r.data, 'base64')); console.log('saved', name);
    };
    const load = async (url, lang, w, h, mobile) => {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile });
      await ev(`localStorage.clear(); localStorage.setItem('lang','${lang}'); localStorage.setItem('lang_user_set','1'); sessionStorage.clear(); 1`);
      await send('Page.navigate', { url });
      const t0 = Date.now(); while (Date.now() - t0 < 60000) { try { if (await ev(`!!document.querySelector('nav[aria-label] a[href^="/tools#"]')`)) break; } catch {} await sleep(600); }
      await sleep(5000);
      // close the donation pop-up and cookie banner
      for (let k = 0; k < 2; k++) { await ev(`(() => { const b=[...document.querySelectorAll('button')]; const a=b.find(x=>/^accept$/i.test(x.textContent.trim())); if(a)a.click(); const c=b.find(x=>/close/i.test(x.getAttribute('aria-label')||'')); if(c)c.click(); return 1; })()`); await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(500); }
    };
    await load('http://localhost:4000/', 'en', 1440, 900); await shot('top-1440.png', 1440, 900, 150);
    const widths = await ev(`(() => { const bar=document.querySelector('.rt-site-header'); const row=[...bar.querySelectorAll('div,nav')].filter(e=>/overflow-x-auto/.test(e.className)); return JSON.stringify({ barH: Math.round(bar.getBoundingClientRect().height), rows: row.map(r=>({scrollW:r.scrollWidth, clientW:r.clientWidth})) }); })()`);
    console.log('1440 layout', widths);
    await load('http://localhost:4000/', 'en', 1280, 900); await shot('top-1280.png', 1280, 900, 150);
    console.log('1280 layout', await ev(`(() => { const bar=document.querySelector('.rt-site-header'); return Math.round(bar.getBoundingClientRect().height); })()`));
    await load('http://localhost:4000/', 'en', 1024, 800); await shot('top-1024.png', 1024, 800, 150);
    await load('http://localhost:4000/', 'en', 390, 844, true); await shot('top-390.png', 390, 844, 160);
    await load('http://localhost:4000/', 'ne', 1440, 900); await shot('top-1440-ne.png', 1440, 900, 150);
    // click-through: each name opens its own tool
    await load('http://localhost:4000/', 'en', 1440, 900);
    for (const tool of ['date', 'text', 'currency', 'time']) {
      await ev(`document.querySelector('a[href="/tools#${tool}"]').click()`); await sleep(1500);
      const state = await ev(`JSON.stringify({ hash: location.hash, path: location.pathname, openTab: (document.querySelector('[role=tab][aria-selected=true]')||{}).textContent, activePill: (document.querySelector('nav a[aria-current=page]')||{}).textContent })`);
      console.log('click', tool, '->', state);
    }
    await shot('top-tools-open.png', 1440, 900, 420);
    ws.close();
  } finally { chrome.kill(); }
})().catch((e) => { console.error(e); process.exit(1); });
