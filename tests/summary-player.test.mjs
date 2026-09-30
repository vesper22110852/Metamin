import test from "node:test";
import assert from "node:assert/strict";
import { mountSummaryPlayer } from "../assets/summary-player.mjs";

class Element {
  constructor() { this.dataset = {}; this.attributes = new Map(); this.listeners = new Map(); this.textContent = ""; this.value = ""; }
  setAttribute(key, value) { this.attributes.set(key, value); }
  getAttribute(key) { return this.attributes.get(key) ?? null; }
  addEventListener(type, handler) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(handler); }
  removeEventListener(type, handler) { this.listeners.get(type)?.delete(handler); }
  emit(type) { for (const handler of this.listeners.get(type) ?? []) handler({ target: this }); }
}
function fixture(extra = {}) {
  const root = new Element();
  const doc = new Element();
  doc.hidden = false;
  doc.defaultView = {};
  root.ownerDocument = doc;
  const controls = Object.fromEntries(["play", "replay", "seek", "time", "status"].map(key => [key, new Element()]));
  const chapters = [0, 5, 12, 17].map(time => { const button = new Element(); button.dataset.time = String(time); return button; });
  root.querySelector = selector => controls[selector.match(/data-summary-(\w+)/)?.[1]];
  root.querySelectorAll = () => chapters;
  let milliseconds = 0;
  let id = 0;
  let observer;
  const frames = new Map();
  const rendered = [];
  class MockObserver {
    constructor(callback) { this.callback = callback; observer = this; }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
    show(isIntersecting) { this.callback([{ target: root, isIntersecting }]); }
  }
  const platform = {
    now: () => milliseconds,
    requestAnimationFrame: callback => { frames.set(++id, callback); return id; },
    cancelAnimationFrame: frameId => frames.delete(frameId),
    IntersectionObserver: MockObserver
  };
  const player = mountSummaryPlayer(root, { render: time => rendered.push(time), platform, ...extra });
  function advance(delta, runFrame = true) {
    milliseconds += delta;
    if (!runFrame) return;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(milliseconds));
  }
  return { root, doc, controls, chapters, player, frames, rendered, advance, get observer() { return observer; } };
}

test("summary starts at zero without autoplay and exposes accessible controls", () => {
  const f = fixture();
  assert.deepEqual(f.rendered, [0]);
  assert.equal(f.frames.size, 0);
  assert.equal(f.player.getState().playing, false);
  assert.equal(f.controls.play.textContent, "Play 20-second summary");
  assert.equal(f.controls.play.getAttribute("aria-pressed"), "false");
  assert.equal(f.controls.seek.max, "20");
  assert.equal(f.controls.seek.step, "0.05");
  assert.equal(f.controls.time.textContent, "0:00 / 0:20");
  assert.equal(f.controls.time.getAttribute("aria-live"), "off");
  assert.equal(f.controls.status.getAttribute("aria-live"), "polite");
});

test("foreground playback finishes in 20 seconds even with sparse frames, without looping", () => {
  const f = fixture();
  f.controls.play.emit("click");
  const announcement = f.controls.status.textContent;
  f.advance(7500);
  assert.equal(f.player.getState().time, 7.5);
  assert.equal(f.controls.status.textContent, announcement);
  f.advance(12500);
  assert.equal(f.player.getState().time, 20);
  assert.equal(f.player.getState().ended, true);
  assert.equal(f.player.getState().playing, false);
  assert.equal(f.controls.play.textContent, "Replay summary");
  assert.equal(f.frames.size, 0);
  f.advance(100000);
  assert.equal(f.player.getState().time, 20);
});

test("pause is frame-independent and resume excludes paused time", () => {
  const f = fixture();
  f.player.play();
  f.advance(1250, false);
  f.player.pause();
  assert.equal(f.player.getState().time, 1.25);
  assert.equal(f.frames.size, 0);
  f.advance(30000);
  f.player.play();
  f.player.play();
  assert.equal(f.frames.size, 1);
  f.advance(750);
  assert.equal(f.player.getState().time, 2);
});

test("seek pauses playback and clamps invalid or out-of-range positions", () => {
  const f = fixture();
  f.player.play();
  f.controls.seek.value = "8.05";
  f.controls.seek.emit("input");
  assert.equal(f.player.getState().time, 8.05);
  assert.equal(f.player.getState().playing, false);
  assert.equal(f.frames.size, 0);
  for (const [input, expected] of [[-5, 0], [25, 20], [NaN, 0], ["invalid", 0], [Infinity, 20], [-Infinity, 0]]) {
    f.player.seek(input);
    assert.equal(f.player.getState().time, expected);
    assert.equal(f.rendered.at(-1), expected);
  }
});

test("both replay controls restart at zero; chapters seek and pause", () => {
  const calls = [];
  const f = fixture({ onChapter: (...args) => calls.push(args) });
  f.player.seek(20);
  f.controls.play.emit("click");
  assert.equal(f.player.getState().time, 0);
  assert.equal(f.player.getState().playing, true);
  f.advance(4000);
  f.controls.replay.emit("click");
  assert.equal(f.player.getState().time, 0);
  assert.equal(f.frames.size, 1);
  f.chapters[2].emit("click");
  assert.equal(f.player.getState().time, 12);
  assert.equal(f.player.getState().playing, false);
  assert.deepEqual(calls, [[12, f.chapters[2]]]);
});

test("hidden-page and offscreen pauses never resume automatically or jump forward", () => {
  const f = fixture();
  f.player.play();
  f.advance(2000);
  f.doc.hidden = true;
  f.doc.emit("visibilitychange");
  f.advance(60000);
  f.player.play();
  assert.equal(f.player.getState().playing, false);
  f.doc.hidden = false;
  f.doc.emit("visibilitychange");
  assert.equal(f.player.getState().time, 2);
  assert.equal(f.player.getState().playing, false);
  f.player.play();
  f.advance(1000);
  f.observer.show(false);
  f.advance(60000);
  f.player.play();
  assert.equal(f.player.getState().playing, false);
  f.observer.show(true);
  assert.equal(f.player.getState().playing, false);
  f.player.play();
  f.advance(1000);
  assert.equal(f.player.getState().time, 4);
});

test("a delayed hidden frame cannot add background time", () => {
  const f = fixture();
  f.player.play();
  f.advance(1000);
  f.doc.hidden = true;
  f.advance(60000);
  assert.equal(f.player.getState().time, 1);
  assert.equal(f.player.getState().playing, false);
});

test("players are independent and destroy removes every listener, observer and frame", () => {
  const a = fixture();
  const b = fixture();
  a.player.play();
  b.player.play();
  a.advance(3000);
  assert.equal(b.player.getState().time, 0);
  const count = a.rendered.length;
  a.player.destroy();
  a.player.destroy();
  a.controls.play.emit("click");
  a.chapters[1].emit("click");
  a.doc.emit("visibilitychange");
  a.player.play();
  a.player.pause();
  a.player.seek(4);
  a.observer.show(false);
  assert.equal(a.rendered.length, count);
  assert.equal(a.player.getState().destroyed, true);
  assert.equal(a.frames.size, 0);
  assert.equal(a.observer.disconnected, true);
  assert.equal(a.root.dataset.playing, "false");
  assert.equal([...a.doc.listeners.values()].every(handlers => handlers.size === 0), true);
  assert.equal([...a.controls.play.listeners.values()].every(handlers => handlers.size === 0), true);
  b.advance(1000);
  assert.equal(b.player.getState().time, 1);
});

test("invalid configuration fails explicitly", () => {
  assert.throws(() => mountSummaryPlayer(null), TypeError);
  for (const duration of [0, -1, NaN, Infinity]) assert.throws(() => fixture({ duration }), RangeError);
});
