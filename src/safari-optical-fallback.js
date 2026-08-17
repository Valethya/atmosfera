import './safari-optical-fallback.css';

const ua = navigator.userAgent;
const isAppleTouchWebKit = /AppleWebKit/i.test(ua) && (
  /iPhone|iPad|iPod/i.test(ua)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
);

if (isAppleTouchWebKit) {
  const sourceField = document.querySelector('.color-field');
  const refractionBridge = document.querySelector('.refraction-bridge');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (sourceField && refractionBridge) {
    document.documentElement.classList.add('safari-optical-slices');

    const layerNames = ['halo', 'orange', 'red', 'blue'];
    const sourceLayers = Object.fromEntries(
      layerNames.map(name => [
        name,
        sourceField.querySelector(`[data-field-layer="${name}"]`),
      ]),
    );

    const sliceConfig = [
      { left: -5, width: 24, shift: -9,  stretch: .010, lift: -1 },
      { left: 11, width: 24, shift: 12,  stretch: .015, lift: 1 },
      { left: 27, width: 23, shift: -15, stretch: .020, lift: -1 },
      { left: 43, width: 24, shift: 22,  stretch: .026, lift: 0 },
      { left: 60, width: 23, shift: -14, stretch: .019, lift: 1 },
      { left: 76, width: 22, shift: 10,  stretch: .014, lift: -1 },
      { left: 91, width: 15, shift: -6,  stretch: .009, lift: 0 },
    ];

    const opticalWindow = document.createElement('div');
    opticalWindow.className = 'safari-optical-window';
    opticalWindow.setAttribute('aria-hidden', 'true');

    const slices = sliceConfig.map(config => {
      const slice = document.createElement('div');
      slice.className = 'safari-optical-slice';
      slice.style.left = `${config.left}vw`;
      slice.style.width = `${config.width}vw`;

      const field = document.createElement('div');
      field.className = 'safari-optical-slice-field';
      field.style.left = `${-config.left}vw`;

      const clones = {};
      layerNames.forEach(name => {
        const source = sourceLayers[name];
        if (!source) return;

        const clone = source.cloneNode(false);
        clone.removeAttribute('data-field-layer');
        clone.dataset.safariLayer = name;
        field.appendChild(clone);
        clones[name] = clone;
      });

      slice.appendChild(field);
      opticalWindow.appendChild(slice);

      return { config, slice, field, clones };
    });

    document.querySelector('.site-shell')?.appendChild(opticalWindow);

    const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
    let frame = 0;

    function getIntensity() {
      const rect = refractionBridge.getBoundingClientRect();
      const viewport = window.innerHeight;
      const travel = rect.height + viewport * .92;
      const progress = clamp((viewport * .96 - rect.top) / Math.max(1, travel));
      const peak = Math.sin(progress * Math.PI);
      return Math.pow(Math.max(0, peak), .94);
    }

    function syncLayerState() {
      slices.forEach(({ clones }) => {
        layerNames.forEach(name => {
          const source = sourceLayers[name];
          const clone = clones[name];
          if (!source || !clone) return;

          clone.style.transform = source.style.transform;
          clone.style.opacity = source.style.opacity;
        });
      });
    }

    function render() {
      frame = 0;

      if (reducedMotionQuery.matches) {
        opticalWindow.style.opacity = '0';
        opticalWindow.style.visibility = 'hidden';
        return;
      }

      const intensity = getIntensity();
      const active = intensity > .012;

      if (!active) {
        opticalWindow.style.opacity = '0';
        opticalWindow.style.visibility = 'hidden';
        return;
      }

      syncLayerState();

      opticalWindow.style.visibility = 'visible';
      opticalWindow.style.opacity = Math.min(.90, .08 + intensity * .82).toFixed(3);

      slices.forEach(({ config, slice, field }, index) => {
        const centerWeight = 1 - Math.min(.28, Math.abs(index - 3) * .055);
        const local = intensity * centerWeight;
        const x = config.shift * local;
        const y = config.lift * local;
        const sx = 1 + config.stretch * local;
        const sy = 1 + .004 * local;

        field.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
        slice.style.opacity = (.72 + local * .24).toFixed(3);
      });

      frame = requestAnimationFrame(render);
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(render);
    }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);
    reducedMotionQuery.addEventListener?.('change', schedule);

    requestAnimationFrame(schedule);
  }
}
