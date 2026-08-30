// routes/obyear.routes.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const obYearService = require('../services/obyear.service');

router.get('/dashboard/ob-year', requireAuth, async (req, res) => {
  const current = obYearService.getCurrentObYear();
  const history = await obYearService.getYearComparison(current);

  res.render('ob-year', { title: 'obcave - ob year', user: req.session.user, current, history });
});

module.exports = router;