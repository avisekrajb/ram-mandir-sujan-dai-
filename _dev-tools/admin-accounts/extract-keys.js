// Lists every k7_ translation key used in the frontend with its inline English text.
const fs = require('fs');
const path = require('path');
const SRC = 'C:/Users/Acer/Desktop/New folder/frontend/frontend/src';
const files = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) { if (!['i18n', 'node_modules'].includes(e.name)) walk(p); }
  else if (/\.(jsx?|js)$/.test(e.name)) files.push(p);
});
walk(SRC);

const map = new Map();
const rx = /t\.(k7_\w+)\s*\|\|\s*\(?\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = rx.exec(s))) {
    const v = (m[2] !== undefined ? m[2] : m[3]).replace(/\\'/g, "'");
    if (!map.has(m[1])) map.set(m[1], v);
  }
}
// Strings defined as `label: 'English'` next to labelKey/descKey in permissions.js and role rows in AdminAccess.
const perm = fs.readFileSync(path.join(SRC, 'utils/permissions.js'), 'utf8');
for (const m of perm.matchAll(/label: '([^']*)',\s*labelKey: '(k7_\w+)',\s*desc: '([^']*)',\s*descKey: '(k7_\w+)'/g)) {
  map.set(m[2], m[1]); map.set(m[4], m[3]);
}
const access = fs.readFileSync(path.join(SRC, 'components/admin/AdminAccess.jsx'), 'utf8');
for (const m of access.matchAll(/\['(k7_\w+)', '((?:[^'\\]|\\.)*)'\]/g)) map.set(m[1], m[2].replace(/\\'/g, "'"));
const cats = fs.readFileSync(path.join(SRC, 'components/admin/AdminAudit.jsx'), 'utf8');
for (const m of cats.matchAll(/label: \['(k7_\w+)', '([^']*)'\]/g)) map.set(m[1], m[2]);

const acts = fs.readFileSync(path.join(SRC, 'components/admin/kit/auditActions.js'), 'utf8');
for (const m of acts.matchAll(/\['(k7_\w+)', '([^']*)'\]/g)) map.set(m[1], m[2]);

const all = new Set();
for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(/k7_\w+/g)) all.add(m[0]);
const out = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
fs.writeFileSync(path.join(__dirname, 'k7_keys.json'), JSON.stringify(out, null, 1));
console.log('keys with English:', map.size, ' referenced:', all.size);
console.log('missing English:', [...all].filter((k) => !map.has(k)).join(' '));
