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
  auth_discord: "/auth/discord",
  auth_complete_profile: "/auth/complete-profile",
  account: "/account"
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
        logoSrc: "/assets/images/logo.png"
    },
    items: Object.entries(pages).filter(([, page]) => page.showInNav).map(([key, page]) => ({
      id: `${key}-link`,
      label: page.navLabel,
      path: page.path,
    })),
    text: {
      theme: "Theme",
      logged_out: "Sign In",
      logged_in: "Account",
    },
  },
  pages,
  auth: {
    signIn: {
      title: 'Sign in',
      subtitle: 'Welcome back to obcave.com',
      actionPath: routes.auth_sign_in,
      submitLabel: 'Sign in',
      fields: [
        { id: 'email', label: 'Email', type: 'email', required: true },
        { id: 'password', label: 'Password', type: 'password', required: true },
      ],
      oauth: { href: '/auth/discord', label: 'Continue with Discord' },
      altLink: { text: 'No account?', label: 'Sign up', path: routes.auth_sign_up },
    },
    signUp: {
      title: 'Sign up',
      subtitle: 'Create your obID.',
      oauth: { href:'/auth/discord', label: 'Continue with Discord' },
      altLink: { text: 'Have an account?', label: 'Sign in', path: routes.auth_sign_in },
    },
    completeProfile: {
      title: 'One last step',
      subtitle: 'Create your @obcave.com email and a password.',
      actionPath: routes.auth_complete_profile,
      submitLabel: 'Create your obID!',
      fields: [
        { id: 'email', label: 'obcave email', type: 'email', placeholder: 'yourname@obcave.com', required: true },
        { id: 'password', label: 'Password', type: 'password', required: true },
      ],
    },
    text: {
      divider: 'or',
    },
    error: {
      generic: 'Something went wrong. Please try again.',
      expired_session: 'Login request expired or invalid. Please try again.',
      wrong_pass_email: 'Incorrect email or password.',
      obid_email_invalid: 'Email must end in @obcave.com.',
      obid_email_taken: 'That email is already taken.',
      obid_pass_too_short: 'Password must be at least 16 characters.',
      discord_oauth: 'Something went wrong talking to Discord. Please try again.',
      discord_must_be_member: 'You must be an obmember to sign up.',
      discord_no_longer_in_server: 'Your linked Discord account is no longer in the server.',
    }
  },
}
