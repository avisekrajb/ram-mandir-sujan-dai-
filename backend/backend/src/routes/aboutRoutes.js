const express = require('express');
const router = express.Router();
const { getAbout, updateAbout } = require('../controllers/aboutController');
const protect = require('../middleware/auth');
const admin = require('../middleware/admin');
const { requireArea } = require('../middleware/permissions');

router.get('/', getAbout);
router.put('/', protect, admin, requireArea('content'), updateAbout);

module.exports = router;