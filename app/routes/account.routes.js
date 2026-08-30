// routes/account.routes.js
//
// Lets a signed-in member link an extra Discord account (an alt) to
// their own obID. Reuses the existing Discord OAuth flow. The OAuth
// callback in auth.routes.js checks for `linkAltUserId` in the
// session and branches there instead of running sign-up logic.

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { requireAuth } = require('../middleware/auth.middleware');
const discordService = require('../services/discord.service');

router.get('/account/link-discord', requireAuth, (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.discordOAuthState = state;
  req.session.linkAltUserId = req.session.user.id;
  res.redirect(discordService.getAuthorizeUrl(state));
});

module.exports = router;