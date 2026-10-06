// Only the password-change endpoint is open while a temporary password is still in use:
// the account holder has to choose their own before doing anything else.
const OPEN_WHILE_TEMPORARY = ['/api/admin/profile/password'];

const admin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    if (req.user.mustChangePassword) {
      const url = String(req.originalUrl || '').split('?')[0].replace(/\/+$/, '').toLowerCase();
      if (!OPEN_WHILE_TEMPORARY.includes(url)) {
        return res.status(403).json({
          message: 'Choose your own password first.',
          code: 'PASSWORD_CHANGE_REQUIRED',
        });
      }
    }
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin' });
  }
};

module.exports = admin;
