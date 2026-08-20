// utils/generateUuid.js
const crypto = require('crypto');

/**
 * Builds an account identifier from three inputs: the date the user
 * joined the Discord server, the current timestamp, and the hex
 * encoding of their username.
 *
 * The output is formatted like a UUID (8-4-4-4-12), but it is a
 * SHA-256 derivation, not a random UUIDv4. Collision risk is near
 * zero in practice, given millisecond timestamps, but this is not a
 * standards-compliant UUID. Use crypto.randomUUID() instead if a
 * spec-compliant identifier is required.
 */
function generateAccountUuid(guildJoinedAt, username) {
  const joinedMs = new Date(guildJoinedAt).getTime();
  const nowMs = Date.now();
  const usernameHex = Buffer.from(username, 'utf8').toString('hex');

  const raw = `${joinedMs}:${nowMs}:${usernameHex}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join('-');
}

module.exports = { generateAccountUuid };
