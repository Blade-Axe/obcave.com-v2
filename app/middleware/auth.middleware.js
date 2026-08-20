// middleware/auth.middleware.js
const siteConfig = require('../config/site.config');
const routes = siteConfig.nav.routes;

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect(routes.auth_sign_in);
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.isAdmin) {
    return res.status(404).render('404', { title: 'BladeAxe - Page not found' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };