(function() {
  const body = document.body;
  const toggle = document.getElementById('nav-toggle');
  const nav = document.querySelector('header nav');

  if (!toggle || !nav) return;

  const setOpen = (open) => {
    body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  toggle.addEventListener('click', () => {
    const isOpen = body.classList.contains('nav-open');
    setOpen(!isOpen);
  });

  const collapseOnWide = () => {
    if (window.innerWidth > 900 && body.classList.contains('nav-open')) {
      setOpen(false);
    }
  };

  window.addEventListener('resize', collapseOnWide);
  window.addEventListener('orientationchange', collapseOnWide);
})();
