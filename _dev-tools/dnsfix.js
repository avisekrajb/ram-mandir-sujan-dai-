// Node's c-ares cannot resolve the Atlas mongodb+srv SRV record on this machine; Windows DNS can.
// Start the real backend with:  node --require "<this file>" server.js   (from backend\backend)
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
