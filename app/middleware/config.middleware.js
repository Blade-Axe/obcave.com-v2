/**
 * middleware/config.middleware.js
 * ──────────────────────────────────────────────────────────────
 * Attaches the site config and current URL path to res.locals so
 * every EJS template (including partials) can access them without
 * any per-route boilerplate.
 *
 * Usage — add ONE line to your app.js / server.js:
 *
 *   const configMiddleware = require('./middleware/config.middleware');
 *   app.use(configMiddleware);
 *
 * Inside any .ejs template you then have:
 *   <%= config.site.name %>
 *   <%= currentPath %>         ← used by nav to highlight active link
 * ──────────────────────────────────────────────────────────────
 */

const siteConfig = require('../config/site.config');
const themeService = require('../services/theme.service');

module.exports = async function configMiddleware(req, res, next) {
  res.locals.config = require('../config/site.config');
  res.locals.siteConfig = siteConfig;
  res.locals.currentPath = req.path;
  res.locals.user = req.session.user || null;

  try {
    res.locals.publishedThemes = await themeService.listPublishedThemes();

    let themeId = req.session.themeId;
    if (!themeId && req.session.user) {
      themeId = await themeService.getUserThemeId(req.session.user.id);
    }
    res.locals.activeTheme = themeId
      ? res.locals.publishedThemes.find(t => t.id === themeId) || null
      : null;
  } catch (err) {
    console.error('Theme lookup failed:', err);
    res.locals.publishedThemes = [];
    res.locals.activeTheme = null;
  }

  next();
};
