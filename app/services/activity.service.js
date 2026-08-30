// services/activity.service.js
//
// Rolling-window activity ranking. Reads only from the local
// `messages` table (populated live by discord-listener.service.js)
// — no Discord API calls happen here, so there is no rate-limit
// exposure from computing this.

const db = require('../db/db.config');

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Members ranked by message activity in the last `days` days, most
 * active first, combining each main account with its linked alts.
 * Members with no activity in the window are included at 0, not
 * omitted, so the list stays complete for pagination/display.
 */
async function getMostActive(days = 30) {
  const since = Date.now() - days * DAY_MS;

  return dbAll(
    `SELECT u.id, u.discordUsername, u.discordAvatar, u.joinOrder,
            u.messageTotal, u.altAccountCount,
            COUNT(m.id) AS activityCount
     FROM users u
     LEFT JOIN account_owners ao ON ao.userId = u.id
     LEFT JOIN messages m ON m.discordId = ao.discordId AND m.sentAt >= ?
     GROUP BY u.id
     ORDER BY activityCount DESC`,
    [since]
  );
}

module.exports = { getMostActive };