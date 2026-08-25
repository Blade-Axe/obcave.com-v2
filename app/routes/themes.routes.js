// routes/themes.routes.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const themeService = require('../services/theme.service');
const siteConfig = require('../config/site.config');

router.get('/dashboard/themes', requireAuth, async (req, res) => {
    const themes = await themeService.listPublishedThemes();

    let editingTheme = null; // raw — only set if the user owns this theme
    if (req.query.edit) {
        const raw = await themeService.getRawThemeById(req.query.edit);
        if (raw && raw.creatorId === req.session.user.id && !raw.isBuiltIn) {
            editingTheme = raw;
        }
    }

    // Colour pickers should always reflect a real theme: the one being
    // edited, or whatever theme is currently active, so they're never
    // blank just because the user hasn't started a fresh theme yet.
    const prefillTheme = editingTheme
        ? await themeService.getThemeById(editingTheme.id)
        : res.locals.activeTheme;

    res.render('dashboard-themes', {
        title: 'obcave - themes', user: req.session.user, themes,
        editingTheme, prefillTheme, error: null,
    });
});

router.post('/dashboard/themes', requireAuth, async (req, res) => {
    const { name, publish, themeId } = req.body;

    const colours = {};
    for (const key of themeService.THEME_VARIABLES) {
        if (req.body[key]) colours[key] = req.body[key];
    }
    (req.body.advanced || '').split('\n').forEach(line => {
        const [key, ...rest] = line.split(':');
        if (key && rest.length) colours[key.trim()] = rest.join(':').trim();
    });

    if (!name || !name.trim()) {
        const themes = await themeService.listPublishedThemes();
        return res.status(400).render('dashboard-themes', {
            title: 'obcave - themes', user: req.session.user, themes,
            editingTheme: themeId ? { id: themeId, name, colours, isPublished: !!publish } : null,
            prefillTheme: { colours },
            error: 'Give your theme a name.',
        });
    }

    let theme;
    if (themeId) {
        const owned = await themeService.getRawThemeById(themeId);
        if (!owned || owned.creatorId !== req.session.user.id || owned.isBuiltIn) {
            return res.status(403).end();
        }
        theme = await themeService.updateTheme({ id: themeId, name, colours, publish: !!publish });
    } else {
        theme = await themeService.createTheme({ name, creatorId: req.session.user.id, colours, publish: !!publish });
    }

    await themeService.setUserTheme(req.session.user.id, theme.id);
    req.session.themeId = theme.id;
    res.redirect(siteConfig.nav.routes.dashboard_themes);
});

// Open to guests as well — picking a theme doesn't need an account,
// only creating and publishing one does.
router.post('/themes/:id/select', async (req, res) => {
    const theme = await themeService.getThemeById(req.params.id);
    if (!theme || !theme.isPublished) return res.status(404).end();

    req.session.themeId = theme.id;
    if (req.session.user) await themeService.setUserTheme(req.session.user.id, theme.id);

    if (req.get('X-Requested-With') === 'fetch') return res.status(204).end();
    res.redirect(req.get('Referer') || '/');
});

module.exports = router;