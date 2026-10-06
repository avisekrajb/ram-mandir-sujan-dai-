// Compares k7_ keys used in code with the Nepali dictionary: missing, extra, duplicates.
const fs = require('fs');
const path = require('path');
require('child_process').execFileSync('node', [path.join(__dirname, 'extract-keys.js')], { stdio: 'ignore' });
const used = new Map(require('./k7_keys.json'));
const file = fs.readFileSync('C:/Users/Acer/Desktop/New folder/frontend/frontend/src/utils/i18n/admin7.js', 'utf8');
const body = file.slice(file.indexOf('ne: {'));
const keys = [...body.matchAll(/^\s+(k7_\w+):/gm)].map((m) => m[1]);
const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
const ne = new Set(keys);
console.log('used:', used.size, ' ne:', ne.size);
console.log('missing in ne:', [...used.keys()].filter((k) => !ne.has(k)).join(' ') || 'none');
console.log('extra in ne:', [...ne].filter((k) => !used.has(k)).join(' ') || 'none');
console.log('duplicates:', dupes.join(' ') || 'none');
// placeholder parity
for (const [k, en] of used) {
  const re = en.match(/\{\w+\}/g) || [];
  const m = body.match(new RegExp(k + ": '((?:[^'\\\\]|\\\\.)*)'"));
  if (!m) continue;
  const rn = m[1].match(/\{\w+\}/g) || [];
  if (re.slice().sort().join() !== rn.slice().sort().join()) console.log('placeholder mismatch:', k, re, rn);
}
