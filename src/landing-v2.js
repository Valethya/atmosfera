import './landing-v2.css';

const root = document.documentElement;
const body = document.body;
const field = document.querySelector('.color-field');
const menuToggle = document.querySelector('.menu-toggle');
const menuOverlay = document.querySelector('.menu-overlay');
const menuLinks = document.querySelectorAll('.menu-link');

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOutCubic = t => t < 0.5
  ? 4 * t * t * t
  : 1 - Math.pow(-2 * t + 2, 3) / 2;

const desktopStates = [
  { id: 'home', x: 72, y: 61, scaleX: 1.05, scaleY: 1.05, blur: 11, rotate: 0 },
  { id: 'construir', x: 58, y: 48, scaleX: 1.48, scaleY: 1.34, blur: 34, rotate: -4 },
  { id: 'proceso', x: 30, y: 50, scaleX: 1.76, scaleY: 1.18, blur: 44, rotate: -14 },
  { id: 'experiencia', x: 70, y: 55, scaleX: 1.16, scaleY: 1.58, blur: 28, rotate: 9 },
];

const mobileStates = [
  { id: 'home', x: 79, y: 62, scaleX: 1.0, scaleY: 1.0, blur: 10, rotate: 0 },
  { id: 'construir', x: 57, y: 47, scaleX: 1.38, scaleY: 1.24, blur: 30, rotate: -4 },
  { id: 'proceso', x: 31, y: 52, scaleX: 1.66, scaleY: 1.08, blur: 40, rotate: -12 },
  { id: 'experiencia', x: 72, y: 56, scaleX: 1.08, scaleY: 1.46, blur: 25, rotate: 8 },
];

function getFieldFrames() {
  const states = window.innerWidth < 760 ? mobileStates : desktopStates;
  return states
    .map(state => {
      const section = document.getElementById(state.id);
      return section ? { ...state, top: section.offsetTop } : null;
    })
    .filter(Boolean);
}

function interpolateState(from, to, progress) {
  const eased = easeInOutCubic(clamp(progress));
  return {
    x: lerp(from.x, to.x, eased),
    y: lerp(from.y, to.y, eased),
    scaleX: lerp(from.scaleX, to.scaleX, eased),
    scaleY: lerp(from.scaleY, to.scaleY, eased),
    blur: lerp(from.blur, to.blur, eased),
    rotate: lerp(from.rotate, to.rotate, eased),
  };
}

function updateColorField() {
  if (!field) return;

  const frames = getFieldFrames();
  if (!frames.length) return;

  const scroll = window.scrollY;
  let state = frames[0];

  if (scroll <= frames[0].top) {
    state = frames[0];
  } else if (scroll >= frames[frames.length - 1].top) {
    state = frames[frames.length - 1];
  } else {
    for (let i = 0; i < frames.length - 1; i += 1) {
      const from = frames[i];
      const to = frames[i + 1];
      if (scroll >= from.top && scroll < to.top) {
        const distance = Math.max(1, to.top - from.top);
        state = interpolateState(from, to, (scroll - from.top) / distance);
        break;
      }
    }
  }

  root.style.setProperty('--field-x', `${state.x.toFixed(2)}vw`);
  root.style.setProperty('--field-y', `${state.y.toFixed(2)}vh`);
  root.style.setProperty('--field-scale-x', state.scaleX.toFixed(3));
  root.style.setProperty('--field-scale-y', state.scaleY.toFixed(3));
  root.style.setProperty('--field-blur', `${state.blur.toFixed(1)}px`);
  root.style.setProperty('--field-rotate', `${state.rotate.toFixed(2)}deg`);
}

let ticking = false;
function requestFieldUpdate() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    updateColorField();
    ticking = false;
  });
}

function setMenu(open) {
  body.classList.toggle('menu-open', open);
  menuToggle?.setAttribute('aria-expanded', String(open));
  menuOverlay?.setAttribute('aria-hidden', String(!open));
}

menuToggle?.addEventListener('click', () => {
  setMenu(!body.classList.contains('menu-open'));
});

menuLinks.forEach(link => {
  link.addEventListener('click', () => setMenu(false));
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && body.classList.contains('menu-open')) {
    setMenu(false);
  }
});

const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, {
    threshold: 0.18,
    rootMargin: '0px 0px -8% 0px',
  });

  reveals.forEach(element => revealObserver.observe(element));
} else {
  reveals.forEach(element => element.classList.add('is-visible'));
}

window.addEventListener('scroll', requestFieldUpdate, { passive: true });
window.addEventListener('resize', requestFieldUpdate);
window.addEventListener('load', requestFieldUpdate);

updateColorField();
requestAnimationFrame(() => {
  body.classList.add('loaded');

  const visibleNow = [...reveals].filter(element => {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.86 && rect.bottom > 0;
  });
  visibleNow.forEach(element => element.classList.add('is-visible'));
});
