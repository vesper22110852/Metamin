import { FOCUS, phaseAt, phaseColor, rayPoint, rayLength, markerDistances } from "./phase-model.mjs?v=1";

const canvas = document.querySelector("#wave-canvas");
const figure = document.querySelector(".wave-figure");
const controls = document.querySelector(".wave-controls");
const context = canvas?.getContext("2d");

// Keep the static SVG and navigation usable if canvas is unavailable.
if (context && figure && controls) {
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const motionButton = document.querySelector("#motion-toggle");
  const modeButtons = [...document.querySelectorAll("[data-wave-mode]")];
  let mode = "focus";
  let paused = motionPreference.matches;
  let inView = true;
  let animationId = 0;
  let previousFrame = 0;
  let elapsed = 1.4;
  let width = 0;
  let height = 0;
  let scale = 1;
  let ratio = 1;

  const cells = [];
  for (let row = -5; row <= 5; row++) {
    for (let column = -5; column <= 5; column++) {
      cells.push({ x: column * 0.225, y: row * 0.225 });
    }
  }
  cells.sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const rays = [];
  for (let row = -2; row <= 2; row++) {
    for (let column = -2; column <= 2; column++) {
      rays.push({ x: column * 0.51, y: row * 0.51 });
    }
  }

  function project(x, y, z = 0) {
    return [width * 0.49 + (x - y) * scale * 0.84, height * 0.70 + (x + y) * scale * 0.35 - z * scale * 0.82];
  }

  function path(points, close = false) {
    context.beginPath();
    points.forEach((point, index) => {
      const [x, y] = project(...point);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    if (close) context.closePath();
  }

  function surface() {
    const edge = 1.3;
    path([[-edge, -edge, -0.1], [edge, -edge, -0.1], [edge, edge, -0.1], [-edge, edge, -0.1]], true);
    context.fillStyle = "#151e2a";
    context.fill();
    context.strokeStyle = "#425365";
    context.lineWidth = 0.8;
    context.stroke();

    for (const { x, y } of cells) {
      const half = 0.101;
      const phase = phaseAt(x, y, mode);
      path([[x - half, y - half, 0], [x + half, y - half, 0], [x + half, y + half, 0], [x - half, y + half, 0]], true);
      context.fillStyle = phaseColor(phase, 58, 0.78);
      context.fill();
      context.strokeStyle = phaseColor(phase, 76, 0.5);
      context.lineWidth = 0.65;
      context.stroke();
    }

    const [x, y] = project(-edge, edge, 0);
    if (x > 105 && width >= 500) {
      context.strokeStyle = "#65788b";
      context.beginPath();
      context.moveTo(x - 5, y);
      context.lineTo(x - 32, y + 17);
      context.lineTo(x - 91, y + 17);
      context.stroke();
      context.fillStyle = "#a8b8c7";
      context.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      context.fillText("Phase mask", x - 93, y + 36);
    }
  }

  function beam() {
    for (const { x, y } of rays) {
      const length = rayLength(x, y, mode);
      const start = rayPoint(x, y, 0, mode);
      const end = rayPoint(x, y, length, mode);
      path([start, end]);
      context.strokeStyle = "rgba(157, 217, 224, 0.18)";
      context.lineWidth = 0.85;
      context.stroke();

      for (const distance of markerDistances(x, y, mode, elapsed)) {
        const opacity = Math.min(1, distance / 0.14, (length - distance) / 0.14);
        path([rayPoint(x, y, Math.max(0, distance - 0.12), mode), rayPoint(x, y, distance, mode)]);
        context.strokeStyle = `rgba(178, 236, 234, ${opacity * 0.7})`;
        context.lineWidth = 1.35;
        context.stroke();
      }
    }
  }

  function target() {
    const position = mode === "focus" ? project(0, 0, FOCUS) : project(...rayPoint(0, 0, 3.45, mode));
    const [x, y] = position;
    const label = mode === "focus" ? "Target focus" : "Steered beam";
    context.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    const toRight = x + 34 + context.measureText(label).width < width - 12;
    const side = toRight ? 1 : -1;
    context.strokeStyle = "#a8c9ce";
    context.lineWidth = 0.8;
    context.beginPath();
    context.moveTo(x - 4, y);
    context.lineTo(x + 4, y);
    context.moveTo(x, y - 4);
    context.lineTo(x, y + 4);
    context.moveTo(x + side * 11, y);
    context.lineTo(x + side * 28, y);
    context.stroke();
    context.fillStyle = "#b8cbd5";
    context.textAlign = toRight ? "left" : "right";
    context.fillText(label, x + side * 34, y + 4);
    context.textAlign = "left";
  }

  function draw() {
    if (!width || !height) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    // A quiet field behind the schematic, not a computed intensity distribution.
    const field = context.createRadialGradient(width * 0.52, height * 0.53, 0, width * 0.52, height * 0.53, width * 0.5);
    field.addColorStop(0, "rgba(48, 76, 105, 0.13)");
    field.addColorStop(1, "rgba(11, 17, 24, 0)");
    context.fillStyle = field;
    context.fillRect(0, 0, width, height);
    surface();
    beam();
    target();
  }

  function shouldAnimate() {
    return !paused && inView && !document.hidden;
  }

  function frame(now) {
    animationId = 0;
    if (!shouldAnimate()) return;
    if (!previousFrame) previousFrame = now;
    const delta = now - previousFrame;
    // Limit to ~30 fps and never jump forward after a hidden/background interval.
    if (delta >= 32) {
      elapsed += Math.min(delta / 1000, 0.07);
      previousFrame = now;
      draw();
    }
    animationId = requestAnimationFrame(frame);
  }

  function syncMotion() {
    cancelAnimationFrame(animationId);
    previousFrame = 0;
    draw();
    if (shouldAnimate()) animationId = requestAnimationFrame(frame);
  }

  function syncButton() {
    motionButton.querySelector("[data-motion-label]").textContent = paused ? "Play motion" : "Pause motion";
    motionButton.querySelector(".motion-symbol").textContent = paused ? "▷" : "Ⅱ";
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    scale = Math.min(width * 0.16, height * 0.2);
    draw();
  }

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      mode = button.dataset.waveMode;
      modeButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      canvas.setAttribute("aria-label", mode === "focus"
        ? "Ideal focusing phase mask: phase-colored cells and straight rays converging at a target focus."
        : "Ideal steering phase mask: a linear phase gradient and parallel rays leaving at an angle.");
      draw();
    });
  });
  motionButton.addEventListener("click", () => {
    paused = !paused;
    syncButton();
    syncMotion();
  });
  motionPreference.addEventListener("change", (event) => {
    paused = event.matches;
    syncButton();
    syncMotion();
  });
  document.addEventListener("visibilitychange", syncMotion);
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncMotion();
  }, { threshold: 0.05 }).observe(figure);

  resize();
  syncButton();
  figure.classList.add("is-ready");
  controls.hidden = false;
  syncMotion();
}
