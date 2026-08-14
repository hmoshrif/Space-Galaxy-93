/* =========================================================
   Site interactions: nav, scroll reveal, progress,
   active section, back-to-top, mobile menu
   ========================================================= */
(function(){
  "use strict";

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // current year in footer
  const y = document.getElementById('year');
  if(y) y.textContent = new Date().getFullYear();

  const nav      = document.getElementById('nav');
  const progress = document.getElementById('scrollProgress');
  const toTop    = document.getElementById('toTop');

  // ---- scroll-driven UI (nav shadow, progress bar, back-to-top) ----
  let ticking = false;
  function onScroll(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(()=>{
      const sc = window.scrollY || document.documentElement.scrollTop;
      if(nav) nav.classList.toggle('scrolled', sc > 8);
      if(progress){
        const h = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = `scaleX(${h > 0 ? Math.min(sc / h, 1) : 0})`;
      }
      if(toTop) toTop.classList.toggle('show', sc > 600);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  if(toTop){
    toTop.addEventListener('click', ()=>{
      window.scrollTo({top:0, behavior: reduce ? 'auto' : 'smooth'});
    });
  }

  // ---- mobile menu toggle ----
  const toggle = document.getElementById('navToggle');
  const links  = document.getElementById('navLinks');
  if(toggle && links){
    toggle.addEventListener('click', ()=>{
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });
    links.querySelectorAll('a').forEach(a=>a.addEventListener('click', ()=> links.classList.remove('open')));
  }

  // ---- reveal on scroll ----
  const items = document.querySelectorAll('.reveal');
  if(reduce || !('IntersectionObserver' in window)){
    items.forEach(el=>el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, {threshold:0.12, rootMargin:'0px 0px -40px 0px'});
    items.forEach(el=>io.observe(el));
  }

  // ---- active section highlight in nav ----
  const navItems = links ? [...links.querySelectorAll('a:not(.nav-cta)')] : [];
  const sections = navItems
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if(sections.length && 'IntersectionObserver' in window){
    const spy = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          const id = '#' + e.target.id;
          navItems.forEach(a => a.classList.toggle('active', a.getAttribute('href') === id));
        }
      });
    }, {rootMargin:'-45% 0px -50% 0px', threshold:0});
    sections.forEach(s=>spy.observe(s));
  }
})();
