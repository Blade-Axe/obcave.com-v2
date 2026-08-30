// utils/snowflake.js
//
// Discord IDs are snowflakes: a 64-bit integer where the top bits
// encode the millisecond timestamp of creation, relative to the
// Discord epoch. This lets creation time be derived from an ID
// alone — no API call or stored field from Discord is needed.

const DISCORD_EPOCH = 1420070400000n; // 2015-01-01T00:00:00.000Z

function snowflakeToTimestamp(id) {
  const bits = BigInt(id) >> 22n;
  return Number(bits + DISCORD_EPOCH);
}

module.exports = { snowflakeToTimestamp };