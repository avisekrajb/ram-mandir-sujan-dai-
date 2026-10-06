// Visits the main pages through :4300 (CSP report-only) in headless Chrome and lists every violation.
const { spawn } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAGES = ['/', '/about', '/history', '/events', '/gallery', '/contact', '/team', '/booking', '/calendar', '/tools', '/blogs', '/donate', '/privacy', '/terms', '/reset-password/abc123'];

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9342', `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
  try {
    let list; for (let i = 0; i < 40; i++) { try { list = await (await fetch('http://127.0.0.1:9342/json/list')).json(); if (list.length) break; } catch {} await sleep(500); }
    const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
    let id = 0; const pending = new Map(); let current = '?'; const found = new Map();
    ws.onmessage = (e) => { const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
      if (m.method === 'Log.entryAdded') { const t = m.params.entry.text || ''; if (/Content Security Policy|\[Report Only\]/i.test(t)) { const key = t.replace(/\s+/g, ' ').slice(0, 230); if (!found.has(key)) found.set(key, new Set()); found.get(key).add(current); } }
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') { const t = (m.params.args || []).map((a) => a.value || a.description || '').join(' '); if (/Content Security Policy|Report Only/i.test(t)) { const key = t.slice(0, 230); if (!found.has(key)) found.set(key, new Set()); found.get(key).add(current); } } };
    const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); return r.result.value; };
    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'http://localhost:4300/robots.txt' }); await sleep(1200);
    await ev(`localStorage.clear(); localStorage.setItem('lang','en'); localStorage.setItem('lang_user_set','1'); 1`);
    for (const p of PAGES) {
      current = p;
      await send('Page.navigate', { url: 'http://localhost:4300' + p });
      await sleep(6500);
      // open the login modal on the home page so the Google script path is exercised
      if (p === '/') { await ev(`window.dispatchEvent(new CustomEvent('open-auth', { detail: 'login' })); 1`); await sleep(3500); }
      // scroll to trigger lazy iframes / images
      await ev(`window.scrollTo(0, document.body.scrollHeight); 1`); await sleep(2500);
      console.log('visited', p);
    }
    console.log('\n=== CSP report-only violations ===');
    if (!found.size) console.log('none');
    for (const [k, pages] of found) console.log('-', k, '\n    on:', [...pages].join(' '));
    ws.close();
  } finally { chrome.kill(); }
})().catch((e) => { console.error('CSP TEST ERROR', e); process.exit(1); });
