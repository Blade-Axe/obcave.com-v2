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

  (function () {
    const btn = document.getElementById('account-btn');
    const panel = document.getElementById('account-menu-container');
    if (!btn || !panel) return;

    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isOpen = panel.classList.toggle('active');
        btn.setAttribute('aria-expanded', isOpen);
    });

    document.addEventListener('click', function (e) {
        if (!panel.contains(e.target) && e.target !== btn) {
            panel.classList.remove('active');
            btn.setAttribute('aria-expanded', 'false');
        }
    });
})();

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

const greetingElement = document.getElementById('greeting');
const currentTime = new Date().getHours();
const tagElement = document.getElementById('tag');
let greeting;

if (currentTime < 12) {
  greeting = 'Good Morning,';
} else if (currentTime < 18){
  greeting = 'Good Afternoon,';
} else {
  greeting = 'Good Evening,';
}

greetingElement.textContent = `${greeting}`;

document.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
          if (entry.isIntersecting) {
              const icon = entry.target;
              if (icon.dataset.src) {
                  icon.innerHTML = icon.dataset.src;
                  delete icon.dataset.src;
              }
              observer.unobserve(icon);
          }
      });
  });

  // Observe icons that are below the fold
  document.querySelectorAll('.icon:not(:nth-child(-n+5))').forEach(icon => {
      observer.observe(icon);
  });
});