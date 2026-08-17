import './landing-v2.css';
import './nav-gradient.css';
import './mobile-hero-tuning.css';
import './refraction-experiment.css';

const body = document.body;
const field = document.querySelector('.color-field');
const menuToggle = document.querySelector('.menu-toggle');
const menuOverlay = document.querySelector('.menu-overlay');
const menuLinks = document.querySelectorAll('.menu-link');
const refractionBridge = document.querySelector('.refraction-bridge');
const refractionBars = [...document.querySelectorAll('.refraction-bar')];
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

const layers = Object.fromEntries(
  [...document.querySelectorAll('[data-field-layer]')].map(element => [
    element.dataset.fieldLayer,
    element,
  ]),
);

const layerResponses = {
  halo: 0.07,
  orange: 0.115,
  red: 0.09,
  blue: 0.07,
};

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOutCubic = t => t < 0.5
  ? 4 * t * t * t
  : 1 - Math.pow(-2 * t + 2, 3) / 2;

const mobileFrames = [
  {
    id: 'home',
    halo:   { x: 82, y: 56, sx: 1.05, sy: .92, r: 0, o: .48 },
    orange: { x: 84, y: 57, sx: .90,  sy: .84, r: 0, o: .84 },
    red:    { x: 87, y: 58, sx: .76,  sy: .78, r: 0, o: .78 },
    blue:   { x: 92, y: 60, sx: .54,  sy: .56, r: 0, o: 1 },
  },
  {
    id: 'construir',
    halo:   { x: 49, y: 46, sx: 1.75, sy: 1.55, r: -6,  o: .58 },
    orange: { x: 52, y: 40, sx: 1.42, sy: 1.18, r: -8,  o: .78 },
    red:    { x: 61, y: 47, sx: 1.30, sy: 1.42, r: -12, o: .76 },
    blue:   { x: 67, y: 58, sx: 1.06, sy: 1.18, r: 6,   o: .94 },
  },
  {
    id: 'refraccion',
    halo:   { x: 43, y: 49, sx: 1.96, sy: 1.28, r: -10, o: .55 },
    orange: { x: 35, y: 43, sx: 1.70, sy: .92,  r: -17, o: .77 },
    red:    { x: 50, y: 51, sx: 1.44, sy: 1.02, r: -9,  o: .74 },
    blue:   { x: 63, y: 57, sx: 1.03, sy: .84,  r: 10,  o: .92 },
  },
  {
    id: 'proceso',
    halo:   { x: 30, y: 49, sx: 1.95, sy: 1.35, r: -10, o: .54 },
    orange: { x: 23, y: 45, sx: 1.72, sy: 1.02, r: -15, o: .75 },
    red:    { x: 38, y: 53, sx: 1.50, sy: 1.08, r: -11, o: .72 },
    blue:   { x: 51, y: 58, sx: 1.14, sy: .94,  r: 5,   o: .90 },
  },
  {
    id: 'experiencia',
    halo:   { x: 74, y: 54, sx: 1.42, sy: 1.72, r: 8,  o: .53 },
    orange: { x: 76, y: 48, sx: 1.18, sy: 1.48, r: 10, o: .72 },
    red:    { x: 72, y: 56, sx: 1.10, sy: 1.58, r: 8,  o: .70 },
    blue:   { x: 73, y: 65, sx: .86,  sy: 1.24, r: 4,  o: .92 },
  },
];

const desktopFrames = [
  {
    id: 'home',
    halo:   { x: 73, y: 62, sx: 1.26, sy: 1.12, r: 0, o: .60 },
    orange: { x: 74, y: 61, sx: 1.10, sy: 1.02, r: 0, o: .88 },
    red:    { x: 76, y: 61, sx: .92,  sy: .94,  r: 0, o: .82 },
    blue:   { x: 78, y: 62, sx: .65,  sy: .68,  r: 0, o: 1 },
  },
  {
    id: 'construir',
    halo:   { x: 53, y: 46, sx: 1.68, sy: 1.46, r: -6,  o: .56 },
    orange: { x: 54, y: 40, sx: 1.38, sy: 1.14, r: -8,  o: .76 },
    red:    { x: 61, y: 47, sx: 1.25, sy: 1.34, r: -11, o: .74 },
    blue:   { x: 66, y: 57, sx: 1.02, sy: 1.12, r: 5,   o: .92 },
  },
  {
    id: 'refraccion',
    halo:   { x: 45, y: 48, sx: 1.82, sy: 1.22, r: -9,  o: .53 },
    orange: { x: 38, y: 43, sx: 1.58, sy: .90,  r: -15, o: .74 },
    red:    { x: 50, y: 50, sx: 1.36, sy: .98,  r: -8,  o: .71 },
    blue:   { x: 61, y: 56, sx: .98,  sy: .82,  r: 9,   o: .89 },
  },
  {
    id: 'proceso',
    halo:   { x: 32, y: 50, sx: 1.86, sy: 1.28, r: -10, o: .52 },
    orange: { x: 26, y: 45, sx: 1.64, sy: .98,  r: -14, o: .73 },
    red:    { x: 39, y: 52, sx: 1.42, sy: 1.04, r: -10, o: .70 },
    blue:   { x: 50, y: 58, sx: 1.08, sy: .92,  r: 4,   o: .88 },
  },
  {
    id: 'experiencia',
    halo:   { x: 70, y: 54, sx: 1.36, sy: 1.62, r: 8, o: .50 },
    orange: { x: 72, y: 48, sx: 1.14, sy: 1.40, r: 9, o: .70 },
    red:    { x: 69, y: 56, sx: 1.06, sy: 1.48, r: 7, o: .68 },
    blue:   { x: 70, y: 64, sx: .82,  sy: 1.18, r: 4, o: .90 },
  },
];

function getFrames() {
  const source = window.innerWidth < 760 ? mobileFrames : desktopFrames;

  return source
    .map(frame => {
      const section = document.getElementById(frame.id);
      return section ? { ...frame, top: section.offsetTop } : null;
    })
    .filter(Boolean);
}

function interpolateLayer(from, to, progress) {
  const t = easeInOutCubic(clamp(progress));
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    sx: lerp(from.sx, to.sx, t),
    sy: lerp(from.sy, to.sy, t),
    r: lerp(from.r, to.r, t),
    o: lerp(from.o, to.o, t),
  };
}

function getTargetStates() {
  const frames = getFrames();
  if (!frames.length) return {};

  const scroll = window.scrollY;
  let from = frames[0];
  let to = frames[0];
  let progress = 0;

  if (scroll >= frames[frames.length - 1].top) {
    from = frames[frames.length - 1];
    to = from;
  } else {
    for (let i = 0; i < frames.length - 1; i += 1) {
      if (scroll >= frames[i].top && scroll < frames[i + 1].top) {
        from = frames[i];
        to = frames[i + 1];
        progress = (scroll - from.top) / Math.max(1, to.top - from.top);
        break;
      }
    }
  }

  return Object.keys(layers).reduce((result, name) => {
    result[name] = interpolateLayer(from[name], to[name], progress);
    return result;
  }, {});
}

const currentStates = {};
let targetStates = {};
let fieldAnimationFrame = 0;

function applyLayerState(name, state) {
  const element = layers[name];
  if (!element || !state) return;

  element.style.transform = [
    `translate3d(calc(${state.x.toFixed(3)}vw - 50%), calc(${state.y.toFixed(3)}vh - 50%), 0)`,
    `rotate(${state.r.toFixed(3)}deg)`,
    `scale(${state.sx.toFixed(4)}, ${state.sy.toFixed(4)})`,
  ].join(' ');
  element.style.opacity = state.o.toFixed(3);
}

function cloneState(state) {
  return { ...state };
}

function stateDistance(a, b) {
  return Math.abs(a.x - b.x)
    + Math.abs(a.y - b.y)
    + Math.abs(a.sx - b.sx) * 10
    + Math.abs(a.sy - b.sy) * 10
    + Math.abs(a.r - b.r) * .2
    + Math.abs(a.o - b.o) * 5;
}

function animateField() {
  fieldAnimationFrame = 0;
  let unsettled = false;

  Object.keys(layers).forEach(name => {
    const target = targetStates[name];
    if (!target) return;

    if (!currentStates[name]) currentStates[name] = cloneState(target);

    const current = currentStates[name];
    const response = layerResponses[name] ?? .09;

    if (reducedMotionQuery.matches) {
      Object.assign(current, target);
    } else {
      current.x = lerp(current.x, target.x, response);
      current.y = lerp(current.y, target.y, response);
      current.sx = lerp(current.sx, target.sx, response);
      current.sy = lerp(current.sy, target.sy, response);
      current.r = lerp(current.r, target.r, response);
      current.o = lerp(current.o, target.o, Math.min(.18, response * 1.6));
    }

    applyLayerState(name, current);

    if (stateDistance(current, target) > .015) unsettled = true;
  });

  if (unsettled && !reducedMotionQuery.matches) {
    fieldAnimationFrame = requestAnimationFrame(animateField);
  }
}

function requestFieldUpdate({ immediate = false } = {}) {
  if (!field) return;
  targetStates = getTargetStates();

  if (immediate || reducedMotionQuery.matches) {
    Object.entries(targetStates).forEach(([name, state]) => {
      currentStates[name] = cloneState(state);
      applyLayerState(name, state);
    });
    return;
  }

  if (!fieldAnimationFrame) {
    fieldAnimationFrame = requestAnimationFrame(animateField);
  }
}

function updateRefraction() {
  if (!refractionBridge || !refractionBars.length) return;

  if (reducedMotionQuery.matches) {
    refractionBridge.style.setProperty('--refraction-opacity', '.42');
    refractionBridge.style.setProperty('--refraction-blur', '7px');
    refractionBridge.style.setProperty('--refraction-saturation', '1.1');
    refractionBars.forEach(bar => { bar.style.transform = 'none'; });
    return;
  }

  const rect = refractionBridge.getBoundingClientRect();
  const viewport = window.innerHeight;
  const travel = rect.height + viewport * .84;
  const progress = clamp((viewport * .92 - rect.top) / Math.max(1, travel));
  const peak = Math.sin(progress * Math.PI);

  refractionBridge.style.setProperty('--refraction-opacity', (.12 + peak * .78).toFixed(3));
  refractionBridge.style.setProperty('--refraction-blur', `${(4 + peak * 10).toFixed(2)}px`);
  refractionBridge.style.setProperty('--refraction-saturation', (1.04 + peak * .32).toFixed(3));

  refractionBars.forEach(bar => {
    const shift = Number(bar.dataset.shift || 0);
    const lift = Number(bar.dataset.lift || 0);
    const stretch = Number(bar.dataset.stretch || 0);
    const x = shift * peak;
    const y = lift * (.35 + peak * .65);
    const scaleX = 1 + stretch * peak;
    const scaleY = 1 + .04 * peak;

    bar.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`;
  });
}

function updateScrollEffects({ immediate = false } = {}) {
  requestFieldUpdate({ immediate });
  updateRefraction();
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

window.addEventListener('scroll', () => updateScrollEffects(), { passive: true });
window.addEventListener('resize', () => updateScrollEffects({ immediate: true }));
window.addEventListener('load', () => updateScrollEffects({ immediate: true }));
reducedMotionQuery.addEventListener?.('change', () => updateScrollEffects({ immediate: true }));

updateScrollEffects({ immediate: true });
requestAnimationFrame(() => {
  body.classList.add('loaded');

  const visibleNow = [...reveals].filter(element => {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.86 && rect.bottom > 0;
  });
  visibleNow.forEach(element => element.classList.add('is-visible'));
});