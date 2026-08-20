// routes/auth.routes.js
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const router = express.Router();

const db = require('../db/db.config');
const { requireAuth } = require('../middleware/auth.middleware');
const siteConfig = require('../config/site.config');
const discordService = require('../services/discord.service');
const { generateAccountUuid } = require('../utils/generateUuid');

const { routes } = siteConfig.nav;

// --- small promise wrappers around sqlite3's callback API ---
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

// ── Step 1: kick off Discord OAuth ─────────────────────────────
router.get('/auth/discord', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.discordOAuthState = state;
  res.redirect(discordService.getAuthorizeUrl(state));
});

// ── Step 2: Discord redirects back here ────────────────────────
router.get('/auth/discord/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!state || state !== req.session.discordOAuthState) {
    return res.status(400).render('sign-up', {
      title: siteConfig.pages.auth_sign_up.title,
      error: siteConfig.auth.error.expired_session,
    });
  }
  delete req.session.discordOAuthState;

  if (!code) {
    return res.redirect(routes.auth_sign_up);
  }

  try {
    const tokenData = await discordService.exchangeCode(code);
    const discordUser = await discordService.getDiscordUser(tokenData.access_token);

    // Guild membership check — required before any account is
    // touched or created. No DB write happens if this fails.
    const member = await discordService.getGuildMember(discordUser.id);
    if (!member) {
      return res.status(403).render('sign-up', {
        title: siteConfig.pages.auth_sign_up.title,
        error: siteConfig.auth.error.discord_must_be_member,
      });
    }

    const existing = await dbGet('SELECT * FROM users WHERE discordId = ?', [discordUser.id]);

    if (existing) {
      // Returning account — re-verified above, so proceed.
      if (!existing.emailSet) {
        req.session.pendingUserId = existing.id;
        return res.redirect(routes.auth_complete_profile);
      }
      req.session.user = {
        id: existing.id,
        uuid: existing.uuid,
        discordUsername: existing.discordUsername,
        discordAvatar: existing.discordAvatar,
        email: existing.email,
        isAdmin: !!existing.isAdmin,
      };
      return res.redirect(routes.account);
    }

    // New account — create the identifier and a bare user row.
    const accountUuid = generateAccountUuid(member.joined_at, discordUser.username);
    const avatarUrl = discordService.getAvatarUrl(discordUser.id, discordUser.avatar);

    const result = await dbRun(
      `INSERT INTO users (uuid, discordId, discordUsername, discordAvatar, emailSet)
       VALUES (?, ?, ?, ?, 0)`,
      [accountUuid, discordUser.id, discordUser.username, avatarUrl]
    );

    req.session.pendingUserId = result.lastID;
    return res.redirect(routes.auth_complete_profile);
  } catch (err) {
    console.error('Discord OAuth error:', err);
    return res.status(500).render('sign-up', {
      title: siteConfig.pages.auth_sign_up.title,
      error: siteConfig.auth.error.discord_oauth,
    });
  }
});

// ── Step 3: mandatory email + password screen ──────────────────
router.get('/auth/complete-profile', (req, res) => {
  if (!req.session.pendingUserId) return res.redirect(routes.auth_sign_up);
  res.render('complete-profile', { title: 'obID - complete your profile', error: null });
});

router.post('/auth/complete-profile', async (req, res) => {
  if (!req.session.pendingUserId) return res.redirect(routes.auth_sign_up);

  const { email, password } = req.body;
  const emailPattern = /^[a-zA-Z0-9._%+-]+@obcave\.com$/i;

  if (!emailPattern.test(email || '')) {
    return res.status(400).render('complete-profile', {
      title: 'obID - complete your profile',
      error: siteConfig.auth.error.obid_email_invalid,
    });
  }
  if (!password || password.length < 16) {
    return res.status(400).render('complete-profile', {
      title: 'obID - complete your profile',
      error: siteConfig.auth.error.obid_pass_too_short,
    });
  }

  const taken = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
  if (taken) {
    return res.status(400).render('complete-profile', {
      title: 'obID - complete your profile',
      error: siteConfig.auth.error.obid_email_taken,
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await dbRun(
    'UPDATE users SET email = ?, password = ?, emailSet = 1 WHERE id = ?',
    [email, passwordHash, req.session.pendingUserId]
  );

  const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.session.pendingUserId]);
  delete req.session.pendingUserId;

  req.session.user = {
    id: user.id,
    uuid: user.uuid,
    discordUsername: user.discordUsername,
    discordAvatar: user.discordAvatar,
    email: user.email,
    isAdmin: !!user.isAdmin,
  };
  res.redirect(routes.account);
});

// ── Sign-in with email + password ───────────────────────────────
router.post('/auth/sign-in', async (req, res) => {
  const { email, password } = req.body;
  const genericError = siteConfig.auth.error.wrong_pass_email;

  try {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !user.password) {
      return res.status(401).render('sign-in', {
        title: siteConfig.pages.auth_sign_in.title,
        error: genericError,
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).render('sign-in', {
        title: siteConfig.pages.auth_sign_in.title,
        error: genericError,
      });
    }

    // Every sign-in, regardless of method, re-checks guild membership.
    const member = await discordService.getGuildMember(user.discordId);
    if (!member) {
      return res.status(403).render('sign-in', {
        title: siteConfig.pages.auth_sign_in.title,
        error: siteConfig.auth.error.discord_no_longer_in_server,
      });
    }

    req.session.user = {
      id: user.id,
      uuid: user.uuid,
      discordUsername: user.discordUsername,
      discordAvatar: user.discordAvatar,
      email: user.email,
      isAdmin: !!user.isAdmin,
    };
    res.redirect(routes.account);
  } catch (err) {
    console.error('Sign-in error:', err);
    res.status(500).render('sign-in', {
      title: siteConfig.pages.auth_sign_in.title,
      error: siteConfig.auth.error.generic,
    });
  }
});

router.get('/account', requireAuth, (req, res) => {
  res.render('account', { title: 'obcave - account', user: req.session.user });
});

// ── Sign-out ─────────────────────────────────────────────────────
router.post('/auth/sign-out', (req, res) => {
  req.session.destroy(() => res.redirect(routes.home));
});

module.exports = router;
