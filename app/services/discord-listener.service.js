// services/discord-listener.service.js
//
// Live message-count tracking. Connects to Discord's gateway and,
// for every message sent in the configured guild, records that a
// message occurred: who sent it, when, and in which channel.
//
// Message CONTENT is never read or stored — the message.content
// field is never accessed below, and no privileged "message content"
// intent is requested, since it is not needed for counting.

const { Client, GatewayIntentBits } = require('discord.js');
const discordConfig = require('../config/discord.config');
const db = require('../db/db.config');
const { ChannelType } = require('discord.js');

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve(this);
    });
  });
}

async function recordMessage(discordId, displayName, isBot, channelId, sentAt, sourceMessageId) {
  const insertResult = await dbRun(
    'INSERT OR IGNORE INTO messages (discordId, channelId, sentAt, isBot, sourceMessageId) VALUES (?, ?, ?, ?, ?)',
    [discordId, channelId, sentAt, isBot ? 1 : 0, sourceMessageId]
  );

  // If the row was ignored (already present), this exact message was
  // already counted — do not increment totalCount a second time.
  if (insertResult.changes === 0) return;

  await dbRun(
    `INSERT INTO message_counts (discordId, displayName, isBot, totalCount, lastUpdated)
     VALUES (?, ?, ?, 1, datetime('now'))
     ON CONFLICT(discordId) DO UPDATE SET
       totalCount = totalCount + 1,
       displayName = excluded.displayName,
       isBot = excluded.isBot,
       lastUpdated = excluded.lastUpdated`,
    [discordId, displayName, isBot ? 1 : 0]
  );
}

async function upsertChannel(discordId, name, type, parentId) {
  const { snowflakeToTimestamp } = require('../utils/snowflake');
  await dbRun(
    `INSERT INTO channels (discordId, name, type, parentId, createdAt)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(discordId) DO UPDATE SET
       name = excluded.name, type = excluded.type, parentId = excluded.parentId`,
    [discordId, name, String(type), parentId, snowflakeToTimestamp(discordId)]
  );
}

async function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function syncGuildChannels(client) {
  const guild = client.guilds.cache.get(discordConfig.guildId);
  if (!guild) return;

  const liveIds = new Set();

  for (const channel of guild.channels.cache.values()) {
    liveIds.add(channel.id);
    const isCategory = channel.type === ChannelType.GuildCategory;
    await upsertChannel(
      channel.id,
      channel.name,
      isCategory ? 'category' : String(channel.type),
      isCategory ? null : channel.parentId
    );
  }

  // Reconciliation for the offline gap: anything on record as not
  // yet deleted, but absent from the guild's current channel list,
  // must have been deleted while this bot was not running to catch
  // the live channelDelete event.
  const knownActive = await dbAll('SELECT discordId FROM channels WHERE deletedAt IS NULL');
  const missing = knownActive.filter(row => !liveIds.has(row.discordId));

  if (missing.length) {
    const now = Date.now();
    for (const row of missing) {
      await dbRun('UPDATE channels SET deletedAt = ? WHERE discordId = ?', [now, row.discordId]);
    }
    console.log(`Reconciliation: marked ${missing.length} channel(s) as deleted (offline gap).`);
  }
}

function start() {
  const client = new Client({
    // Guilds + GuildMessages is enough to receive the messageCreate
    // event itself. The privileged MessageContent intent is
    // deliberately NOT requested, because content is never read.
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  client.on('messageCreate', async (message) => {
    if (message.guildId !== discordConfig.guildId) return;

    try {
        await recordMessage(
            message.author.id,
            message.author.username,
            message.author.bot,
            message.channelId,
            message.createdTimestamp,
            message.id
        );
    } catch (err) {
      console.error('Failed to record message:', err);
    }
  });

  client.once('clientReady', () => {
    console.log(`Discord listener connected as ${client.user.tag}`);
    syncGuildChannels(client).catch(err => console.error('Channel sync failed:', err));
  });

  client.on('channelCreate', (channel) => {
    const isCategory = channel.type === ChannelType.GuildCategory;
    upsertChannel(
      channel.id,
      channel.name,
      isCategory ? 'category' : String(channel.type),
      isCategory ? null : channel.parentId
    ).catch(err => console.error('Failed to record new channel:', err));
  });

  client.on('channelDelete', (channel) => {
    dbRun('UPDATE channels SET deletedAt = ? WHERE discordId = ?', [Date.now(), channel.id])
      .catch(err => console.error('Failed to record channel deletion:', err));
  });

  client.on('error', (err) => {
    console.error('Discord listener error:', err);
  });

  client.login(discordConfig.botToken);

  return client;
}

module.exports = { start };