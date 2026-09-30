import { COMPONENT_DESCRIPTIONS, createBlackholeSVG } from "./blackhole-scene.mjs?v=11";

const demo = document.getElementById("blackhole-demo");
if (demo) {
  const stage = document.getElementById("blackhole-stage");
  const description = document.getElementById("component-description");
  const motionButton = document.getElementById("motion-toggle");
  const focusButtons = [...demo.querySelectorAll("[data-focus-value]")];
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compactPreference = window.matchMedia("(max-width: 640px)");
  const state = { focus: "all", animate: !motionPreference.matches, started: !motionPreference.matches, visible: true, compactView: compactPreference.matches };

  function updateMotion() {
    const playing = state.animate && state.visible && !document.hidden;
    if (state.animate) state.started = true;
    demo.dataset.playing = String(playing);
    const svg = stage.querySelector("svg");
    if (svg) {
      svg.dataset.animated = String(state.started);
      svg.dataset.playing = String(playing);
    }
    motionButton.setAttribute("aria-pressed", String(state.animate));
    motionButton.textContent = state.animate ? "Pause animation" : "Play animation";
  }

  function render() {
    stage.innerHTML = createBlackholeSVG({ focus: state.focus, compactView: state.compactView });
    demo.dataset.focus = state.focus;
    description.textContent = COMPONENT_DESCRIPTIONS[state.focus];
    focusButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.focusValue === state.focus)));
    updateMotion();
  }

  focusButtons.forEach(button => button.addEventListener("click", () => {
    state.focus = button.dataset.focusValue;
    render();
  }));
  motionButton.addEventListener("click", () => {
    state.animate = !state.animate;
    updateMotion();
  });
  document.addEventListener("visibilitychange", updateMotion);
  compactPreference.addEventListener("change", event => {
    state.compactView = event.matches;
    render();
  });
  motionPreference.addEventListener("change", event => {
    // A newly enabled reduced-motion preference always takes effect immediately.
    if (event.matches) state.animate = false;
    updateMotion();
  });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      state.visible = entries.some(entry => entry.isIntersecting);
      updateMotion();
    });
    observer.observe(stage);
  }

  render();
  demo.querySelectorAll("[data-demo-controls]").forEach(controls => { controls.hidden = false; });
}
