/* Progressive enhancements for the storefront; no animation dependency. */
(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const animate = (element, frames, options) => {
    if (element && !reducedMotion.matches) element.animate(frames, options);
  };
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    animate(entry.target, [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 650, easing: 'cubic-bezier(.2,.7,.2,1)' });
    observer.unobserve(entry.target);
  }), { threshold: 0.08 });
  const observed = new WeakSet();
  function revealContent() {
    document.querySelectorAll('.section-header, .category-card, .product-card, .collection-preview, .promo-banner, .about-image, .value-card, .cta-banner').forEach(element => {
      if (!observed.has(element)) { observed.add(element); observer.observe(element); }
    });
  }
  revealContent();
  new MutationObserver(revealContent).observe(document.body, { childList: true, subtree: true });
  document.querySelectorAll('.editorial-copy > *').forEach((element, index) => {
    animate(element, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 700, delay: index * 75, fill: 'backwards', easing: 'ease-out' });
  });

  const topButton = document.createElement('button');
  topButton.className = 'back-to-top';
  topButton.type = 'button';
  topButton.innerHTML = '&#8593;';
  topButton.setAttribute('aria-label', 'Back to top');
  topButton.hidden = true;
  document.body.append(topButton);
  topButton.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    document.querySelector('.logo')?.focus({ preventScroll: true });
  });
  let scheduled = false;
  function updateScroll() {
    topButton.hidden = scrollY < 500;
    document.querySelector('.header')?.classList.toggle('is-scrolled', scrollY > 25);
    scheduled = false;
  }
  addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateScroll); } }, { passive: true });
  updateScroll();

  // Native modal provides focus containment and Escape-to-close.
  const dialog = document.createElement('dialog');
  dialog.className = 'fabric-viewer';
  dialog.setAttribute('aria-label', 'Saree detail photograph');
  dialog.innerHTML = '<button type="button" class="viewer-close" aria-label="Close photograph">&#215;</button><img alt=""><p></p>';
  document.body.append(dialog);
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => document.body.classList.remove('viewer-open'));
  document.querySelectorAll('.editorial-photo, .editorial-side, .about-image, .promo-visual').forEach(container => {
    const image = container.querySelector('img');
    if (!image) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fabric-zoom';
    button.textContent = 'View details +';
    button.setAttribute('aria-label', 'View photograph: ' + image.alt);
    container.append(button);
    button.addEventListener('click', () => {
      dialog.querySelector('img').src = image.currentSrc || image.src;
      dialog.querySelector('img').alt = image.alt;
      dialog.querySelector('p').textContent = image.alt;
      dialog.showModal();
      document.body.classList.add('viewer-open');
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.querySelector('#navLinks.open')) {
      toggleMobileMenu();
      document.querySelector('.mobile-toggle')?.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.navbar') && document.querySelector('#navLinks.open')) toggleMobileMenu();
    const button = event.target.closest('.btn, .wishlist-btn');
    if (button) animate(button, [{ transform: 'scale(1)' }, { transform: 'scale(.95)' }, { transform: 'scale(1)' }], { duration: 240 });
  });
  const toast = document.querySelector('.toast') || document.createElement('div');
  toast.classList.add('toast');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  if (!toast.isConnected) document.body.append(toast);
})();
