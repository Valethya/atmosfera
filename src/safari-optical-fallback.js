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

    // Irregular overlapping slices. Each slice contains the complete field so
    // the colors stay bonded while the apparent lens bends the composition.
    const sliceConfig = [
      { left: -6, width: 20, shift: -14, stretch: .016, lift: -1 },
      { left:  7, width: 20, shift:  22, stretch: .026, lift:  1 },
      { left: 20, width: 20, shift: -29, stretch: .034, lift: -2 },
      { left: 33, width: 20, shift:  37, stretch: .048, lift:  1 },
      { left: 46, width: 20, shift: -24, stretch: .039, lift:  0 },
      { left: 59, width: 20, shift:  32, stretch: .043, lift:  2 },
      { left: 72, width: 20, shift: -27, stretch: .033, lift: -1 },
      { left: 85, width: 18, shift:  19, stretch: .024, lift:  1 },
      { left: 96, width: 12, shift: -11, stretch: .014, lift:  0 },
    ];

    const opticalWindow = document.createElement('div');
    opticalWindow.className = 'safari-optical-window';
    opticalWindow.setAttribute('aria-hidden', 'true');

    const baseWash = document.createElement('div');
    baseWash.className = 'safari-optical-base-wash';
    opticalWindow.appendChild(baseWash);

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
      return Math.pow(Math.max(0, peak), .82);
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
      const active = intensity > .008;

      if (!active) {
        opticalWindow.style.opacity = '0';
        opticalWindow.style.visibility = 'hidden';
        baseWash.style.opacity = '0';
        return;
      }

      syncLayerState();

      opticalWindow.style.visibility = 'visible';
      opticalWindow.style.opacity = Math.min(1, .16 + intensity * .96).toFixed(3);
      baseWash.style.opacity = (intensity * .16).toFixed(3);

      slices.forEach(({ config, slice, field }, index) => {
        const centerWeight = 1 - Math.min(.22, Math.abs(index - 4) * .038);
        const local = intensity * centerWeight;
        const x = config.shift * local;
        const y = config.lift * local;
        const sx = 1 + config.stretch * local;
        const sy = 1 + .008 * local;

        field.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
        slice.style.opacity = Math.min(1, .84 + local * .22).toFixed(3);
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
