import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const controller = read('../assets/polarization-application.js');
const executable = controller.replace(/^import\s+\{\s*mountFlower\s*\}\s+from\s+['"][^'"]+['"];?\s*/u, '');

class Element {
  constructor(tag = 'div') {
    this.tagName = tag;
    this.attributes = new Map();
    this.listeners = new Map();
    this.children = [];
    this.dataset = {};
    this.textContent = '';
    this.hidden = false;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = [...children]; }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
  }
  emit(type) {
    for (const listener of this.listeners.get(type) ?? []) listener({ target: this });
  }
}

function fixture({ reduce = false, present = true } = {}) {
  const stage = new Element();
  const controls = new Element();
  controls.hidden = true;
  const status = new Element();
  const fallback = new Element('p');
  const root = new Element('section');
  const buttons = ['y', 'x'].map(pol => {
    const button = new Element('button');
    button.dataset.flowerPol = pol;
    return button;
  });
  const selectors = new Map([
    ['[data-flower-stage]', stage],
    ['[data-flower-controls]', controls],
    ['[data-flower-status]', status],
    ['[data-flower-fallback-note]', fallback]
  ]);
  root.querySelector = selector => {
    assert.ok(selectors.has(selector), `Unexpected or unscoped selector ${selector}`);
    return selectors.get(selector);
  };
  root.querySelectorAll = selector => {
    assert.equal(selector, '[data-flower-pol]');
    return buttons;
  };
  const doc = new Element('document');
  doc.hidden = false;
  const documentQueries = [];
  doc.querySelector = selector => {
    documentQueries.push(selector);
    assert.equal(selector, '[data-flower-demo]', 'the controller must not address the device film');
    return present ? root : null;
  };
  doc.createElementNS = (namespace, tag) => {
    assert.equal(namespace, 'http://www.w3.org/2000/svg');
    return new Element(tag);
  };
  const media = new Element('media-query');
  media.matches = reduce;
  const paints = [];
  const frames = new Map();
  let milliseconds = 0;
  let nextFrame = 0;
  let mountCount = 0;
  runInNewContext(executable, {
    document: doc,
    window: {
      matchMedia: query => {
        assert.equal(query, '(prefers-reduced-motion: reduce)');
        return media;
      }
    },
    mountFlower: painting => {
      assert.equal(painting.tagName, 'g');
      mountCount++;
      return { paint: value => paints.push(value) };
    },
    performance: { now: () => milliseconds },
    requestAnimationFrame: callback => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    },
    cancelAnimationFrame: id => frames.delete(id)
  }, { filename: 'polarization-application.js' });
  function advance(delta) {
    milliseconds += delta;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(milliseconds));
  }
  return { stage, controls, status, fallback, buttons, root, doc, media, paints, frames, mountCount, documentQueries, advance };
}

test('application follows the device film and precedes the publication citation', () => {
  const html = read('../publications/polarization-decoupled-cavity.html');
  const film = html.indexOf('data-paper-summary');
  const filmEnd = html.indexOf('</figure>', film);
  const application = html.indexOf('<section id="application"');
  const applicationEnd = html.indexOf('</section>', application);
  const citation = html.indexOf('<article class="article-body paper-summary-details">');
  assert.ok(film >= 0 && filmEnd > film);
  assert.ok(application > filmEnd && applicationEnd > application && citation > applicationEnd);
  const section = html.slice(application, applicationEnd);
  const controls = [...section.matchAll(/<button[^>]*data-flower-pol="([xy])"[^>]*aria-pressed="(true|false)"[^>]*>([^<]+)<\/button>/g)];
  assert.deepEqual(controls.map(([, pol, pressed, label]) => [pol, pressed, label]), [['y', 'true', 'y-pol'], ['x', 'false', 'x-pol']]);
  assert.equal([...section.matchAll(/<button\b/g)].length, 2);
  assert.match(section, /data-flower-controls hidden/);
  assert.match(section, /data-flower-status role="status" aria-live="polite"/);
  assert.match(section, /aria-describedby="flower-scope"/);
  assert.doesNotMatch(section, /data-summary-/);
  assert.match(html, /polarization-application\.js\?v=\d+" type="module"/);
  assert.match(html, /polarization-application\.css\?v=\d+/);
});

test('the application declares idealization and retains an accessible no-script illustration', () => {
  const html = read('../publications/polarization-decoupled-cavity.html');
  const section = html.slice(html.indexOf('<section id="application"'), html.indexOf('<article class="article-body paper-summary-details">'));
  assert.match(section, /Application concept/);
  assert.match(section, /not a fabricated or measured image-display device/);
  assert.match(section, /flowers and background both use the five geometry classes/);
  assert.match(section, /Small y-polarized color differences are omitted/);
  assert.match(section, /not a calculated polarization sweep/);
  assert.match(section, /Static x-pol illustration/);
  assert.match(section, /<img src="\.\.\/assets\/polarization-flower\.svg\?v=\d+" width="960" height="720" alt="[^"]+"/);
  assert.doesNotMatch(section, /encryption|unbreakable|perfect concealment|autoplay|<iframe|<video/i);
});

test('flower starts in y without autoplay and upgrades the fallback only after mounting', () => {
  const f = fixture();
  assert.equal(f.mountCount, 1);
  assert.deepEqual(f.paints, [0]);
  assert.equal(f.frames.size, 0);
  assert.equal(f.controls.hidden, false);
  assert.equal(f.fallback.hidden, true);
  assert.equal(f.buttons[0].getAttribute('aria-pressed'), 'true');
  assert.equal(f.buttons[1].getAttribute('aria-pressed'), 'false');
  assert.equal(f.status.textContent, 'y-pol · Uniform color');
  const [svg] = f.stage.children;
  assert.equal(svg.tagName, 'svg');
  assert.equal(svg.getAttribute('viewBox'), '0 0 960 720');
  assert.equal(svg.getAttribute('role'), 'img');
  assert.equal(svg.getAttribute('aria-labelledby'), 'flower-title flower-description');
  assert.equal(svg.children[0].textContent, 'y-pol: uniform cyan field');
  assert.match(svg.children[1].textContent, /idealized application concept/);
  assert.ok(controller.indexOf('mountFlower(painting)') < controller.indexOf('stage.replaceChildren(svg)'));
});

test('x and y interpolate smoothly for 720 ms and stop exactly at their endpoints', () => {
  const f = fixture();
  f.buttons[1].emit('click');
  assert.equal(f.frames.size, 1);
  assert.equal(f.buttons[0].getAttribute('aria-pressed'), 'false');
  assert.equal(f.buttons[1].getAttribute('aria-pressed'), 'true');
  assert.equal(f.status.textContent, 'x-pol · Flower pattern revealed');
  f.advance(180);
  assert.equal(f.paints.at(-1), .15625);
  f.advance(180);
  assert.equal(f.paints.at(-1), .5);
  f.advance(360);
  assert.equal(f.paints.at(-1), 1);
  assert.equal(f.frames.size, 0);
  f.buttons[0].emit('click');
  f.advance(360);
  assert.equal(f.paints.at(-1), .5);
  f.advance(360);
  assert.equal(f.paints.at(-1), 0);
  assert.equal(f.frames.size, 0);
  const count = f.paints.length;
  f.advance(100000);
  assert.equal(f.paints.length, count, 'the application must not loop after a selection');
});

test('reversing or rapidly retargeting a transition has no jump and only one pending frame', () => {
  const f = fixture();
  f.buttons[1].emit('click');
  f.advance(180);
  const midpoint = f.paints.at(-1);
  f.buttons[0].emit('click');
  assert.equal(f.paints.at(-1), midpoint, 'selecting the reverse preserves the rendered color');
  assert.equal(f.frames.size, 1);
  f.advance(0);
  assert.equal(f.paints.at(-1), midpoint);
  f.advance(360);
  assert.equal(f.paints.at(-1), midpoint / 2);
  for (let i = 0; i < 20; i++) {
    f.buttons[i % 2].emit('click');
    assert.equal(f.frames.size, 1, 'superseded animation frames are cancelled');
  }
  f.advance(720);
  assert.equal(f.paints.at(-1), 1);
  assert.equal(f.frames.size, 0);
  assert.ok(f.paints.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
});

test('reduced motion resolves immediately, including preference changes during animation', () => {
  const reduced = fixture({ reduce: true });
  reduced.buttons[1].emit('click');
  assert.equal(reduced.paints.at(-1), 1);
  assert.equal(reduced.frames.size, 0);
  reduced.buttons[0].emit('click');
  assert.equal(reduced.paints.at(-1), 0);
  assert.equal(reduced.frames.size, 0);
  const f = fixture();
  f.buttons[1].emit('click');
  f.advance(200);
  assert.ok(f.paints.at(-1) > 0 && f.paints.at(-1) < 1);
  f.media.matches = true;
  f.media.emit('change');
  assert.equal(f.paints.at(-1), 1);
  assert.equal(f.frames.size, 0);
});

test('backgrounding settles the requested color and returning does not restart animation', () => {
  const f = fixture();
  f.buttons[1].emit('click');
  f.advance(120);
  f.doc.hidden = true;
  f.doc.emit('visibilitychange');
  assert.equal(f.paints.at(-1), 1);
  assert.equal(f.frames.size, 0);
  f.doc.hidden = false;
  f.doc.emit('visibilitychange');
  assert.equal(f.frames.size, 0);
});

test('flower controller is scoped independently and has no bridge, persistence or remote dependencies', () => {
  const f = fixture();
  assert.deepEqual(f.documentQueries, ['[data-flower-demo]']);
  assert.doesNotMatch(controller, /data-summary-|mountSummaryPlayer|openai|localStorage|sessionStorage|\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
  const imports = [...controller.matchAll(/^import .*? from ['"]([^'"]+)['"]/gm)].map(match => match[1]);
  assert.deepEqual(imports, ['./polarization-flower.mjs?v=1']);
  const missing = fixture({ present: false });
  assert.equal(missing.mountCount, 0);
  assert.deepEqual(missing.paints, []);
  assert.equal(missing.frames.size, 0);
  assert.equal(missing.controls.hidden, true);
});

test('flower styling preserves the full artwork and scopes controls to its own section', () => {
  const css = read('../assets/polarization-application.css');
  assert.match(css, /\.flower-stage\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*3/);
  assert.match(css, /\.flower-stage\s*>\s*svg,\s*\.flower-stage\s*>\s*img\s*\{[^}]*width:\s*100%/);
  assert.match(css, /\.flower-switch button\s*\{[^}]*min-height:\s*44px/);
  assert.match(css, /@media\s*\(max-width:\s*800px\)/);
  assert.doesNotMatch(css, /\.paper-film|data-summary-|body\s*\{|:root\s*\{|@import|url\(/);
});
