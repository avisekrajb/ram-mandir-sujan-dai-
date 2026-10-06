// Prints every route of the Express app with its middleware names (static introspection, no server).
const BACKEND = 'C:/Users/Acer/Desktop/New folder/backend/backend';
process.env.JWT_SECRET = 'x'.repeat(32);
process.env.NODE_ENV = 'production';
process.chdir(BACKEND);
const app = require(BACKEND + '/src/app.js');

const out = [];
function walk(stack, prefix) {
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).filter((m) => layer.route.methods[m]).map((m) => m.toUpperCase());
      const mw = layer.route.stack.map((s) => s.name || '<anon>');
      for (const m of methods) out.push({ method: m, path: prefix + layer.route.path, mw: mw.slice(0, -1), handler: mw[mw.length - 1] });
    } else if (layer.name === 'router' && layer.handle.stack) {
      const src = layer.regexp.source
        .replace('^\\/', '/').replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/').replace(/\(\?:\(\[\^\/\]\+\?\)\)/g, ':param').replace(/\$$/, '').replace(/^\^/, '');
      walk(layer.handle.stack, prefix + src);
    }
  }
}
walk(app._router.stack, '');
require('fs').writeFileSync(__dirname + '/routes.json', JSON.stringify(out, null, 1));
console.log('routes:', out.length);
const noAuth = out.filter((r) => !r.mw.some((n) => /protect|admin|auth|superadmin|require|permission|verify/i.test(n)));
console.log('without an obvious auth middleware in the route chain:', noAuth.length);
