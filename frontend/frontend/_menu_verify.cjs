// 1) Confirm the new utilities exist in the compiled CSS.
// 2) Guard against backticks inside JSX <style> template literals (they end the
//    literal early and produce a syntax error).
const fs = require('fs');
const path = require('path');

const dir = 'build/static/css';
const file = fs.readdirSync(dir).find((f) => f.endsWith('.css'));
const css = fs.readFileSync(path.join(dir, file), 'utf8');

let fails = 0;
const check = (label, cond) => {
  if (!cond) fails++;
  console.log((cond ? 'PASS  ' : 'FAIL  ') + label);
};

console.log('== compiled CSS ==');
['.lg\\:hidden', '.left-0', '.z-40', '.shrink-0', '.truncate', '.min-w-0', '.text-ink-soft', '.-ml-2', '.active\\:bg-gray-200']
  .forEach((c) => {
    const re = new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    check(c + ' present', re.test(css));
  });

console.log('\n== JSX source ==');
const src = fs.readFileSync('src/pages/AdminPage.jsx', 'utf8');

const styleStart = src.indexOf('/* Hide scrollbar styles */');
const styleBlock = src.slice(styleStart, src.indexOf('</style>', styleStart));
const ticks = (styleBlock.match(/`/g) || []).length;
check('style block backticks balanced (' + ticks + ')', ticks === 2);

const header = src.match(/<header className="([^"]*)"/);
check('header found', Boolean(header));
if (header) {
  const h = header[1];
  console.log('    classes: ' + h);
  check('header sticky', /\bsticky\b/.test(h));
  check('header pinned horizontally (left-0)', /\bleft-0\b/.test(h));
  check('header z-40', /\bz-40\b/.test(h));
}

check('content-scroll uses overflow-x: clip', /\.content-scroll\s*\{\s*overflow-x:\s*clip/s.test(src));
check('no leftover "overflow-x: hidden" on content-scroll',
  !/\.content-scroll\s*\{\s*overflow-x:\s*hidden/s.test(src));

const btn = src.match(/<button\s*\n\s*onClick=\{\(\) => setSidebarOpen\(true\)\}[\s\S]{0,320}?>/);
check('menu button found', Boolean(btn));
if (btn) {
  console.log('    ' + btn[0].replace(/\s+/g, ' ').slice(0, 200));
  check('menu button keeps lg:hidden', /lg:hidden/.test(btn[0]));
  check('menu button shrink-0', /shrink-0/.test(btn[0]));
  check('menu button has aria-label', /aria-label/.test(btn[0]));
}

console.log('\n' + (fails === 0 ? 'ALL CHECKS PASS' : fails + ' CHECK(S) FAILED'));
