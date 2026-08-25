// services/theme.service.js
const db = require('../db/db.config');

// Every CSS custom property a theme is allowed to override. Keep this
// list in sync with the :root block in public/css/styles.css.
const THEME_VARIABLES = [
  'text-colour', 'text-colour-contrast', 'secondary', 'background-colour',
  'nav-background', 'nav-background-mobile', 'nav-pill-background', 'nav-pill-hover',
  'nav-pill-highlight', 'nav-accent', 'nav-border-shadow', 'nav-glass-edge',
  'nav-glass-inner-highlight', 'nav-glass-sheen-light', 'nav-glass-sheen-dark', 'nav-glass-base',
  'nav-brand-text', 'nav-brand-text-shadow', 'nav-link-text', 'nav-link-text-shadow',
  'nav-link-background', 'nav-button-surface-top', 'nav-button-surface-bottom',
  'nav-button-inset-highlight', 'nav-button-drop-shadow', 'nav-hover-glow',
  'nav-hover-glow-shadow', 'nav-hover-gradient-light', 'nav-hover-gradient-dark',
  'nav-hover-text', 'nav-hover-text-shadow', 'nav-active-red', 'nav-active-red-dark',
  'nav-active-text', 'nav-active-hover-glow', 'nav-active-hover-gradient-light',
  'nav-active-hover-gradient-dark', 'footer-background', 'gradient-background',
  'black-02-box-shadow',
];

// Matches the original :root values in styles.css, as literals —
// used to fill in any variable a theme doesn't override, so a
// theme's own preview never depends on the page's currently active
// CSS variables.
const DEFAULT_COLOURS = {
  'text-colour': '#000000',
  'text-colour-contrast': '#ffffff',
  'secondary': '#2a2a2a',
  'background-colour': '#1b1b1c',
  'nav-background': 'rgba(161, 6, 6, 0.7)',
  'nav-background-mobile': 'rgba(0, 0, 0, 0.1)',
  'nav-pill-background': 'rgba(0, 0, 0, 0.55)',
  'nav-pill-hover': 'rgba(0, 0, 0, 0.8)',
  'nav-pill-highlight': 'rgba(255, 255, 255, 0.2)',
  'nav-accent': '#ebdca4',
  'nav-border-shadow': 'rgba(0, 0, 0, 0.7)',
  'nav-glass-edge': 'rgba(255, 255, 255, 0.99)',
  'nav-glass-inner-highlight': 'rgba(255, 255, 255, 0.98)',
  'nav-glass-sheen-light': 'rgba(255, 255, 255, 0.4)',
  'nav-glass-sheen-dark': 'rgba(0, 0, 0, 0.1)',
  'nav-glass-base': 'hsla(0, 7%, 24%, 0.541)',
  'nav-brand-text': '#ffffff',
  'nav-brand-text-shadow': 'rgba(0, 0, 0, 0.8)',
  'nav-link-text': 'rgba(0, 0, 0, 0.8)',
  'nav-link-text-shadow': 'rgba(255, 255, 255, 0.8)',
  'nav-link-background': 'rgba(255, 255, 255, 0.548)',
  'nav-button-surface-top': 'rgba(255, 255, 255, 0.88)',
  'nav-button-surface-bottom': 'rgba(255, 255, 255, 0.62)',
  'nav-button-inset-highlight': 'rgba(255, 255, 255, 0.6)',
  'nav-button-drop-shadow': 'rgba(0, 0, 0, 0.15)',
  'nav-hover-glow': '#ff4d5e',
  'nav-hover-glow-shadow': 'rgba(247, 29, 73, 0.5)',
  'nav-hover-gradient-light': '#d9405f',
  'nav-hover-gradient-dark': '#6e0f28',
  'nav-hover-text': '#ffffff',
  'nav-hover-text-shadow': 'rgba(0, 0, 0, 0.4)',
  'nav-active-red': '#f71d49',
  'nav-active-red-dark': '#750e23',
  'nav-active-text': '#ffffff',
  'nav-active-hover-glow': '#ffffff',
  'nav-active-hover-gradient-light': '#888888',
  'nav-active-hover-gradient-dark': '#575757',
  'footer-background': '#2b2a2a',
  'gradient-background': 'linear-gradient(135deg, rgba(255, 255, 255, 0.356) 10%)',
  'black-02-box-shadow': 'rgba(0, 0, 0, 0.2)',
};

function withDefaults(colours) {
  return { ...DEFAULT_COLOURS, ...sanitiseColours(colours) };
}

// Allows hex, rgb(a), hsl(a), and linear-gradient(...) values. Blocks
// `;`, `{`, `}`, `<`, `@`, and quotes, so a theme value can never break
// out of the injected <style> block.
const SAFE_VALUE_PATTERN = /^[a-zA-Z0-9#(),.%\s-]+$/;

function isSafeValue(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 300 && SAFE_VALUE_PATTERN.test(value);
}

// Drops any key not on the whitelist and any value that fails the
// safety check. Run on both save and read, so an old bad row can't
// leak through either.
function sanitiseColours(colours) {
  const clean = {};
  if (!colours || typeof colours !== 'object') return clean;
  for (const key of THEME_VARIABLES) {
    const value = colours[key];
    if (isSafeValue(value)) clean[key] = value.trim();
  }
  return clean;
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));
}
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));
}
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function (err) { err ? reject(err) : resolve(this); }));
}

function parseThemeRow(row) {
  if (!row) return null;
  return { ...row, colours: withDefaults(JSON.parse(row.colours || '{}')) };
}

async function listPublishedThemes() {
  const rows = await dbAll(
    `SELECT themes.*, users.discordUsername AS creatorName
     FROM themes LEFT JOIN users ON users.id = themes.creatorId
     WHERE isPublished = 1 ORDER BY isBuiltIn DESC, createdAt ASC`
  );
  return rows.map(parseThemeRow);
}

async function getThemeById(id) {
  return parseThemeRow(await dbGet('SELECT * FROM themes WHERE id = ?', [id]));
}

async function getRawThemeById(id) {
  const row = await dbGet('SELECT * FROM themes WHERE id = ?', [id]);
  if (!row) return null;
  return { ...row, colours: sanitiseColours(JSON.parse(row.colours || '{}')) };
}

async function updateTheme({ id, name, colours, publish }) {
  const clean = sanitiseColours(colours);
  await dbRun(
    `UPDATE themes SET name = ?, colours = ?, isPublished = ? WHERE id = ?`,
    [name.slice(0, 40), JSON.stringify(clean), publish ? 1 : 0, id]
  );
  return getThemeById(id);
}

async function createTheme({ name, creatorId, colours, publish }) {
  const clean = sanitiseColours(colours);
  const result = await dbRun(
    `INSERT INTO themes (name, creatorId, colours, isPublished, isBuiltIn) VALUES (?, ?, ?, ?, 0)`,
    [name.slice(0, 40), creatorId, JSON.stringify(clean), publish ? 1 : 0]
  );
  return getThemeById(result.lastID);
}

async function setUserTheme(userId, themeId) {
  await dbRun(
    `INSERT INTO user_theme_selection (userId, themeId) VALUES (?, ?)
     ON CONFLICT(userId) DO UPDATE SET themeId = excluded.themeId`,
    [userId, themeId]
  );
}

async function getUserThemeId(userId) {
  const row = await dbGet('SELECT themeId FROM user_theme_selection WHERE userId = ?', [userId]);
  return row ? row.themeId : null;
}

module.exports = {
  THEME_VARIABLES, sanitiseColours,
  listPublishedThemes, getThemeById, createTheme,
  setUserTheme, getUserThemeId, getRawThemeById, updateTheme
};