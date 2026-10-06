// routes/teamRoutes.js
const express = require('express');
const router = express.Router();
const Team = require('../models/Team');

router.get('/', async (req, res) => {
  try {
    const team = await Team.find({ enabled: true })
      .sort({ order: 1 })
      .select('-__v');
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;