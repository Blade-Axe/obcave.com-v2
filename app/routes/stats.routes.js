// routes/stats.routes.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const statsService = require('../services/stats.service');
const siteConfig = require('../config/site.config');

// requireAuth, not requireAdmin: any signed-in member can view this page.
router.get('/dashboard/stats', requireAuth, async (req, res) => {
  const [totals, bots, rankings, channelHistory] = await Promise.all([
    statsService.getServerTotals(),
    statsService.getBotBreakdown(),
    statsService.getMemberRankings(),
    statsService.getChannelHistory(),
  ]);

  res.render('statistics', {
    title: 'obcave - statistics',
    user: req.session.user,
    totals,
    bots,
    rankings,
    channelHistory,
  });
});

// Per-member alt breakdown, loaded on demand from the rankings table.
router.get('/dashboard/stats/breakdown/:userId', requireAuth, async (req, res) => {
  const breakdown = await statsService.getAltBreakdown(req.params.userId);
  res.json(breakdown);
});

// JSON data for the activity chart. `range` is a preset; `start`/`end`
// (ISO date strings) select a custom range instead.
router.get('/dashboard/stats/activity', requireAuth, async (req, res) => {
  const { range, start, end } = req.query;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();

  let startMs;
  let endMs = now;

  if (range === 'day') startMs = now - DAY_MS;
  else if (range === '14') startMs = now - 14 * DAY_MS;
  else if (range === '30') startMs = now - 30 * DAY_MS;
  else if (start && end) {
    startMs = new Date(start).getTime();
    endMs = new Date(end).getTime();
  } else {
    startMs = now - 30 * DAY_MS;
  }

  if (Number.isNaN(startMs) || Number.isNaN(endMs) || startMs >= endMs) {
    return res.status(400).json({ error: 'Invalid date range.' });
  }

  const series = await statsService.getActivityTimeseries(startMs, endMs);
  res.json(series);
});

module.exports = router;