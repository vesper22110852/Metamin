import { mountFlower } from './polarization-flower.mjs?v=1';

// Independent of the device film: no autoplay, host bridge or saved preferences.
const root = document.querySelector('[data-flower-demo]');
if (root) {
  const stage = root.querySelector('[data-flower-stage]');
  const controls = root.querySelector('[data-flower-controls]');
  const buttons = [...root.querySelectorAll('[data-flower-pol]')];
  const status = root.querySelector('[data-flower-status]');
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 960 720');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-labelledby', 'flower-title flower-description');
  const title = document.createElementNS(ns, 'title');
  title.id = 'flower-title';
  const description = document.createElementNS(ns, 'desc');
  description.id = 'flower-description';
  description.textContent = 'An idealized application concept. The flowers and background use the same five geometry classes. Their x-polarized colors differ; their small y-polarized differences are omitted. Not a fabricated or measured device.';
  const painting = document.createElementNS(ns, 'g');
  svg.append(title, description, painting);
  const drawing = mountFlower(painting);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let value = 0;
  let selected = 'y';
  let frame = null;

  function paint(amount) {
    value = amount;
    drawing.paint(amount);
  }

  function select(pol, animate = true) {
    selected = pol === 'x' ? 'x' : 'y';
    const target = selected === 'x' ? 1 : 0;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.flowerPol === selected)));
    status.textContent = selected === 'x' ? 'x-pol · Flower pattern revealed' : 'y-pol · Uniform color';
    title.textContent = selected === 'x' ? 'x-pol: colorful flower pattern' : 'y-pol: uniform cyan field';
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    if (!animate || reducedMotion.matches) {
      paint(target);
      return;
    }
    const start = performance.now();
    const from = value;
    const step = now => {
      const t = Math.min(1, (now - start) / 720);
      paint(from + (target - from) * t * t * (3 - 2 * t));
      frame = t < 1 ? requestAnimationFrame(step) : null;
    };
    frame = requestAnimationFrame(step);
  }

  select('y', false);
  stage.replaceChildren(svg);
  root.querySelector('[data-flower-fallback-note]').hidden = true;
  controls.hidden = false;
  buttons.forEach(button => button.addEventListener('click', () => select(button.dataset.flowerPol)));
  reducedMotion.addEventListener('change', () => select(selected, false));
  // Settle an interrupted transition when the page is backgrounded.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) select(selected, false);
  });
}
