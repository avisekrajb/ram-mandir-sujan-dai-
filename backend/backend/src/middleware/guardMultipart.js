// multer fills `req.body` (the text fields next to an uploaded file) AFTER the app-wide middleware has
// run, so those fields would skip the clean-up that every JSON body gets. This wraps a multer
// middleware so that, once the upload has been parsed, the same two guards run on the text fields:
// database-operator / prototype keys are stripped and `javascript:` style addresses are refused.
const sanitizeInput = require('./sanitizeInput');
const rejectUnsafeUrls = require('./rejectUnsafeUrls');

const guardMultipart = (multerMiddleware) => (req, res, next) =>
  multerMiddleware(req, res, (err) => {
    if (err) return next(err);
    return sanitizeInput(req, res, () => rejectUnsafeUrls(req, res, next));
  });

module.exports = guardMultipart;
