import test from "node:test";
import assert from "node:assert/strict";
import { FOCUS, TAU, WAVELENGTH, STEERING_ANGLE, phaseAt, wrapPhase, rayDirection, rayPoint, rayLength, markerDistances, phaseColor } from "../assets/phase-model.mjs";

const near = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≠ ${b}`);

test("focus profile has equal phase at the target, for every sampled mask position", () => {
  const k = TAU / WAVELENGTH;
  for (let x = -1.2; x <= 1.2; x += 0.12) {
    for (let y = -1.2; y <= 1.2; y += 0.12) {
      const length = Math.hypot(x, y, FOCUS);
      near(phaseAt(x, y, "focus") + k * length, k * FOCUS);
      const position = rayPoint(x, y, length, "focus");
      near(position[0], 0); near(position[1], 0); near(position[2], FOCUS);
      near(Math.hypot(...rayDirection(x, y, "focus")), 1);
    }
  }
});

test("steering has a linear gradient and a common normalized output direction", () => {
  const k = TAU / WAVELENGTH;
  const direction = rayDirection(1.2, -0.8, "steer");
  assert.deepEqual(direction, rayDirection(-1.2, 0.8, "steer"));
  near(Math.hypot(...direction), 1);
  near(phaseAt(0.6, 1, "steer") - phaseAt(0.2, -1, "steer"), k * 0.4 * Math.sin(STEERING_ANGLE));
});

test("traveling marks represent constant phase and remain on the visible rays", () => {
  const k = TAU / WAVELENGTH;
  for (const mode of ["focus", "steer"]) {
    for (const time of [0, 0.1, 1.4, 10, 240]) {
      for (const [x, y] of [[0, 0], [-1.02, 1.02], [1.02, -0.51]]) {
        const distances = markerDistances(x, y, mode, time);
        assert.ok(distances.length > 0);
        for (const distance of distances) {
          assert.ok(distance >= 0 && distance < rayLength(x, y, mode));
          const value = wrapPhase(phaseAt(x, y, mode) + k * distance - 1.8 * time);
          near(Math.min(value, TAU - value), 0);
        }
      }
    }
  }
});

test("phase wrapping and colors are cyclic", () => {
  near(wrapPhase(-TAU / 4), TAU * 0.75);
  assert.equal(phaseColor(0), phaseColor(TAU));
  near(wrapPhase(7 * TAU), 0);
});
