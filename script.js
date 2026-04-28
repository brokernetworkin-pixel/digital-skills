/* ============================================================
   Digital Skills — interactions
   - Sticky navbar shadow on scroll
   - Mobile hamburger menu
   - Accordion (curriculum + FAQ)
   - Reveal on scroll (Intersection Observer)
   - Smooth anchor scroll with offset
   - Demo form validation + success state
   - Footer year
   ============================================================ */

(() => {
  'use strict';

  /* ---------- Navbar scroll shadow ---------- */
  const navbar = document.getElementById('navbar');
  const onScroll = () => {
    if (window.scrollY > 20) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Hamburger / mobile menu ---------- */
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('navMenu');

  const closeMenu = () => {
    hamburger.classList.remove('open');
    navMenu.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  };

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('open');
    navMenu.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  // Close mobile menu when a link is tapped
  navMenu.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', closeMenu)
  );

  // Close when resizing up to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) closeMenu();
  });

  /* ---------- Accordion (curriculum + FAQ) ---------- */
  document.querySelectorAll('.accordion').forEach(group => {
    const items = group.querySelectorAll('.accordion-item');
    items.forEach(item => {
      const trigger = item.querySelector('.accordion-trigger');
      const panel = item.querySelector('.accordion-panel');

      trigger.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');

        // Optional single-open behaviour per group
        items.forEach(sib => {
          sib.classList.remove('open');
          const p = sib.querySelector('.accordion-panel');
          const t = sib.querySelector('.accordion-trigger');
          if (p) p.style.maxHeight = null;
          if (t) t.setAttribute('aria-expanded', 'false');
        });

        if (!isOpen) {
          item.classList.add('open');
          panel.style.maxHeight = panel.scrollHeight + 'px';
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    });
  });

  // Recalculate panel height on resize (prevents clipping on orientation change)
  window.addEventListener('resize', () => {
    document.querySelectorAll('.accordion-item.open').forEach(item => {
      const panel = item.querySelector('.accordion-panel');
      if (panel) panel.style.maxHeight = panel.scrollHeight + 'px';
    });
  });

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Light stagger when siblings reveal together
          const delay = Math.min(i * 60, 240);
          setTimeout(() => entry.target.classList.add('visible'), delay);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('visible'));
  }

  /* ---------- Demo form → WhatsApp handoff ---------- */
  const form = document.getElementById('demoForm');
  const success = document.getElementById('formSuccess');
  const WHATSAPP_NUMBER = '919182227241';

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const fields = form.querySelectorAll('input[required], select[required]');
      let valid = true;
      fields.forEach(f => {
        if (!f.value.trim() || (f.checkValidity && !f.checkValidity())) {
          valid = false;
          f.style.borderColor = '#e89a9a';
          f.addEventListener('input', () => { f.style.borderColor = ''; }, { once: true });
        }
      });

      if (!valid) {
        const firstInvalid = form.querySelector(':invalid') || fields[0];
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const name = form.fullName.value.trim();
      const phone = form.phone.value.trim();
      const email = form.email.value.trim();
      const course = form.course.value.trim();
      const source = form.source.value.trim();

      const message =
        `Hi, I would like to book a free demo class. ` +
        `Name: ${name}, Phone: ${phone}, Email: ${email}, ` +
        `Interest: ${course}, Heard via: ${source}`;

      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

      const btn = form.querySelector('button[type="submit"]');
      const originalHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Opening WhatsApp...';

      // Show success message briefly, then redirect to WhatsApp in new tab
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });

      setTimeout(() => {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        form.reset();
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        setTimeout(() => { success.hidden = true; }, 5000);
      }, 900);
    });
  }
})();
