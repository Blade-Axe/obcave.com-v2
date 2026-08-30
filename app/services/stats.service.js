// services/stats.service.js
//
// Read-only aggregation queries for the internal statistics page.
// Nothing here calls the Discord API. All data comes from the local
// message_counts and messages tables.

const db = require('../db/db.config');

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

async function getServerTotals() {
  const totals = await dbGet(
    `SELECT
       SUM(CASE WHEN isBot = 0 THEN totalCount ELSE 0 END) AS memberTotal,
       SUM(CASE WHEN isBot = 1 THEN totalCount ELSE 0 END) AS botTotal
     FROM message_counts`
  );

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const thisMonth = await dbGet(
    'SELECT COUNT(*) AS count FROM messages WHERE sentAt >= ?',
    [startOfMonth.getTime()]
  );

  const memberTotal = totals.memberTotal || 0;
  const botTotal = totals.botTotal || 0;

  return {
    memberTotal,
    botTotal,
    grandTotal: memberTotal + botTotal,
    messagesThisMonth: thisMonth.count || 0,
  };
}

async function getBotBreakdown() {
  return dbAll(
    `SELECT discordId, displayName, totalCount
     FROM message_counts
     WHERE isBot = 1
     ORDER BY totalCount DESC`
  );
}

async function getChannelHistory() {
  return dbAll(
    `SELECT discordId, name, type, parentId, createdAt, deletedAt
     FROM channels
     ORDER BY createdAt ASC`
  );
}

/**
 * Every registered member, ranked by combined message total
 * (main account + all linked alts). Bot messages are excluded.
 */
async function getMemberRankings() {
  return dbAll(
    `SELECT u.id, u.discordUsername, u.discordAvatar,
            COALESCE(SUM(mc.totalCount), 0) AS combinedTotal
     FROM users u
     LEFT JOIN account_owners ao ON ao.userId = u.id
     LEFT JOIN message_counts mc ON mc.discordId = ao.discordId AND mc.isBot = 0
     GROUP BY u.id
     ORDER BY combinedTotal DESC`
  );
}

/**
 * Per-account breakdown for one member: their main account plus
 * every linked alt, each with a share of that member's combined
 * total. This answers "which alt sent the most/least" (2a).
 */
async function getAltBreakdown(userId) {
  const rows = await dbAll(
    `SELECT ao.discordId,
            COALESCE(mc.displayName, ao.discordId) AS displayName,
            COALESCE(mc.totalCount, 0) AS count
     FROM account_owners ao
     LEFT JOIN message_counts mc ON mc.discordId = ao.discordId
     WHERE ao.userId = ?
     ORDER BY count DESC`,
    [userId]
  );

  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return rows.map(r => ({
    ...r,
    percent: total ? Math.round((r.count / total) * 100) : 0,
  }));
}

/**
 * Message counts bucketed for a chart. Buckets by hour when the
 * range is one day or less, otherwise by day. Bot messages are
 * excluded so the chart reflects member activity only.
 */
async function getActivityTimeseries(startMs, endMs) {
  const bucket = (endMs - startMs) <= (24 * 60 * 60 * 1000) ? 'hour' : 'day';
  const format = bucket === 'hour' ? '%Y-%m-%dT%H:00' : '%Y-%m-%d';

  return dbAll(
    `SELECT strftime('${format}', sentAt / 1000, 'unixepoch') AS bucket, COUNT(*) AS count
     FROM messages
     WHERE sentAt >= ? AND sentAt <= ? AND isBot = 0
     GROUP BY bucket
     ORDER BY bucket ASC`,
    [startMs, endMs]
  );
}

module.exports = {
  getServerTotals,
  getBotBreakdown,
  getMemberRankings,
  getAltBreakdown,
  getActivityTimeseries,
  getChannelHistory,
};