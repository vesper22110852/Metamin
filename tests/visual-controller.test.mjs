import test from "node:test";
import assert from "node:assert/strict";

function element() {
  return {
    attributes: {}, listeners: {}, dataset: {}, hidden: true, textContent: "",
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(key, listener) { this.listeners[key] = listener; },
    classList: { values: new Set(), add(value) { this.values.add(value); } },
  };
}

function environment({ reducedMotion = false, noCanvas = false, width = 800, height = 540 } = {}) {
  const points = [], labels = [], frames = new Map();
  const context = {
    clearRect() { points.length = 0; labels.length = 0; },
    moveTo(x, y) { points.push([x, y]); }, lineTo(x, y) { points.push([x, y]); },
    fillText(text, x, y) { labels.push({text, x, y, align: this.textAlign}); },
    measureText(text) { return { width: text.length * 7 }; },
    createRadialGradient() { return { addColorStop() {} }; },
    beginPath() {}, closePath() {}, fill() {}, stroke() {}, setTransform() {}, fillRect() {},
  };
  const canvas = element(), figure = element(), controls = element(), pause = element(), label = element(), symbol = element();
  const focus = element(), steer = element();
  focus.dataset.waveMode = "focus"; steer.dataset.waveMode = "steer";
  canvas.getContext = () => noCanvas ? null : context;
  canvas.getBoundingClientRect = () => ({width, height});
  pause.querySelector = (selector) => selector === "[data-motion-label]" ? label : symbol;
  const selectors = {"#wave-canvas": canvas, ".wave-figure": figure, ".wave-controls": controls, "#motion-toggle": pause};
  const documentListeners = {};
  globalThis.document = {
    hidden: false,
    querySelector: (selector) => selectors[selector],
    querySelectorAll: () => [focus, steer],
    addEventListener(key, listener) { documentListeners[key] = listener; },
  };
  const preference = {matches: reducedMotion, addEventListener(key, listener) { this.listener = listener; }};
  globalThis.window = {matchMedia: () => preference, devicePixelRatio: 3};
  let nextId = 0;
  globalThis.requestAnimationFrame = (callback) => { frames.set(++nextId, callback); return nextId; };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  let resizeCallback, visibilityCallback;
  globalThis.ResizeObserver = class { constructor(callback) { resizeCallback = callback; } observe() {} };
  globalThis.IntersectionObserver = class { constructor(callback) { visibilityCallback = callback; } observe() {} };
  return {canvas, figure, controls, focus, steer, pause, label, preference, frames, points, labels,
    tabVisible(visible) { document.hidden = !visible; documentListeners.visibilitychange(); },
    inView(visible) { visibilityCallback([{isIntersecting: visible}]); },
    resize(w, h) { width = w; height = h; resizeCallback(); },
  };
}

test("mode controls, pause, hidden states, DPR cap, and reduced motion", async () => {
  const env = environment();
  await import("../assets/metasurface.js?controller-test");
  assert.equal(env.controls.hidden, false);
  assert.ok(env.figure.classList.values.has("is-ready"));
  assert.equal(env.canvas.width, 1400);
  assert.equal(env.frames.size, 1);
  env.steer.listeners.click();
  assert.equal(env.steer.attributes["aria-pressed"], "true");
  assert.equal(env.focus.attributes["aria-pressed"], "false");
  assert.match(env.canvas.attributes["aria-label"], /steering/);
  env.pause.listeners.click();
  assert.equal(env.frames.size, 0);
  assert.equal(env.label.textContent, "Play motion");
  env.pause.listeners.click();
  assert.equal(env.frames.size, 1);
  env.tabVisible(false); assert.equal(env.frames.size, 0);
  env.tabVisible(true); assert.equal(env.frames.size, 1);
  env.inView(false); assert.equal(env.frames.size, 0);
  env.inView(true); assert.equal(env.frames.size, 1);
  env.preference.listener({matches: true});
  assert.equal(env.frames.size, 0);
  assert.equal(env.label.textContent, "Play motion");
});

test("reduced-motion users get a static first render with optional playback", async () => {
  const env = environment({reducedMotion: true});
  await import("../assets/metasurface.js?reduced-test");
  assert.equal(env.frames.size, 0);
  assert.ok(env.points.length > 0);
  assert.equal(env.label.textContent, "Play motion");
  env.pause.listeners.click();
  assert.equal(env.frames.size, 1);
});

test("no canvas preserves static fallback and does not expose dead controls", async () => {
  const env = environment({noCanvas: true});
  await import("../assets/metasurface.js?fallback-test");
  assert.equal(env.controls.hidden, true);
  assert.equal(env.figure.classList.values.has("is-ready"), false);
  assert.equal(env.frames.size, 0);
});

test("diagram paths and labels fit representative mobile and desktop canvas sizes", async () => {
  const env = environment({reducedMotion: true});
  await import("../assets/metasurface.js?geometry-test");
  for (const [width, height] of [[300, 290], [355, 330], [500, 490], [804, 542]]) {
    env.resize(width, height);
    for (const button of [env.focus, env.steer]) {
      button.listeners.click();
      for (const [x, y] of env.points) {
        assert.ok(x >= 0 && x <= width, `path x=${x} outside ${width} in ${button.dataset.waveMode}`);
        assert.ok(y >= 0 && y <= height, `path y=${y} outside ${height}`);
      }
      for (const label of env.labels) {
        const textWidth = label.text.length * 7;
        const left = label.align === "right" ? label.x - textWidth : label.x;
        assert.ok(left >= 0 && left + textWidth <= width, `${label.text} clipped at ${width}px`);
      }
    }
  }
});
