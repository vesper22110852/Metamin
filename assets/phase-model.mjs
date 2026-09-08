// Ideal scalar phase mask. Coordinates use arbitrary, consistent length units.
// Convention: Re{E exp(-i omega t)}, normal incidence, propagation into +z.
// This is an analytic illustration, not an electromagnetic solver or device model.
export const TAU = 2 * Math.PI;
export const WAVELENGTH = 0.72;
export const FOCUS = 3.2;
export const STEERING_ANGLE = 25 * Math.PI / 180;
const K = TAU / WAVELENGTH;

export function wrapPhase(phase) {
  return ((phase % TAU) + TAU) % TAU;
}

export function phaseAt(x, y, mode) {
  if (mode === "steer") return K * x * Math.sin(STEERING_ANGLE);
  return -K * (Math.hypot(x, y, FOCUS) - FOCUS);
}

export function rayDirection(x, y, mode) {
  if (mode === "steer") return [Math.sin(STEERING_ANGLE), 0, Math.cos(STEERING_ANGLE)];
  const distance = Math.hypot(x, y, FOCUS);
  return [-x / distance, -y / distance, FOCUS / distance];
}

export function rayPoint(x, y, distance, mode) {
  const [dx, dy, dz] = rayDirection(x, y, mode);
  return [x + dx * distance, y + dy * distance, dz * distance];
}

export function rayLength(x, y, mode) {
  return mode === "steer" ? 3.45 : Math.hypot(x, y, FOCUS) + 0.38;
}

// Moving markers satisfy phi + k*s - omega*t = 2*pi*m. They indicate phase,
// not intensity or particles. Surface colors remain static while time advances.
export function markerDistances(x, y, mode, time) {
  const first = wrapPhase(time * 1.8 - phaseAt(x, y, mode)) / K;
  const distances = [];
  const end = rayLength(x, y, mode);
  for (let distance = first; distance < end; distance += WAVELENGTH) distances.push(distance);
  return distances;
}

export function phaseColor(phase, lightness = 64, alpha = 1) {
  const hue = (195 + 360 * wrapPhase(phase) / TAU) % 360;
  return `hsla(${hue}, 58%, ${lightness}%, ${alpha})`;
}
