// Prints the report HTML to a PDF with headless Chrome (CDP), with a page-numbered footer.
const { spawn } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [htmlFile, pdfFile] = process.argv.slice(2);
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-'));
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9371', `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
  try {
    let list; for (let i = 0; i < 40; i++) { try { list = await (await fetch('http://127.0.0.1:9371/json/list')).json(); if (list.length) break; } catch {} await sleep(500); }
    const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
    let id = 0; const pending = new Map();
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
    const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    await send('Page.enable');
    await send('Page.navigate', { url: 'file:///' + path.resolve(htmlFile).replace(/\\/g, '/') });
    await sleep(2500);
    const footer = '<div style="font-family:Calibri,Arial,sans-serif;font-size:8px;color:#555F6D;width:100%;text-align:center;padding:0 20mm">ZeroInfinity Infotech &nbsp;|&nbsp; zeroinfinitytechnologies.com &nbsp;|&nbsp; Confidential \u2014 prepared for the client &nbsp;|&nbsp; Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>';
    const r = await send('Page.printToPDF', { printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footer, preferCSSPageSize: true, marginTop: 0.79, marginBottom: 0.87, marginLeft: 0.87, marginRight: 0.87 });
    fs.writeFileSync(pdfFile, Buffer.from(r.data, 'base64'));
    console.log('pdf written', pdfFile);
    ws.close();
  } finally { chrome.kill(); }
})().catch((e) => { console.error(e); process.exit(1); });
