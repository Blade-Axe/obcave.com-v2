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

module.exports = function configMiddleware(req, res, next) {
  res.locals.siteConfig = siteConfig;
  res.locals.currentPath = req.path;
  res.locals.user = req.session.user || null;
  next();
};
