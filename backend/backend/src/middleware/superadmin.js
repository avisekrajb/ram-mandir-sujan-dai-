// Restrict a route to super admins only.
// Expects `protect` to have run first (req.user populated).
module.exports = function requireSuperAdmin(req, res, next) {
  if (req.user && req.user.role === 'superadmin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Super administrator only.' });
};
