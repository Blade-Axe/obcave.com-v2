// services/obyear.service.js
//
// Computes the current "Ob Year" (a year running July 5 to July 5,
// not the calendar year) and compares message activity across past
// Ob Years. Year-over-year comparison can only cover periods where
// `messages` has data — see the note below about historical gaps.

const db = require('../db/db.config');
const siteConfig = require('../config/site.config');

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

function anniversaryTimestamp(year) {
  const { anniversaryMonth, anniversaryDay } = siteConfig.obYear;
  return new Date(year, anniversaryMonth - 1, anniversaryDay).getTime();
}

function getCurrentObYear(now = Date.now()) {
  const epochYear = new Date(siteConfig.obYear.epoch).getFullYear();

  let year = new Date(now).getFullYear();
  let start = anniversaryTimestamp(year);
  if (start > now) {
    year -= 1;
    start = anniversaryTimestamp(year);
  }
  const end = anniversaryTimestamp(year + 1);

  return {
    obYearNumber: year - epochYear + 1,
    start,
    end,
    percentElapsed: Math.min(100, Math.round(((now - start) / (end - start)) * 100)),
    daysUntilAnniversary: Math.ceil((end - now) / DAY_MS),
  };
}

async function getYearComparison(currentObYear) {
  const epochYear = new Date(siteConfig.obYear.epoch).getFullYear();
  const currentYear = new Date(currentObYear.start).getFullYear();
  const trackingStart = await dbGet('SELECT MIN(sentAt) AS min FROM messages');

  const results = [];
  for (let year = epochYear; year <= currentYear; year++) {
    const start = anniversaryTimestamp(year);
    const end = anniversaryTimestamp(year + 1);
    const row = await dbGet(
      'SELECT COUNT(*) AS count FROM messages WHERE sentAt >= ? AND sentAt < ? AND isBot = 0',
      [start, end]
    );

    results.push({
      obYearNumber: year - epochYear + 1,
      start,
      end,
      count: row.count || 0,
      // False means this Ob Year predates live tracking. Show it as
      // "no data", not as zero activity — those are different facts.
      tracked: trackingStart.min ? end > trackingStart.min : false,
    });
  }
  return results;
}

module.exports = { getCurrentObYear, getYearComparison };