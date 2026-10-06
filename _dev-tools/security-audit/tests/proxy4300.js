// CSP trial front door on :4300: like :4200 (isolated backend on :5700) but every HTML page is served
// with a Content-Security-Policy-Report-Only header, so the browser reports what the policy WOULD block
// without blocking anything. The policy text is read from csp-under-test.txt (one line).
const http = require('http');
const fs = require('fs');
const path = require('path');
const httpProxy = require('C:/Users/Acer/Desktop/New folder/frontend/frontend/node_modules/http-proxy');
const policy = () => fs.readFileSync(path.join(__dirname, 'csp-under-test.txt'), 'utf8').replace(/\s+/g, ' ').trim();
const app = httpProxy.createProxyServer({ changeOrigin: true, ws: true });
const api = httpProxy.createProxyServer({ changeOrigin: true });
app.on('proxyRes', (proxyRes) => {
  if (/text\/html/i.test(proxyRes.headers['content-type'] || '')) proxyRes.headers['content-security-policy-report-only'] = policy();
});
for (const p of [app, api]) p.on('error', (err, req, res) => {
  if (res && res.writeHead) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ message: 'proxy: ' + err.message })); }
});
const server = http.createServer((req, res) => {
  if (!req.url.startsWith('/api')) return app.web(req, res, { target: 'http://localhost:4000' });
  return api.web(req, res, { target: 'http://localhost:5700' });
});
server.on('upgrade', (req, socket, head) => app.ws(req, socket, head, { target: 'http://localhost:4000' }));
server.listen(4300, () => console.log('CSP trial front door on :4300'));
