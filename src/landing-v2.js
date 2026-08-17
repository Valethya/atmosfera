import './landing-v2.css';

const root = document.documentElement;
const body = document.body;
const field = document.querySelector('.color-field');
const menuToggle = document.querySelector('.menu-toggle');
const menuLinks = document.querySelectorAll('.menu-link');

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;

function updateColorField() {
  if (!field) return;

  const viewport = window.innerHeight || 1;
  const progress = clamp(window.scrollY / viewport);

  const mobile = window.innerWidth < 760;

  const start = mobile
    ? { x: 79, y: 62, scale: 1.0, blur: 10 }
    : { x: 72, y: 61, scale: 1.05, blur: 11 };

  const end = mobile
    ? { x: 57, y: 47, scale: 1.34, blur: 30 }
    : { x: 58, y: 48, scale: 1.45, blur: 34 };

  // Ease the transition so the field starts almost still and opens up later.
  const eased = 1 - Math.pow(1 - progress, 3);

  root.style.setProperty('--field-x', `${lerp(start.x, end.x, eased)}vw`);
  root.style.setProperty('--field-y', `${lerp(start.y, end.y, eased)}vh`);
  root.style.setProperty('--field-scale', lerp(start.scale, end.scale, eased).toFixed(3));
  root.style.setProperty('--field-blur', `${lerp(start.blur, end.blur, eased).toFixed(1)}px`);
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

window.addEventListener('scroll', requestFieldUpdate, { passive: true });
window.addEventListener('resize', requestFieldUpdate);

menuToggle?.addEventListener('click', () => {
  const open = body.classList.toggle('menu-open');
  menuToggle.setAttribute('aria-expanded', String(open));
});

menuLinks.forEach(link => {
  link.addEventListener('click', () => {
    body.classList.remove('menu-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && body.classList.contains('menu-open')) {
    body.classList.remove('menu-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }
});

updateColorField();
requestAnimationFrame(() => body.classList.add('loaded'));
