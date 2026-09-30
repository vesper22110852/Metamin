/** A user-started, non-looping timeline. `platform` is injectable for deterministic tests. */
export function mountSummaryPlayer(root, { duration = 20, render, onChapter, platform = {} } = {}) {
  if (!root?.querySelector || typeof render !== "function") throw new TypeError("A player root and render function are required.");
  if (!Number.isFinite(duration) || duration <= 0) throw new RangeError("Duration must be a positive finite number.");

  const doc = root.ownerDocument;
  const win = doc.defaultView ?? globalThis;
  const now = platform.now ?? (() => win.performance.now());
  const requestFrame = platform.requestAnimationFrame ?? win.requestAnimationFrame.bind(win);
  const cancelFrame = platform.cancelAnimationFrame ?? win.cancelAnimationFrame.bind(win);
  const Observer = Object.hasOwn(platform, "IntersectionObserver") ? platform.IntersectionObserver : win.IntersectionObserver;
  const playButton = root.querySelector("[data-summary-play]");
  const replayButton = root.querySelector("[data-summary-replay]");
  const seekInput = root.querySelector("[data-summary-seek]");
  const timeOutput = root.querySelector("[data-summary-time]");
  const status = root.querySelector("[data-summary-status]");
  if (!playButton || !seekInput) throw new TypeError("Play and seek controls are required.");

  const state = { time: 0, playing: false, visible: true, destroyed: false };
  const listeners = [];
  let frame = null;
  let startedAt = 0;
  let startedFrom = 0;
  const clock = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  const clamp = value => Number.isNaN(Number(value)) ? 0 : Math.min(duration, Math.max(0, Number(value)));
  const getState = () => ({ ...state, duration, ended: state.time >= duration });
  const announce = text => { if (status) status.textContent = text; };
  function listen(target, event, handler) {
    target?.addEventListener(event, handler);
    if (target) listeners.push(() => target.removeEventListener(event, handler));
  }
  function cancel() {
    if (frame !== null) cancelFrame(frame);
    frame = null;
  }
  function update() {
    root.dataset.playing = String(state.playing);
    playButton.textContent = state.playing ? "Pause summary" : state.time >= duration ? "Replay summary" : state.time > 0 ? "Resume summary" : `Play ${duration}-second summary`;
    playButton.setAttribute("aria-pressed", String(state.playing));
    seekInput.value = String(state.time);
    seekInput.setAttribute("aria-valuetext", `${state.time.toFixed(1)} of ${duration} seconds`);
    if (timeOutput) timeOutput.textContent = `${clock(state.time)} / ${clock(duration)}`;
    render(state.time);
  }
  function finish() {
    state.time = duration;
    state.playing = false;
    cancel();
    update();
    announce("Summary complete. Replay or choose a chapter.");
  }
  function pause(message = "Summary paused.", syncTime = true) {
    if (state.destroyed || !state.playing) return;
    if (syncTime) state.time = clamp(startedFrom + (now() - startedAt) / 1000);
    state.playing = false;
    cancel();
    if (state.time >= duration) return finish();
    update();
    announce(message);
  }
  function tick() {
    frame = null;
    if (!state.playing || state.destroyed) return;
    if (doc.hidden || !state.visible) return pause("Summary paused while out of view.", false);
    // Use elapsed foreground wall time, not frame counts or capped frame deltas.
    state.time = clamp(startedFrom + (now() - startedAt) / 1000);
    if (state.time >= duration) return finish();
    update();
    frame = requestFrame(tick);
  }
  function play() {
    if (state.destroyed || state.playing) return;
    if (doc.hidden || !state.visible) return announce("Bring the summary into view, then press Play.");
    if (state.time >= duration) state.time = 0;
    startedFrom = state.time;
    startedAt = now();
    state.playing = true;
    update();
    announce("Playing summary.");
    frame = requestFrame(tick);
  }
  function seek(seconds) {
    if (state.destroyed) return;
    cancel();
    state.playing = false;
    state.time = clamp(seconds);
    update();
    announce(`Paused at ${clock(state.time)}.`);
  }
  function replay() { seek(0); play(); }

  seekInput.min = "0";
  seekInput.max = String(duration);
  seekInput.step = "0.05";
  if (!seekInput.getAttribute("aria-label")) seekInput.setAttribute("aria-label", "Summary position");
  if (timeOutput) timeOutput.setAttribute("aria-live", "off");
  if (status) { status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite"); status.setAttribute("aria-atomic", "true"); }
  listen(playButton, "click", () => state.playing ? pause() : play());
  listen(replayButton, "click", replay);
  listen(seekInput, "input", () => seek(seekInput.value));
  for (const button of root.querySelectorAll("[data-summary-chapter]")) {
    listen(button, "click", () => { seek(button.dataset.time); onChapter?.(state.time, button); });
  }
  listen(doc, "visibilitychange", () => {
    if (doc.hidden) pause("Summary paused while this page is hidden.", false);
  });
  const observer = Observer ? new Observer(entries => {
    const entry = entries.find(item => item.target === root);
    if (!entry || state.destroyed) return;
    state.visible = entry.isIntersecting;
    if (!state.visible) pause("Summary paused while out of view.", false);
  }) : null;
  observer?.observe(root);
  update();
  announce(`Summary ready. ${duration} seconds. Press Play to begin.`);

  return {
    play, pause, seek, getState,
    destroy() {
      if (state.destroyed) return;
      cancel();
      state.playing = false;
      state.destroyed = true;
      root.dataset.playing = "false";
      observer?.disconnect();
      listeners.forEach(remove => remove());
    }
  };
}
