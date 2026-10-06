// Restart the ISOLATED newsletter backend (port 5700) on an empty db. Only ever touches this scratch stack.
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const BACKEND = 'C:/Users/Acer/Desktop/New folder/backend/backend';
const mongoose = require(BACKEND + '/node_modules/mongoose');
const MAIL = path.join(__dirname, 'mail');

(async () => {
  // stop whatever listens on 5700 (our own previous test backend)
  try {
    const out = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
    const pids = new Set(out.split('\n').filter((l) => /:5700\s.*LISTENING/.test(l)).map((l) => l.trim().split(/\s+/).pop()));
    for (const pid of pids) { try { execSync('taskkill /PID ' + pid + ' /F'); console.log('stopped test backend pid', pid); } catch (e) { console.log('could not stop', pid); } }
  } catch (e) { /* none */ }
  await mongoose.connect('mongodb://127.0.0.1:27700/nl_test');
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (fs.existsSync(MAIL)) for (const f of fs.readdirSync(MAIL)) fs.unlinkSync(path.join(MAIL, f));
  const log = fs.openSync(path.join(__dirname, 'backend.log'), 'w');
  const child = spawn(process.execPath, [path.join(__dirname, 'launch-backend.js')], { detached: true, stdio: ['ignore', log, log], env: { ...process.env, ...(process.env.SEC_MODE ? {} : {}) } });
  child.unref();
  for (let i = 0; i < 60; i += 1) {
    await new Promise((r) => setTimeout(r, 500));
    try { const r = await fetch('http://127.0.0.1:5700/api/health'); if (r.ok) { console.log('backend ready, pid', child.pid); return; } } catch (e) { /* not yet */ }
  }
  console.log('backend did not come up'); process.exit(1);
})();
