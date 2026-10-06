const M = require('C:/Users/Acer/Desktop/New folder/backend/backend/node_modules/mongoose');
(async () => { await M.connect('mongodb://127.0.0.1:27700/sec_audit_test'); await M.connection.dropDatabase(); console.log('test db dropped (isolated mongod :27700 only)'); await M.disconnect(); })();
