const path = require("node:path");
const { title } = require("node:process");


/**
 * site.config.js
 * ─────────────────────────────────────────────────────────────────
 * Single source of truth for every piece of text, label, link and
 * static data on the site.  No copy lives inside EJS templates.
 *
 * To edit content: change values here — templates update automatically.
 * To add a nav link / feature / seller card: push a new object to the
 * relevant array and the template renders it without any code changes.
 *
 * Dynamic data (e.g. sellers from a DB) should be merged into
 * `res.locals` in the relevant route/controller, then the template
 * will prefer that over the static fallback below.
 * ─────────────────────────────────────────────────────────────────
 */
const routes = {
  home: "/",
  about: "/about",
  obstitution: "/obstitution",
  members: "/members",
  achievements: "/achievements",
  auth_sign_in: "/auth/sign-in",
  auth_sign_up: "/auth/sign-up",
  auth_sign_out: "/auth/sign-out",
  test: "/test"
}

const pages = {
  home:  { path: routes.home,  title: 'obcave - home', view: 'index' },
  achievements: { path: routes.achievements, title: 'obcave - achievements', view: 'achievements', showInNav: true, navLabel: 'achievements' },
  members: { path: routes.members, title: 'obcave - members', view: 'members', showInNav: true, navLabel: 'members' },
  about: { path: routes.about, title: 'obcave - about', view: 'about', showInNav: true, navLabel: 'about' },
  obstitution: { path: routes.obstitution, title: 'obcave - obstitution', view: 'obstitution', showInNav: true, navLabel: 'obstitution' },
  auth_sign_in: { path: routes.auth_sign_in, title: 'obID - sign-in', view: 'sign-in' },
  auth_sign_up: { path: routes.auth_sign_up, title: 'obID - sign-up', view: 'sign-up' },
  test: { path: routes.test, title: 'test', view: 'test' },
};

module.exports = {
  nopage: {
    title: '404 - Page not found',
    titleLines: ['404', 'Page not found...'],
    cta: [
      { label: 'Return home',   href: routes.home },
    ],
  },

  /* ── Footer ─────────────────────────────────────────────────── */
  footer: {
    text: '© obcave. All rights reserved.',
  },
  nav: {
    routes,
    brand: {
        label: "obcave",
        path: routes.home,
        logoSrc: "./assets/images/logo.png"
    },
    items: Object.entries(pages).filter(([, page]) => page.showInNav).map(([key, page]) => ({
      id: `${key}-link`,
      label: page.navLabel,
      path: page.path,
    })),
  },
  pages,
};
