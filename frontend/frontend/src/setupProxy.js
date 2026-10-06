const { createProxyMiddleware } = require('http-proxy-middleware');

// Only /api is forwarded to the backend. Everything else is served by the React
// dev server, so a missing image no longer leaks through to the backend terminal.
//
// A string "proxy" in package.json would forward EVERY unmatched request
// (including missing static assets) to the backend, which is what caused the
// endless "GET /4.jpg" log spam.
//
// Target is localhost on the PC running the dev server. Because the browser
// calls a relative /api, this also works from a phone on the LAN at
// http://192.168.1.107:4000 -- the phone never needs to reach port 5000.
const target = process.env.REACT_APP_PROXY_TARGET || 'http://localhost:5000';

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      secure: false,
      logLevel: 'warn',
      // No pathRewrite: the backend mounts its routes at /api/*, so the full
      // path must be forwarded as-is (/api/health -> localhost:5000/api/health).
      onError(err, req, res) {
        console.error(`[proxy] ${req.method} ${req.originalUrl} -> ${target} failed: ${err.message}`);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            message: 'Backend is not reachable. Is the server running on port 5000?',
          })
        );
      },
    })
  );
};
