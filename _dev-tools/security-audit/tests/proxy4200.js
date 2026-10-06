// Test-only front door on :4200.
//   /api/*  -> the ISOLATED security-test backend on :5700 (own database, mail/payment/cloud disabled)
//   the rest -> the normal dev server on :4000 (same app bundle as the real site)
const http = require('http');
const httpProxy = require('C:/Users/Acer/Desktop/New folder/frontend/frontend/node_modules/http-proxy');
const app = httpProxy.createProxyServer({ changeOrigin: true, ws: true });
const api = httpProxy.createProxyServer({ changeOrigin: true });
for (const p of [app, api]) p.on('error', (err, req, res) => {
  if (res && res.writeHead) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ message: 'proxy: ' + err.message })); }
});
const server = http.createServer((req, res) => {
  if (!req.url.startsWith('/api')) return app.web(req, res, { target: 'http://localhost:4000' });
  return api.web(req, res, { target: 'http://localhost:5700' });
});
server.on('upgrade', (req, socket, head) => app.ws(req, socket, head, { target: 'http://localhost:4000' }));
server.listen(4200, () => console.log('security-test front door on :4200'));
