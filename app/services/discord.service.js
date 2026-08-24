// services/discord.service.js
const discordConfig = require('../config/discord.config');

const API = discordConfig.apiBase;

function getAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: discordConfig.clientId,
    redirect_uri: discordConfig.redirectUri,
    response_type: 'code',
    scope: 'identify',
    state,
  });
  return `${API}/oauth2/authorize?${params.toString()}`;
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: discordConfig.clientId,
    client_secret: discordConfig.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: discordConfig.redirectUri,
  });

  const res = await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) throw new Error(`Discord token exchange failed: ${res.status}`);
  return res.json(); // { access_token, token_type, expires_in, refresh_token, scope }
}

async function getDiscordUser(accessToken) {
  const res = await fetch(`${API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Discord user fetch failed: ${res.status}`);
  return res.json(); // { id, username, avatar, ... }
}

/**
 * Checks membership of the configured guild using the bot token.
 * Returns the guild member object (includes joined_at) if the user
 * is a member, or null if they are not (Discord returns 404).
 *
 * Called at sign-up and at every sign-in, regardless of method.
 */
async function getGuildMember(discordUserId) {
  const res = await fetch(
    `${API}/guilds/${discordConfig.guildId}/members/${discordUserId}`,
    { headers: { Authorization: `Bot ${discordConfig.botToken}` } }
  );

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Discord guild member check failed: ${res.status}`);
  return res.json(); // { user, nick, joined_at, roles, ... }
}

async function getDiscordUserById(discordUserId) {
  const res = await fetch(`${API}/users/${discordUserId}`, {
    headers: { Authorization: `Bot ${discordConfig.botToken}` },
  });
  if (!res.ok) throw new Error(`Discord user lookup failed: ${res.status}`);
  return res.json();
}

function getAvatarUrl(discordId, avatarHash) {
  if (!avatarHash) {
    return 'https://cdn.discordapp.com/embed/avatars/0.png';
  }
  const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${ext}`;
}

module.exports = {
  getAuthorizeUrl,
  exchangeCode,
  getDiscordUser,
  getGuildMember,
  getDiscordUserById,
  getAvatarUrl,
};
