// scripts/import-chat-export.js
//
// Imports historical message counts from DiscordChatExporter JSON
// exports. Only counts are stored. No message content is read past
// this script, and none is written to the database.
//
// Usage: node scripts/import-chat-export.js path/to/export/folder
//
// Expects one JSON file per channel, in DiscordChatExporter's
// standard JSON export format (each file has a top-level "channel"
// object and a "messages" array).

const fs = require('fs');
const path = require('path');
const db = require('../db/db.config');
const { chain } = require('stream-chain');
const { parser } = require('stream-json');
const { pick } = require('stream-json/filters/Pick');
const { streamValues } = require('stream-json/streamers/StreamValues');
const { streamArray } = require('stream-json/streamers/StreamArray');
const { snowflakeToTimestamp } = require('../utils/snowflake');

const exportDir = process.argv[2];
if (!exportDir) {
  console.error('Usage: node scripts/import-chat-export.js path/to/export/folder');
  process.exit(1);
}

// Message types that represent an actual sent message. Everything
// else (pins, joins, boosts, etc.) is a system event, not a message,
// and must not count toward totals.
const COUNTABLE_TYPES = new Set(['Default', 'Reply']);

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve(this);
    });
  });
}

/**
 * Reads only the "channel" key from the export, then closes the file
 * early. This avoids scanning the whole file twice for something
 * that appears once, near the top.
 */
function getChannelInfo(filePath) {
  return new Promise((resolve, reject) => {
    const pipeline = chain([
      fs.createReadStream(filePath),
      parser(),
      pick({ filter: 'channel' }),
      streamValues(),
    ]);

    let result = null;
    pipeline.on('data', ({ value }) => {
      result = value;
      pipeline.destroy(); // found it — stop reading the rest of the file
    });
    pipeline.on('close', () => resolve(result));
    pipeline.on('error', (err) => {
      // destroy() above triggers a benign premature-close error; ignore it.
      if (err.code === 'ERR_STREAM_PREMATURE_CLOSE') return resolve(result);
      reject(err);
    });
  });
}

// Tracks the most recently seen name/bot-flag per author, across all
// files in this run. Kept separate from the count itself, since
// counts are now derived from `messages`, not accumulated here.
const authorInfo = new Map(); // discordId -> { displayName, isBot }

async function insertMessageRow(discordId, channelId, sentAt, isBot, sourceMessageId) {
  return dbRun(
    'INSERT OR IGNORE INTO messages (discordId, channelId, sentAt, isBot, sourceMessageId) VALUES (?, ?, ?, ?, ?)',
    [discordId, channelId, sentAt, isBot ? 1 : 0, sourceMessageId]
  );
}

async function upsertChannel(discordId, name, type, parentId) {
  await dbRun(
    `INSERT INTO channels (discordId, name, type, parentId, createdAt)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(discordId) DO UPDATE SET
       name = excluded.name,
       type = excluded.type,
       parentId = excluded.parentId`,
    [discordId, name, type, parentId, snowflakeToTimestamp(discordId)]
  );
}

/**
 * Rebuilds message_counts.totalCount from the actual rows in
 * `messages`. Safe to run any number of times: since `messages` can
 * no longer contain duplicates (sourceMessageId is UNIQUE), this
 * always converges on the correct total, no matter how many times a
 * channel has been re-exported and re-imported.
 */
async function recomputeMessageCounts() {
  await dbRun(`
    INSERT INTO message_counts (discordId, isBot, totalCount, lastUpdated)
    SELECT discordId, MAX(isBot), COUNT(*), datetime('now')
    FROM messages
    GROUP BY discordId
    ON CONFLICT(discordId) DO UPDATE SET
      totalCount = excluded.totalCount,
      isBot = excluded.isBot,
      lastUpdated = excluded.lastUpdated
  `);
}

async function applyDisplayNames() {
  for (const [discordId, info] of authorInfo) {
    await dbRun('UPDATE message_counts SET displayName = ? WHERE discordId = ?', [info.displayName, discordId]);
  }
}

async function insertMessageRow(discordId, channelId, sentAt, isBot, sourceMessageId) {
  await dbRun(
    'INSERT OR IGNORE INTO messages (discordId, channelId, sentAt, isBot, sourceMessageId) VALUES (?, ?, ?, ?, ?)',
    [discordId, channelId, sentAt, isBot ? 1 : 0, sourceMessageId]
  );
}

async function importFile(filePath) {
  const channel = await getChannelInfo(filePath);
  const channelName = channel ? channel.name : path.basename(filePath);
  const channelId = channel ? channel.id : null;

  if (channel) {
    if (channel.category) {
      await upsertChannel(channel.category.id, channel.category.name, 'category', null);
    }
    await upsertChannel(channel.id, channel.name, channel.type || 'channel', channel.category ? channel.category.id : null);
  }

  const pipeline = chain([
    fs.createReadStream(filePath),
    parser(),
    pick({ filter: 'messages' }),
    streamArray(),
  ]);

  await dbRun('BEGIN');

  let imported = 0;
  for await (const { value: msg } of pipeline) {
    if (!COUNTABLE_TYPES.has(msg.type)) continue;

    const discordId = msg.author.id;
    const isBot = !!msg.author.isBot;
    authorInfo.set(discordId, { displayName: msg.author.nickname || msg.author.name, isBot });

    await insertMessageRow(discordId, channelId, Date.parse(msg.timestamp), isBot, msg.id);
    imported++;
  }

  await dbRun('COMMIT');
  console.log(`Processed ${channelName}: ${imported} countable message(s) (duplicates skipped automatically).`);
}

async function run() {
  const stat = fs.statSync(exportDir);
  const files = stat.isDirectory()
    ? fs.readdirSync(exportDir).filter(f => f.endsWith('.json')).map(f => path.join(exportDir, f))
    : [exportDir];

  if (!files.length) {
    console.error(`No .json files found at ${exportDir}`);
    process.exit(1);
  }

  for (const file of files) {
    await importFile(file);
  }

  await recomputeMessageCounts();
  await applyDisplayNames();

  console.log('Done.');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});