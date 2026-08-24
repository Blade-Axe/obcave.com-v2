// routes/pages.routes.js
const express = require('express');
const router = express.Router();
const siteConfig = require('../config/site.config');
const { pages } = siteConfig;

Object.values(pages).forEach(page => {
  if (page.dynamic) return;
  router.get(page.path, (req, res) => res.render(page.view, { title: page.title }));
});

module.exports = router;