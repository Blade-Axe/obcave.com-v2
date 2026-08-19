(function () {
  const hamburger = document.getElementById('hamburger');
  const navMenu   = document.getElementById('nav-menu-container');
  if (!hamburger || !navMenu) return;

  /* Toggle menu open/closed */
  hamburger.addEventListener('click', function (e) {
    e.stopPropagation();
    const isOpen = navMenu.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', String(isOpen));
    hamburger.querySelector('i').classList.toggle('hn-bars', !isOpen);
    hamburger.querySelector('i').classList.toggle('hn-times', isOpen)
  });

  /* Close when clicking outside */
  document.addEventListener('click', function (e) {
    if (!navMenu.contains(e.target) && !hamburger.contains(e.target)) {
      navMenu.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.querySelector('i').classList.remove('hn-times');
      hamburger.querySelector('i').classList.add('hn-bars');
    }
  });

  /* Suppress animations during resize */
  let resizeTimer;
  window.addEventListener('resize', function () {
    document.body.classList.add('no-anim');

    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      document.body.classList.remove('no-anim');
    }, 250);

    /* Reset menu when leaving mobile breakpoint */
    if (window.innerWidth > 1130) {
      navMenu.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
})();