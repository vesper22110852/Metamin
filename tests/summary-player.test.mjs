import test from "node:test";
import assert from "node:assert/strict";
import { mountSummaryPlayer } from "../assets/summary-player.mjs";

class Element {
  constructor() { this.dataset = {}; this.attributes = new Map(); this.listeners = new Map(); this.textContent = ""; this.value = ""; }
  setAttribute(key, value) { this.attributes.set(key, value); }
  getAttribute(key) { return this.attributes.get(key) ?? null; }
  addEventListener(type, handler) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(handler); }
  removeEventListener(type, handler) { this.listeners.get(type)?.delete(handler); }
  emit(type, details = {}) { for (const handler of this.listeners.get(type) ?? []) handler({ target: this, ...details }); }
}
function fixture(extra = {}, { hidden = false, reduced = false, observer: observe = true } = {}) {
  const root = new Element();
  const doc = new Element();
  const motion = new Element();
  motion.matches = reduced;
  motion.media = "(prefers-reduced-motion: reduce)";
  doc.hidden = hidden;
  doc.defaultView = { matchMedia: query => { assert.equal(query, motion.media); return motion; } };
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
    IntersectionObserver: observe ? MockObserver : null
  };
  const player = mountSummaryPlayer(root, { render: time => rendered.push(time), platform, ...extra });
  function advance(delta, runFrame = true) {
    milliseconds += delta;
    if (!runFrame) return;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(milliseconds));
  }
  const setReducedMotion = value => { motion.matches = value; motion.emit("change", { matches: value }); };
  return { root, doc, controls, chapters, player, frames, rendered, motion, setReducedMotion, advance, get observer() { return observer; } };
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

test("opt-in autoplay waits until the summary is visible and then starts once", () => {
  const f = fixture({ autoplay: true });
  assert.deepEqual(f.rendered, [0]);
  assert.equal(f.player.getState().playing, false);
  assert.equal(f.frames.size, 0);
  f.advance(30000);
  f.observer.show(false);
  assert.equal(f.player.getState().playing, false);
  f.observer.show(true);
  assert.equal(f.player.getState().playing, true);
  assert.equal(f.player.getState().time, 0);
  assert.equal(f.controls.play.textContent, "Pause summary");
  assert.equal(f.frames.size, 1);
  f.advance(1000);
  f.observer.show(true);
  assert.equal(f.player.getState().time, 1);
  assert.equal(f.frames.size, 1);
  f.advance(19000);
  assert.equal(f.player.getState().ended, true);
  f.observer.show(false);
  f.observer.show(true);
  f.doc.emit("visibilitychange");
  assert.equal(f.player.getState().playing, false);
  assert.equal(f.player.getState().time, 20);
  assert.equal(f.frames.size, 0);
});

test("autoplay defers in a background document until both visibility conditions hold", () => {
  for (const documentFirst of [true, false]) {
    const f = fixture({ autoplay: true }, { hidden: true });
    f.advance(10000);
    if (documentFirst) {
      f.doc.hidden = false;
      f.doc.emit("visibilitychange");
      assert.equal(f.player.getState().playing, false);
      f.observer.show(true);
    } else {
      f.observer.show(true);
      assert.equal(f.player.getState().playing, false);
      f.doc.hidden = false;
      f.doc.emit("visibilitychange");
    }
    assert.equal(f.player.getState().playing, true);
    assert.equal(f.player.getState().time, 0);
    assert.equal(f.frames.size, 1);
    f.advance(500);
    assert.equal(f.player.getState().time, 0.5);
  }
});

test("autoplay works without IntersectionObserver while still respecting document visibility", () => {
  const foreground = fixture({ autoplay: true }, { observer: false });
  assert.equal(foreground.player.getState().playing, true);
  assert.equal(foreground.frames.size, 1);
  const background = fixture({ autoplay: true }, { observer: false, hidden: true });
  assert.equal(background.player.getState().playing, false);
  assert.equal(background.frames.size, 0);
  background.advance(60000);
  background.doc.hidden = false;
  background.doc.emit("visibilitychange");
  assert.equal(background.player.getState().playing, true);
  assert.equal(background.player.getState().time, 0);
  assert.equal(background.frames.size, 1);
});

test("pause, seek and snapshot actions cancel pending autoplay before visibility arrives", () => {
  const actions = [
    [f => f.player.pause(), 0],
    [f => f.player.seek(8), 8],
    [f => f.chapters[2].emit("click"), 12]
  ];
  for (const [act, time] of actions) {
    const f = fixture({ autoplay: true });
    act(f);
    f.observer.show(true);
    f.doc.emit("visibilitychange");
    f.advance(10000);
    assert.equal(f.player.getState().playing, false);
    assert.equal(f.player.getState().time, time);
    assert.equal(f.frames.size, 0);
  }
});

test("a user pause or seek after autoplay is not undone by later visibility changes", () => {
  for (const act of [f => f.controls.play.emit("click"), f => f.player.seek(8), f => f.chapters[2].emit("click")]) {
    const f = fixture({ autoplay: true });
    f.observer.show(true);
    f.advance(2000);
    act(f);
    const time = f.player.getState().time;
    f.observer.show(false);
    f.observer.show(true);
    f.doc.hidden = true;
    f.doc.emit("visibilitychange");
    f.doc.hidden = false;
    f.doc.emit("visibilitychange");
    f.advance(60000);
    assert.equal(f.player.getState().playing, false);
    assert.equal(f.player.getState().time, time);
    assert.equal(f.frames.size, 0);
  }
});

test("autoplay does not resume after being paused by offscreen or background transitions", () => {
  for (const background of [false, true]) {
    const f = fixture({ autoplay: true });
    f.observer.show(true);
    f.advance(2000);
    if (background) { f.doc.hidden = true; f.doc.emit("visibilitychange"); }
    else f.observer.show(false);
    f.advance(60000);
    if (background) { f.doc.hidden = false; f.doc.emit("visibilitychange"); }
    else f.observer.show(true);
    assert.equal(f.player.getState().playing, false);
    assert.equal(f.player.getState().time, 2);
    assert.equal(f.frames.size, 0);
    f.controls.play.emit("click");
    f.advance(1000);
    assert.equal(f.player.getState().time, 3);
  }
});

test("reduced motion blocks autoplay but still allows explicit playback", () => {
  for (const observe of [true, false]) {
    const f = fixture({ autoplay: true }, { reduced: true, observer: observe });
    f.observer?.show(true);
    assert.equal(f.player.getState().playing, false);
    assert.equal(f.frames.size, 0);
    f.setReducedMotion(false);
    f.observer?.show(true);
    f.doc.emit("visibilitychange");
    assert.equal(f.player.getState().playing, false);
    f.setReducedMotion(true);
    f.controls.play.emit("click");
    assert.equal(f.player.getState().playing, true);
    f.advance(1000);
    assert.equal(f.player.getState().time, 1);
  }
});

test("turning reduced motion on cancels pending autoplay or pauses active playback", () => {
  const pending = fixture({ autoplay: true });
  pending.setReducedMotion(true);
  pending.setReducedMotion(false);
  pending.observer.show(true);
  assert.equal(pending.player.getState().playing, false);
  assert.equal(pending.frames.size, 0);
  const active = fixture({ autoplay: true });
  active.observer.show(true);
  active.advance(2000);
  active.setReducedMotion(true);
  assert.equal(active.player.getState().playing, false);
  assert.equal(active.player.getState().time, 2);
  assert.equal(active.frames.size, 0);
  active.setReducedMotion(false);
  active.observer.show(true);
  assert.equal(active.player.getState().playing, false);
  active.controls.play.emit("click");
  assert.equal(active.player.getState().playing, true);
});

test("an explicitly configured film can autoplay under reduced motion without changing other players", () => {
  const film = fixture({ autoplay: true, respectReducedMotion: false }, { reduced: true });
  const other = fixture({ autoplay: true }, { reduced: true });
  film.observer.show(true);
  other.observer.show(true);
  assert.equal(film.player.getState().playing, true);
  assert.equal(other.player.getState().playing, false);
  film.advance(1500);
  film.setReducedMotion(false);
  film.setReducedMotion(true);
  assert.equal(film.player.getState().playing, true);
  assert.equal(film.frames.size, 1);
  film.controls.play.emit("click");
  film.observer.show(true);
  assert.equal(film.player.getState().playing, false, "the exception never overrides manual pause");
});

test("destroy cancels pending autoplay and removes motion listeners as well as visibility listeners", () => {
  for (const start of [false, true]) {
    const f = fixture({ autoplay: true });
    if (start) { f.observer.show(true); f.advance(1000); }
    const count = f.rendered.length;
    f.player.destroy();
    assert.equal(f.frames.size, 0);
    assert.equal(f.observer.disconnected, true);
    assert.equal([...f.motion.listeners.values()].every(handlers => handlers.size === 0), true);
    assert.equal([...f.doc.listeners.values()].every(handlers => handlers.size === 0), true);
    f.observer.show(true);
    f.setReducedMotion(true);
    f.setReducedMotion(false);
    f.doc.emit("visibilitychange");
    f.controls.play.emit("click");
    f.advance(30000);
    assert.equal(f.player.getState().playing, false);
    assert.equal(f.rendered.length, count);
    assert.equal(f.frames.size, 0);
  }
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
