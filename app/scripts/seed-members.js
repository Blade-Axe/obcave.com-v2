// scripts/seed-members.js
//
// One-time import: reads the community CSV export and creates
// placeholder member rows, plus alt-id links for later login
// matching. Safe to re-run — rows with a discordId already in the
// database are skipped.
//
// Usage: node scripts/seed-members.js path/to/member_orders.csv

const fs = require('fs');
const path = require('path');
const db = require('../db/db.config');
const discordService = require('../services/discord.service');

const csvPath = process.argv[2] || path.join(__dirname, '../data/member_orders.csv');

function parseCsvLine(line) {
  const values = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      values.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  values.push(cur);
  return values.map(v => v.trim());
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve(this);
    });
  });
}

async function run() {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const [, ...rows] = lines; // drop the header row

  for (const line of rows) {
    const [orderOfJoin, username, mainId, messageTotal, accountsCount, altIdsRaw] = parseCsvLine(line);

    const existing = await dbGet('SELECT id, discordAvatar FROM users WHERE discordId = ?', [mainId]);

    let userId;

    if (existing) {
      // Account already exists (e.g. they signed up before this
      // import ran) — refresh the CSV-sourced fields rather than
      // skipping the row entirely.
      await dbRun(
        'UPDATE users SET joinOrder = ?, messageTotal = ?, altAccountCount = ? WHERE id = ?',
        [Number(orderOfJoin), Number(messageTotal), Number(accountsCount), existing.id]
      );
      userId = existing.id;

      // Only fetch/set an avatar if they don't already have one from
      // a real login — don't overwrite a fresher avatar with a stale one.
      if (!existing.discordAvatar) {
        try {
          const discordUser = await discordService.getDiscordUserById(mainId);
          const avatarUrl = discordService.getAvatarUrl(mainId, discordUser.avatar);
          await dbRun('UPDATE users SET discordAvatar = ? WHERE id = ?', [avatarUrl, existing.id]);
        } catch (err) {
          console.warn(`Could not fetch avatar for ${username} (${mainId}): ${err.message}`);
        }
      }

      console.log(`Updated ${username} (${mainId}) — already existed.`);
    } else {
      let avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';
      try {
        const discordUser = await discordService.getDiscordUserById(mainId);
        avatarUrl = discordService.getAvatarUrl(mainId, discordUser.avatar);
      } catch (err) {
        console.warn(`Could not fetch avatar for ${username} (${mainId}): ${err.message}`);
      }

      // uuid, email, and password stay null here — they're generated
      // the first time this person actually logs in.
      const result = await dbRun(
        `INSERT INTO users (discordId, discordUsername, discordAvatar, joinOrder, messageTotal, altAccountCount, emailSet)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [mainId, username, avatarUrl, Number(orderOfJoin), Number(messageTotal), Number(accountsCount)]
      );
      userId = result.lastID;

      console.log(`Seeded ${username} (${mainId}).`);
    }

    const altIds = (altIdsRaw || '')
      .split(',')
      .map(id => id.trim())
      .filter(id => id && id.toLowerCase() !== 'null');

    for (const altId of altIds) {
      await dbRun(
        'INSERT OR IGNORE INTO discord_alt_ids (altDiscordId, userId) VALUES (?, ?)',
        [altId, userId]
      );
    }

    if (altIds.length) {
      console.log(`  linked ${altIds.length} alt id(s) for ${username}.`);
    }
  }

  console.log('Done.');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});