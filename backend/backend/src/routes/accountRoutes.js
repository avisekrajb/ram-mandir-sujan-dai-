const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const admin = require('../middleware/admin');
const { requireArea } = require('../middleware/permissions');
const ctrl = require('../controllers/accountController');

// Everything here needs a signed-in admin with the "users" area; the
// controller then applies the per-target rules (who may touch whom).
router.use(protect, admin, requireArea('users'));

// Literal paths first so ":id" never swallows them.
router.get('/summary', ctrl.accountSummary);
router.post('/bulk', ctrl.bulkAction);

router.get('/', ctrl.listAccounts);
router.post('/', ctrl.createAccount);

router.get('/:id', ctrl.getAccount);
router.patch('/:id', ctrl.updateAccount);
router.delete('/:id', ctrl.deleteAccount);

router.put('/:id/status', ctrl.setStatus);
router.put('/:id/role', ctrl.setRole);
router.put('/:id/permissions', ctrl.setPermissions);
router.post('/:id/reset-password', ctrl.resetPassword);
router.post('/:id/revoke-sessions', ctrl.revokeSessions);

module.exports = router;
