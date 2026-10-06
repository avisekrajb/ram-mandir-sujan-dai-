// Phone-width check of the admin festival list (headless Chrome over CDP against :4200).
const { spawn } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9372', `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
  try {
    let list; for (let i = 0; i < 40; i++) { try { list = await (await fetch('http://127.0.0.1:9372/json/list')).json(); if (list.length) break; } catch {} await sleep(500); }
    const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
    let id = 0; const pending = new Map();
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
    const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (x) => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); return r.result.value; };
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: 'http://localhost:4200/robots.txt' }); await sleep(800);
    const login = await ev(`fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'super@test.local',password:'SuperTest#12345'})}).then(r=>r.json())`);
    await ev(`localStorage.setItem('lang','en'); localStorage.setItem('lang_user_set','1'); localStorage.setItem('token', ${JSON.stringify(login.token)}); localStorage.setItem('user', ${JSON.stringify(JSON.stringify(login.user || login.data || {}))}); 1`);
    await send('Page.navigate', { url: 'http://localhost:4200/admin/newsletter' });
    for (let i = 0; i < 100; i++) { try { if (await ev(`/Subscribers & mail/.test(document.body.innerText)`)) break; } catch {} await sleep(600); }
    await sleep(1500);
    await ev(`(() => { const b=[...document.querySelectorAll('[role=radio]')].find(x=>x.innerText.trim().startsWith('Festival wishes')); b.click(); return 1; })()`);
    for (let i = 0; i < 40; i++) { if (await ev(`document.querySelectorAll('li').length > 3`)) break; await sleep(700); }
    await sleep(800);
    console.log('name block width px:', await ev(`(() => { const li=[...document.querySelectorAll('li')].find(l=>/Ghatasthapana|Vijaya|Laxmi/.test(l.innerText)); const d=li.children[0].children[1]; return Math.round(d.getBoundingClientRect().width); })()`));
    console.log('horizontal overflow:', await ev(`document.documentElement.scrollWidth > document.documentElement.clientWidth`));
    await ev(`document.querySelector('li').scrollIntoView({block:'start'}); window.scrollBy(0,-120); 1`); await sleep(500);
    const s = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, 'shots', 'festivals-390.png'), Buffer.from(s.data, 'base64'));
    ws.close();
  } finally { chrome.kill(); }
})().catch((e) => { console.error(e); process.exit(1); });
