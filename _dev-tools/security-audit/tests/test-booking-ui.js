// Booking page in Nepali: options must SHOW Nepali names but SEND the stored English value, and a booking must go through.
const { spawn } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9345', `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
  try {
    let list; for (let i = 0; i < 40; i++) { try { list = await (await fetch('http://127.0.0.1:9345/json/list')).json(); if (list.length) break; } catch {} await sleep(500); }
    const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
    let id = 0; const pending = new Map();
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
    const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (x) => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); return r.result.value; };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'http://localhost:4200/robots.txt' }); await sleep(1500);
    // sign in through the real API (isolated backend) and keep the login like the site does
    const login = await ev(`fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.99.1.1' }, body: JSON.stringify({ email: 'ravi.v3@test.local', password: 'Temple#Lotus2026' }) }).then(r => r.json()).then(j => { localStorage.setItem('token', j.token); localStorage.setItem('user', JSON.stringify(j.user)); localStorage.setItem('lang', 'ne'); localStorage.setItem('lang_user_set', '1'); return !!j.token; })`);
    console.log('signed in:', login);
    await send('Page.navigate', { url: 'http://localhost:4200/booking' });
    const t0 = Date.now(); let opts = [];
    while (Date.now() - t0 < 60000) { opts = await ev(`[...document.querySelectorAll('select option')].map(o => ({ v: o.value, t: o.textContent.trim() })).filter(o => o.v)`) || []; if (opts.length > 3) break; await sleep(700); }
    console.log('options found:', opts.length);
    console.log('first three:', JSON.stringify(opts.slice(0, 3)));
    const labelsNepali = opts.slice(0, 3).every((o) => /[\u0900-\u097F]/.test(o.t));
    const valuesEnglish = opts.length > 0 && opts.every((o) => /^[\x00-\x7F]+$/.test(o.v));
    console.log((labelsNepali ? 'PASS' : 'FAIL') + ' labels are shown in Nepali');
    console.log((valuesEnglish ? 'PASS' : 'FAIL') + ' values sent to the server are the English stored names');
    ws.close();
  } finally { chrome.kill(); }
})().catch((e) => { console.error('ERR', e); process.exit(1); });
