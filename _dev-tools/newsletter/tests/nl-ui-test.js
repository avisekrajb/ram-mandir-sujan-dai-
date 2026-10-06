// Browser check of the "Stay updated" band and the admin page: headless Chrome over CDP against :4200
// (dev bundle + ISOLATED newsletter backend :5700, db nl_test, mail written to ./mail).
const { spawn } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');
const BACKEND = 'C:/Users/Acer/Desktop/New folder/backend/backend';
const mongoose = require(BACKEND + '/node_modules/mongoose');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (id, ok, msg) => { results.push({ id, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' - ' + msg); };
const SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const MAIL = path.join(__dirname, 'mail');
const readMails = () => (fs.existsSync(MAIL) ? fs.readdirSync(MAIL).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(MAIL, f), 'utf8'))) : []);

(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27700/nl_test');
  const db = mongoose.connection.db;
  await fetch('http://127.0.0.1:5700/api/admin/settings'); // make sure the settings doc exists
  await db.collection('adminsettings').updateOne({}, { $set: { 'footer.showSubscribe': true } });
  await db.collection('subscribers').deleteMany({ email: /^ui\./ });

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9362', `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
  try {
    let list; for (let i = 0; i < 40; i++) { try { list = await (await fetch('http://127.0.0.1:9362/json/list')).json(); if (list.length) break; } catch {} await sleep(500); }
    const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
    let id = 0; const pending = new Map(); const errors = [];
    ws.onmessage = (e) => { const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
      else if (m.method === 'Runtime.exceptionThrown') errors.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200));
      else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console.error: ' + m.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 200)); };
    const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval failed'); return r.result.value; };
    await send('Page.enable'); await send('Runtime.enable');
    const waitFor = async (expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(500); } return false; };
    const dismiss = async () => {
      for (let k = 0; k < 2; k++) {
        await ev(`(() => { const b=[...document.querySelectorAll('button')]; const a=b.find(x=>/^accept$/i.test(x.textContent.trim())); if(a)a.click(); const c=b.find(x=>/close/i.test(x.getAttribute('aria-label')||'')); if(c)c.click(); return 1; })()`);
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await sleep(400);
      }
    };
    const view = async (w, h, mobile) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile });
    const open = async (url, lang = 'en', wait = '[data-stay-updated]') => {
      await send('Page.navigate', { url: 'http://localhost:4200/robots.txt' }); await sleep(800);
      await ev(`localStorage.setItem('lang','${lang}'); localStorage.setItem('lang_user_set','1'); 1`);
      await send('Page.navigate', { url });
      const ok = await waitFor(`!!document.querySelector('${wait}')`);
      await sleep(1500); await dismiss();
      return ok;
    };
    const shotEl = async (selector, name, pad = 0) => {
      const r = await ev(`(() => { const e=document.querySelector('${selector}'); if(!e) return null; e.scrollIntoView({block:'center'}); const b=e.getBoundingClientRect(); return JSON.stringify({x:Math.max(0,b.x-${pad}),y:b.y+scrollY-${pad},w:b.width+${pad * 2},h:b.height+${pad * 2}}); })()`);
      if (!r) return;
      await sleep(400);
      const c = JSON.parse(r);
      const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: c.x, y: c.y, width: c.w, height: c.h, scale: 1 } });
      fs.writeFileSync(path.join(SHOTS, name), Buffer.from(s.data, 'base64')); console.log('   saved', name);
    };
    const shotPage = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(SHOTS, name), Buffer.from(s.data, 'base64')); console.log('   saved', name); };
    const click = (sel) => ev(`(() => { const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return false; e.click(); return true; })()`);
    const setValue = (sel, v) => ev(`(() => { const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return false; const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(e, ${JSON.stringify(v)}); e.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
    const bandText = () => ev(`(document.querySelector('[data-stay-updated]')||{}).innerText || ''`);

    // ---------- 1. the band on every public page
    await view(1440, 900);
    const pages = ['/', '/about', '/templeteams', '/history', '/blogs', '/events', '/gallery', '/donate', '/contact', '/tools', '/calendar', '/booking', '/privacy', '/terms'];
    const missing = [];
    for (const p of pages) {
      const ok = await open('http://localhost:4200' + p);
      const info = ok ? JSON.parse(await ev(`(() => { const b=document.querySelectorAll('[data-stay-updated]'); const f=document.querySelector('[data-site-footer]'); return JSON.stringify({ n:b.length, next: b[0] && b[0].nextElementSibling === f, footerMt: f ? getComputedStyle(f).marginTop : null }); })()`)) : null;
      if (!info || info.n !== 1 || !info.next || info.footerMt !== '0px') missing.push(`${p} ${JSON.stringify(info)}`);
    }
    check('U1 the band appears once on each of 14 public pages, right above the footer with no gap', missing.length === 0, missing.join(' | ') || 'all ok');

    // ---------- 2. look, desktop, English
    await open('http://localhost:4200/');
    await shotEl('[data-stay-updated]', 'band-en-1440.png');
    const trap = JSON.parse(await ev(`(() => { const h=document.querySelector('input[name=hp_field]'); const r=h.getBoundingClientRect(); return JSON.stringify({ tab:h.tabIndex, left:Math.round(r.left), hidden: h.closest('[aria-hidden=true]') !== null }); })()`));
    check('U2 the bot-trap field is out of sight, out of the tab order and hidden from screen readers', trap.tab === -1 && trap.left < -1000 && trap.hidden, JSON.stringify(trap));
    check('U3 no horizontal page scroll at 1440', await ev(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), 'ok');

    // validation
    await click('[data-stay-updated] button[type=submit]'); await sleep(300);
    check('U4 empty e-mail -> friendly message, nothing sent', /valid e-mail/i.test(await bandText()), (await bandText()).split('\n').filter((l) => /valid/i.test(l))[0]);
    await setValue('[data-stay-updated] input[type=email]', 'ui.visitor@test.local');
    for (const t of ['events', 'festivals', 'news']) await ev(`[...document.querySelectorAll('[data-stay-updated] label')].find(l=>l.innerText.trim()===${JSON.stringify({ events: 'Events', festivals: 'Festival wishes', news: 'News' }[t])}).click()`);
    await sleep(200);
    await click('[data-stay-updated] button[type=submit]'); await sleep(300);
    check('U5 no topic ticked -> asks to choose one', /at least one topic/i.test(await bandText()), 'ok');
    await shotEl('[data-stay-updated]', 'band-en-error.png');
    // keyboard: topic chips are real checkboxes
    const kb = JSON.parse(await ev(`(() => { const c=[...document.querySelectorAll('[data-stay-updated] input[type=checkbox]')]; return JSON.stringify({ n:c.length, allOff: c.every(x=>!x.checked) }); })()`));
    check('U6 the three topics are real checkboxes (keyboard + screen reader)', kb.n === 3 && kb.allOff, JSON.stringify(kb));
    await ev(`[...document.querySelectorAll('[data-stay-updated] label')].filter(l=>/Events|Festival/.test(l.innerText)).forEach(l=>l.click())`);
    await sleep(200);
    await click('[data-stay-updated] button[type=submit]');
    const gotDone = await waitFor(`/Almost done/.test((document.querySelector('[data-stay-updated]')||{}).innerText||'')`, 15000);
    const row = await db.collection('subscribers').findOne({ email: 'ui.visitor@test.local' });
    check('U7 submitting shows "check your inbox", stores a PENDING subscriber with the chosen topics + language', gotDone && row && row.status === 'pending' && row.topics.join() === 'events,festivals' && row.lang === 'en', row ? `${row.status} ${row.topics} ${row.lang}` : 'no row');
    check('U7b after sending, keyboard focus is moved to the result (not lost on the page body)', await ev(`(() => { const a=document.activeElement; const b=document.querySelector('[data-stay-updated]'); return !!a && a!==document.body && b.contains(a); })()`), 'focus in the result box');
    await sleep(500);
    const mail = readMails().find((m) => m.to === 'ui.visitor@test.local');
    check('U8 the confirmation e-mail was written (English, confirm link)', !!mail && /confirm/i.test(mail.subject) && /\/api\/subscribe\/confirm\/[a-f0-9]{48}/.test(mail.text), mail ? mail.subject : 'none');
    await shotEl('[data-stay-updated]', 'band-en-done.png');
    await click('[data-stay-updated] button:not([type=submit])'); await sleep(300);
    check('U9 "Use a different address" brings the form back, e-mail cleared', await ev(`!!document.querySelector('[data-stay-updated] input[type=email]') && document.querySelector('[data-stay-updated] input[type=email]').value === ''`), 'form back');
    check('U9b ...and focus returns to the e-mail field', await ev(`document.activeElement === document.querySelector('[data-stay-updated] input[type=email]')`), 'focus on field');

    // the confirm link, opened in the browser
    const link = (mail.text.match(/https?:\/\/[^\s]+\/api\/subscribe\/confirm\/[a-f0-9]{48}/) || [])[0];
    await send('Page.navigate', { url: link.replace('http://127.0.0.1:5700', 'http://localhost:4200') }); await sleep(1500);
    await shotPage('confirm-page-en.png');
    const btnText = await ev(`(document.querySelector('form button')||{}).innerText`);
    check('U10 the e-mail link opens a confirm page with one button (a link click alone changes nothing)', !!btnText && (await db.collection('subscribers').findOne({ email: 'ui.visitor@test.local' })).status === 'pending', btnText);
    await ev(`document.querySelector('form button').click()`); await sleep(1500);
    await shotPage('confirmed-page-en.png');
    check('U11 pressing it activates the subscription', (await db.collection('subscribers').findOne({ email: 'ui.visitor@test.local' })).status === 'active', 'active');
    const welcome = readMails().filter((m) => m.to === 'ui.visitor@test.local').find((m) => /unsubscribe/i.test(JSON.stringify(m.headers)));
    check('U12 and the welcome mail arrives with the unsubscribe link', !!welcome, welcome ? welcome.subject : 'none');

    // ---------- 3. other languages and phone
    for (const lang of ['ne', 'hi', 'zh', 'ta']) {
      await open('http://localhost:4200/', lang);
      await shotEl('[data-stay-updated]', `band-${lang}-1440.png`);
      const txt = await bandText();
      check(`U13 band is translated (${lang})`, !/Stay updated|Subscribe|Festival wishes/.test(txt), txt.split('\n').slice(0, 2).join(' / '));
    }
    await view(390, 844, true);
    await open('http://localhost:4200/', 'en');
    await shotEl('[data-stay-updated]', 'band-en-390.png');
    check('U14 no horizontal scroll on a 390px phone', await ev(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), `${await ev('document.documentElement.scrollWidth')} <= 390`);
    await open('http://localhost:4200/', 'ne');
    await shotEl('[data-stay-updated]', 'band-ne-390.png');
    check('U15 no horizontal scroll on a 390px phone (Nepali)', await ev(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), 'ok');
    await view(1440, 900);

    // ---------- 4. switched off in Admin -> Footer
    await db.collection('adminsettings').updateOne({}, { $set: { 'footer.showSubscribe': false } });
    await send('Page.navigate', { url: 'http://localhost:4200/robots.txt' }); await sleep(500);
    await open('http://localhost:4200/about', 'en', '[data-site-footer]');
    await sleep(1500);
    check('U16 "Subscribe" switched off in Footer settings hides the band', await ev(`!document.querySelector('[data-stay-updated]')`) && await ev(`getComputedStyle(document.querySelector('[data-site-footer]')).marginTop === '48px'`), 'hidden, footer spacing back to normal');
    await db.collection('adminsettings').updateOne({}, { $set: { 'footer.showSubscribe': true } });

    // ---------- 5. the Team page no longer has the old card
    await open('http://localhost:4200/templeteams', 'en');
    check('U17 the old "Stay connected" card is gone from the Team page (only one subscribe form)', (await ev(`document.querySelectorAll('input[type=email]').length`)) === 1 && !/Stay connected/.test(await ev('document.body.innerText')), 'one form');

    // ---------- 6. the admin page
    const login = await ev(`fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'super@test.local',password:'SuperTest#12345'})}).then(r=>r.json())`);
    await ev(`localStorage.setItem('token', ${JSON.stringify(login.token)}); localStorage.setItem('user', ${JSON.stringify(JSON.stringify(login.user || login.data || {}))}); 1`);
    await view(1440, 1000);
    await send('Page.navigate', { url: 'http://localhost:4200/admin/newsletter' });
    const adminOk = await waitFor(`/Subscribers & mail/.test(document.body.innerText) && /Active/.test(document.body.innerText)`, 90000);
    await sleep(1500);
    check('U18 Admin -> Subscribers & mail opens (sidebar entry + page)', adminOk, adminOk ? 'ok' : (await ev('document.body.innerText')).slice(0, 200));
    const navItem = await ev(`!![...document.querySelectorAll('a')].find(a => a.getAttribute('href') === '/admin/newsletter')`);
    check('U19 the sidebar has the entry', navItem, 'link present');
    await shotPage('admin-subscribers.png');
    const rowsText = await ev(`document.querySelector('table') ? document.querySelectorAll('tbody tr').length : -1`);
    check('U20 subscriber table lists people', rowsText > 0, `${rowsText} rows`);
    // deleting the only row of the last page must land on the last page that still exists
    await ev(`window.confirm = () => true; 1`);
    const have = await db.collection('subscribers').countDocuments({});
    let extra = (((1 - have) % 25) + 25) % 25; if (have + extra < 26) extra += 25;
    await db.collection('subscribers').insertMany(Array.from({ length: extra }, (_, i) => ({ email: `ui.page${i}@test.local`, status: 'active', topics: ['news'], lang: 'en', unsubscribeToken: ('ab' + String(i).padStart(4, '0')).repeat(8).slice(0, 48), subscribedAt: new Date(Date.now() - 1000000 - i * 1000), source: 'test' })));
    await ev(`(() => { const b=[...document.querySelectorAll('[role=radio]')].find(x=>x.innerText.trim().startsWith('Send a mailing')); b.click(); return 1; })()`); await sleep(400);
    await ev(`(() => { const b=[...document.querySelectorAll('[role=radio]')].find(x=>x.innerText.trim().startsWith('Subscribers')); b.click(); return 1; })()`); await sleep(1500);
    await ev(`[...document.querySelectorAll('nav[aria-label=Pagination] button')].find(b=>b.textContent.trim()==='2').click()`); await sleep(1500);
    const lastRows = await ev(`document.querySelectorAll('tbody tr').length`);
    await ev(`document.querySelector('tbody tr button[title=Remove]').click()`); await sleep(2500);
    const pager = await ev(`(document.querySelector('nav[aria-label=Pagination]') ? 'has pager' : 'no pager') + ' | ' + ([...document.querySelectorAll('p')].find(p=>/Showing/.test(p.textContent))||{}).textContent + ' | rows ' + document.querySelectorAll('tbody tr').length`);
    check('U20b removing the only row of the last page lands on the last page that still exists (no empty page)', lastRows === 1 && /Showing 1.25 of 25/.test(pager) && /rows 25/.test(pager), `${lastRows} row on page 2 -> ${pager}`);
    await db.collection('subscribers').deleteMany({ email: /^ui\.page/ });
    const clickTab = (label) => ev(`(() => { const b=[...document.querySelectorAll('[role=radio]')].find(x=>x.innerText.trim().startsWith(${JSON.stringify(label)})); if(!b) return false; b.click(); return true; })()`);
    await clickTab('Send a mailing'); await sleep(1500);
    await shotPage('admin-send.png');
    await ev(`(() => { const b=[...document.querySelectorAll('[role=radio]')].find(x=>x.innerText.trim().startsWith('Your own')); b.click(); return 1; })()`); await sleep(500);
    await shotPage('admin-send-custom.png');
    await clickTab('Festival wishes'); await waitFor(`document.querySelectorAll('li').length > 3`, 30000); await sleep(1000);
    await shotPage('admin-festivals.png');
    const fest = await ev(`document.querySelectorAll('main li, li').length`);
    check('U21 festival wishes tab lists upcoming festivals from the real patro', fest > 3, `${fest} list items`);
    await clickTab('History'); await sleep(1500);
    await shotPage('admin-history.png');
    await ev(`localStorage.removeItem('token'); localStorage.removeItem('user'); 1`);
    const real = errors.filter((e) => !/Failed to load resource|favicon|cdn|fonts|ERR_|403|401|net::/i.test(e));
    check('U22 no JavaScript errors on any of it', real.length === 0, real.slice(0, 3).join(' | ') || 'clean');
    ws.close();
  } finally {
    chrome.kill();
    await db.collection('adminsettings').updateOne({}, { $set: { 'footer.showSubscribe': true } }).catch(() => {});
    await mongoose.disconnect();
  }
  console.log('\nFAILED:', results.filter((x) => !x.ok).length, 'of', results.length);
})().catch((e) => { console.error(e); process.exit(1); });
