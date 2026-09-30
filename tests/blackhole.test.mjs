import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COMPONENT_DESCRIPTIONS, SCENE_GEOMETRY, SUBPIXELS, WAVEFRONTS, CAVITY_STOPS, OLED_LAYERS, cavityArrowAt, createBlackholeSVG, projectPoint } from "../assets/blackhole-scene.mjs";

const read = relative => readFileSync(new URL(relative, import.meta.url), "utf8");
let controllerImport = 0;

function element() {
  return {
    attributes: {}, listeners: {}, dataset: {}, hidden: true, textContent: "",
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(key, listener) { this.listeners[key] = listener; }
  };
}

function environment(t, { reducedMotion = false, compactView = false, withObserver = true, noDemo = false, initiallyHidden = false } = {}) {
  const original = new Map(["document", "window", "IntersectionObserver"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => {
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });

  const demo = element(), stage = element(), description = element(), motion = element(), controls = element();
  const focus = Object.fromEntries(Object.keys(COMPONENT_DESCRIPTIONS).map(key => {
    const button = element();
    button.dataset.focusValue = key;
    return [key, button];
  }));
  let markup = "", svg = null, renderCount = 0;
  Object.defineProperty(stage, "innerHTML", {
    get: () => markup,
    set(value) {
      markup = value;
      renderCount++;
      // Only the root dataset/query behavior needed by the controller is mocked.
      svg = element();
      svg.dataset.focus = value.match(/data-focus="([^"]+)"/)[1];
      svg.dataset.playing = value.match(/data-playing="([^"]+)"/)[1];
      svg.dataset.animated = value.match(/data-animated="([^"]+)"/)?.[1] ?? "false";
    }
  });
  stage.querySelector = selector => selector === "svg" ? svg : null;
  demo.querySelectorAll = selector => {
    if (selector === "[data-focus-value]") return Object.values(focus);
    if (selector === "[data-demo-controls]") return [controls];
    return [];
  };
  const elements = {
    "blackhole-demo": noDemo ? null : demo,
    "blackhole-stage": stage,
    "component-description": description,
    "motion-toggle": motion
  };
  const documentListeners = {};
  const mockDocument = {
    hidden: initiallyHidden,
    getElementById: id => elements[id] ?? null,
    addEventListener(key, listener) { documentListeners[key] = listener; }
  };
  const preference = {
    matches: reducedMotion,
    addEventListener(key, listener) { this.listeners[key] = listener; },
    listeners: {}
  };
  const viewport = {
    matches: compactView,
    addEventListener(key, listener) { this.listeners[key] = listener; },
    listeners: {}
  };
  let intersectionCallback, observed;
  class MockIntersectionObserver {
    constructor(callback) { intersectionCallback = callback; }
    observe(target) { observed = target; }
  }
  globalThis.document = mockDocument;
  globalThis.window = {
    matchMedia(query) {
      if (query === "(prefers-reduced-motion: reduce)") return preference;
      if (query === "(max-width: 640px)") return viewport;
      assert.fail(`Unexpected media query: ${query}`);
    },
    ...(withObserver ? { IntersectionObserver: MockIntersectionObserver } : {})
  };
  if (withObserver) globalThis.IntersectionObserver = MockIntersectionObserver;
  else delete globalThis.IntersectionObserver;

  return {
    demo, stage, description, motion, controls, focus,
    get svg() { return svg; },
    get renderCount() { return renderCount; },
    get observed() { return observed; },
    async start() { await import(`../assets/blackhole.js?blackhole-test=${++controllerImport}`); },
    clickFocus(key) { focus[key].listeners.click(); },
    toggleMotion() { motion.listeners.click(); },
    tabVisible(visible) { mockDocument.hidden = !visible; documentListeners.visibilitychange(); },
    inView(visible) { intersectionCallback([{ target: stage, isIntersecting: visible }]); },
    reducedMotion(matches) { preference.matches = matches; preference.listeners.change({ matches }); },
    compactScreen(matches) { viewport.matches = matches; viewport.listeners.change({ matches }); }
  };
}

test("scene exposes the four supported component views and rejects unknown focus", () => {
  assert.deepEqual(Object.keys(COMPONENT_DESCRIPTIONS), ["all", "oled", "mirrors", "absorbers"]);
  assert.ok(Object.isFrozen(COMPONENT_DESCRIPTIONS));
  for (const focus of Object.keys(COMPONENT_DESCRIPTIONS)) {
    for (const compactView of [true, false]) {
      for (const playing of [true, false]) {
        const svg = createBlackholeSVG({ focus, compactView, playing });
        assert.match(svg, new RegExp(`data-focus="${focus}"`));
        assert.match(svg, new RegExp(`data-playing="${playing}"`));
        assert.match(svg, new RegExp(`data-compact="${compactView}"`));
        assert.doesNotMatch(svg, /NaN|Infinity|undefined/);
      }
    }
  }
  assert.throws(() => createBlackholeSVG({ focus: "other" }), RangeError);
  assert.throws(() => createBlackholeSVG({ focus: "__proto__" }), RangeError);
});

test("scene default is deterministic, paused and identical to the no-JavaScript fallback", () => {
  const expected = createBlackholeSVG();
  assert.equal(createBlackholeSVG(), expected);
  assert.equal(read("../assets/blackhole-concept.svg").trim(), expected.trim());
  assert.match(expected, /data-focus="all" data-playing="false"/);
  assert.match(expected, /role="img" aria-labelledby="bh-title bh-desc"/);
  assert.match(expected, /<title id="bh-title">/);
  assert.match(expected, /<desc id="bh-desc">/);
});

function viewBox(svg) {
  return svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
}

function assertInViewBox(svg, x, y, label) {
  const [left, top, width, height] = viewBox(svg);
  assert.ok(x >= left && x <= left + width, `${label}: x=${x} is outside the viewBox`);
  assert.ok(y >= top && y <= top + height, `${label}: y=${y} is outside the viewBox`);
}

test("illustrative device geometry keeps twelve centered 3 by 3 RGB arrays", () => {
  assert.equal(SUBPIXELS.length, 12);
  assert.equal(new Set(SUBPIXELS.map(cell => `${cell.row}-${cell.col}`)).size, 12);
  for (const cell of SUBPIXELS) {
    assert.ok(cell.row >= 0 && cell.row < 3);
    assert.ok(cell.col >= 0 && cell.col < 4);
    assert.equal(cell.x, cell.col + .5);
    assert.equal(cell.y, cell.row + .5);
    assert.ok(["r", "g", "b"].includes(cell.channel));
  }
  const svg = createBlackholeSVG();
  for (const channel of ["r", "g", "b"]) {
    const expected = SUBPIXELS.filter(cell => cell.channel === channel).length * 9;
    const actual = (svg.match(new RegExp(`<use href="#bh-pillar-${channel}"`, "g")) ?? []).length;
    assert.equal(actual, expected, `${channel}: exactly nine pillars per cell with no peripheral shape key`);
  }
  const pillars = [...svg.matchAll(/<use href="#bh-pillar-([rgb])" transform="translate\(([\d.-]+),([\d.-]+)\)"[^>]*data-cell="([\d-]+)"[^>]*\/>/g)];
  assert.equal(pillars.length, 108);
  SUBPIXELS.forEach(cell => {
    const cellPillars = pillars.filter(pillar => pillar[4] === `${cell.row}-${cell.col}`);
    assert.equal(cellPillars.length, 9, "each subpixel retains its complete 3 by 3 array after depth sorting");
    assert.ok(cellPillars.every(([, channel]) => channel === cell.channel));
    const meanX = cellPillars.reduce((sum, pillar) => sum + Number(pillar[2]), 0) / 9;
    const meanY = cellPillars.reduce((sum, pillar) => sum + Number(pillar[3]), 0) / 9;
    const center = projectPoint(cell.x, cell.y, 1);
    assert.ok(Math.abs(meanX - center.x) < .01, "pillar array must be centered on the output axis");
    assert.ok(Math.abs(meanY - center.y) < .01, "pillar array must be centered on the output axis");
  });
  const boundaryElements = (svg.match(/<use href="#bh-ring-disk"/g) ?? []).length;
  assert.equal(boundaryElements, 144);
  for (const framedScene of [svg, createBlackholeSVG({ compactView: true })]) {
    for (const [, points] of framedScene.matchAll(/<polygon points="([^"]+)"/g)) {
      for (const point of points.split(" ")) {
        const [x, y] = point.split(",").map(Number);
        assertInViewBox(framedScene, x, y, "device polygon");
      }
    }
  }
});

test("the twelve subpixels form a cropped, repeating RGGB Bayer pattern", () => {
  const tile = [["r", "g"], ["g", "b"]];
  assert.equal(SUBPIXELS.length, 12, "Bayer ordering preserves the existing four-column, three-row device");
  for (const { row, col, channel } of SUBPIXELS) {
    assert.equal(channel, tile[row % 2][col % 2], `row ${row}, column ${col} must repeat the RG/GB tile`);
  }
  for (let row = 0; row < 3; row++) {
    assert.deepEqual(SUBPIXELS.filter(cell => cell.row === row).map(cell => cell.col).sort(), [0, 1, 2, 3]);
  }
});

test("volumetric RGB beams emerge above the OLED stack on all twelve subpixel axes", () => {
  const round = value => Number(value.toFixed(2));
  for (const compactView of [false, true]) {
    const svg = createBlackholeSVG({ compactView });
    const outputs = [...svg.matchAll(/<g class="bh-motion bh-output"([^>]*)>/g)];
    assert.equal(outputs.length, SUBPIXELS.length);
    const seen = new Set();
    for (const [, attrs] of outputs) {
      const cellId = attrs.match(/data-cell="([^"]+)"/)[1];
      const cell = SUBPIXELS.find(cell => String(cell.row) + "-" + cell.col === cellId);
      assert.ok(cell);
      assert.ok(!seen.has(cellId));
      seen.add(cellId);
      assert.equal(attrs.match(/data-channel="([^"]+)"/)[1], cell.channel);
      const origin = projectPoint(cell.x, cell.y, SCENE_GEOMETRY.outputPlane);
      const tip = projectPoint(cell.x, cell.y, SCENE_GEOMETRY.outputPlane + SCENE_GEOMETRY.beamLength);
      assert.deepEqual(attrs.match(/data-origin="([^"]+)"/)[1].split(",").map(Number), [round(origin.x), round(origin.y)]);
      assert.deepEqual(attrs.match(/data-tip="([^"]+)"/)[1].split(",").map(Number), [round(tip.x), round(tip.y)]);
      for (const x of [tip.x - 25, tip.x + 25]) assertInViewBox(svg, x, tip.y - 10, cellId);
      assert.ok(tip.y < origin.y);
    }
    assert.equal((svg.match(/class="bh-beam-body"/g) || []).length, 12);
    assert.equal((svg.match(/class="bh-beam-cap"/g) || []).length, 12);
    assert.doesNotMatch(svg, /bh-branch|bh-radial-ray|bh-reflection/);
    assert.equal(SCENE_GEOMETRY.outputPlane, OLED_LAYERS.at(-1).top,
      "beam origin is the upper surface, not an artificial lower cylinder");
  }
});

test("three translucent wavefronts remain superimposed while fixed boundaries dim", () => {
  const svg = createBlackholeSVG({ animated: true });
  const fronts = [...svg.matchAll(/<g class="bh-motion bh-wavefront"([^>]*)>\s*<g mask="url\(#bh-wave-envelope-\d\)">([\s\S]*?)<\/g>/g)];
  assert.equal(fronts.length, 3);
  for (const [, attrs, body] of fronts) {
    assert.equal(Number(attrs.match(/data-start-plane="([^"]+)"/)[1]), SCENE_GEOMETRY.whiteEmissionPlanes[0]);
    assert.equal(Number(attrs.match(/data-end-plane="([^"]+)"/)[1]), SCENE_GEOMETRY.bottomPlane);
    assert.equal(Number(attrs.match(/--wave-distance:([\d.]+)px/)[1]), SCENE_GEOMETRY.whiteEmissionPlanes[0] - SCENE_GEOMETRY.bottomPlane);
    const boundary = body.match(/<polygon points="([^"]+)" class="bh-wave-surface" fill="#ffffff"/);
    assert.ok(boundary);
    const fullFront = [[0,0],[4,0],[4,3],[0,3]].map(([x,y]) => {
      const p = projectPoint(x,y,SCENE_GEOMETRY.whiteEmissionPlanes[0]);
      return [p.x,p.y];
    });
    assert.deepEqual(boundary[1].split(' ').map(p => p.split(',').map(Number)), fullFront);
    assert.doesNotMatch(body, /animation-delay|bh-wave-curve|bh-wave-ribbon/);
  }
  const masks = [...svg.matchAll(/<mask id="bh-wave-envelope-\d"[^>]*>([\s\S]*?)<\/mask>/g)];
  assert.equal(masks.length, 3);
  const sourceCorners = [[0, 0], [4, 0], [4, 3], [0, 3]].map(([x, y]) =>
    projectPoint(x, y, SCENE_GEOMETRY.whiteEmissionPlanes[0]));
  for (const [mask] of masks) {
    const attrs = mask.slice(0, mask.indexOf(">"));
    const bounds = Object.fromEntries(["x", "y", "width", "height"].map(name =>
      [name, Number(attrs.match(new RegExp(`\\b${name}="([^"]+)"`))[1])]));
    assert.ok(bounds.width > 0 && bounds.height > 0);
    for (const { x, y } of sourceCorners) {
      assert.ok(x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height,
        "wave mask bounds must contain the complete source plane after changing the stack height or projection");
    }
  }
  const contours = masks.map(([, mask]) => mask.match(/class="bh-motion bh-boundary-cut"[^>]* d="([^"]+)"[^>]*fill-rule="evenodd"/)[1]);
  assert.ok(contours.every(contour => contour === contours[0]));
  assert.equal((contours[0].match(/M/g) || []).length, 13, "one full outline minus twelve exact fixed-size square apertures");
  assert.doesNotMatch(masks.map(m=>m[1]).join(''), /scale|gradient|filter/i, "opacity-only absorption cannot move or soften inward across the square edges");
  WAVEFRONTS.forEach(({start,arrival},i) => {
    assert.ok(start < arrival);
    if(i) assert.ok(arrival > WAVEFRONTS[i-1].arrival);
    const retained = svg.match(new RegExp(`@keyframes bh-wave-${i} \\{[\\s\\S]*?${arrival}%,(\\d+)%\\{opacity:([\\d.]+);transform:translateY\\(var\\(--wave-distance\\)\\)`));
    assert.ok(retained, "each wavefront remains at the surface after arrival");
    assert.ok(Number(retained[1]) > WAVEFRONTS.at(-1).arrival);
    assert.ok(Number(retained[2]) > .2 && Number(retained[2]) < .6);
  });
  assert.ok(SCENE_GEOMETRY.boundaryFade > WAVEFRONTS.at(-1).arrival);
  assert.doesNotMatch(svg, /bh-wave-apertures|bh-color-selection|bh-boundary-fade/);
});

test("cavity arrows make three round trips before feeding the upper RGB output", () => {
  const svg = createBlackholeSVG({ animated: true });
  assert.equal((svg.match(/class="bh-cavity-cell"/g) || []).length, 12);
  assert.equal((svg.match(/class="[^"]*\bbh-cavity-arrow\b[^"]*"/g) || []).length, 12);
  assert.equal((svg.match(/<path[^>]*class="[^"]*\bbh-cavity-path\b[^"]*"/g) || []).length, 24);
  assert.doesNotMatch(svg, /bh-cavity-packet|bh-cavity-white-front|bh-cavity-color-front|bh-resonance-band/,
    "moving square wave packets are replaced with directed cavity paths");
  assert.ok(CAVITY_STOPS[0].time > SCENE_GEOMETRY.boundaryFade);
  for(let i=0;i<7;i++) {
    assert.equal(CAVITY_STOPS[i].plane, i%2 ? SCENE_GEOMETRY.cavityUpperPlane : SCENE_GEOMETRY.bottomPlane);
    if(i) assert.ok(CAVITY_STOPS[i].time > CAVITY_STOPS[i-1].time);
  }
  assert.equal(CAVITY_STOPS.at(-1).plane, SCENE_GEOMETRY.outputPlane);
  assert.equal(CAVITY_STOPS.at(-1).time, SCENE_GEOMETRY.beamStart, "upper emission starts when the final upward path reaches the stack surface");
  assert.ok(SCENE_GEOMETRY.colorStart >= CAVITY_STOPS[2].time, "selected color builds over repeated round trips");
  assert.ok(SCENE_GEOMETRY.colorFull <= SCENE_GEOMETRY.beamStart);
  for(const [, attrs] of svg.matchAll(/<g class="bh-cavity-cell"([^>]*)>/g)) {
    const id = attrs.match(/data-cell="([^"]+)"/)[1];
    const cell = SUBPIXELS.find(cell => `${cell.row}-${cell.col}` === id);
    assert.ok(cell);
    assert.equal(attrs.match(/data-channel="([^"]+)"/)[1],cell.channel);
    assert.equal(Number(attrs.match(/data-exit-plane="([^"]+)"/)[1]),SCENE_GEOMETRY.outputPlane);
  }
});

test("cavity arrows follow continuous tangents through reflections and the final upward exit", () => {
  const height = SCENE_GEOMETRY.cavityUpperPlane - SCENE_GEOMETRY.bottomPlane;
  const start = CAVITY_STOPS[0].time;
  const end = CAVITY_STOPS.at(-1).time;
  for (const { time, plane } of CAVITY_STOPS) {
    const pose = cavityArrowAt(time);
    assert.ok(Math.abs(pose.x) < .001, `phase ${time}: reflection remains on the cell center axis`);
    assert.ok(Math.abs(pose.y - (SCENE_GEOMETRY.bottomPlane - plane)) < .001,
      `phase ${time}: arrow reaches the specified optical interface`);
  }
  const epsilon = .0001;
  for (let phase = start; phase <= end; phase += .125) {
    const pose = cavityArrowAt(phase);
    assert.ok([pose.x, pose.y, pose.angle].every(Number.isFinite));
    assert.ok(pose.y >= -height - .001 && pose.y <= .001, "ray stays inside the cavity until output");
    const before = cavityArrowAt(Math.max(start, phase - epsilon));
    const after = cavityArrowAt(Math.min(end, phase + epsilon));
    const dx = after.x - before.x, dy = after.y - before.y;
    const distance = Math.hypot(dx, dy);
    assert.ok(distance > 0, `phase ${phase}: arrow motion must have a well-defined tangent`);
    const radians = pose.angle * Math.PI / 180;
    const aligned = (Math.cos(radians) * dx + Math.sin(radians) * dy) / distance;
    assert.ok(aligned > .999, `phase ${phase}: arrowhead must point along travel, not across or backward`);
  }
  for (const { time } of CAVITY_STOPS.slice(1, -1)) {
    const before = cavityArrowAt(time - epsilon);
    const after = cavityArrowAt(time + epsilon);
    assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < .1,
      `phase ${time}: position is continuous at reflection`);
    assert.ok(Math.abs(after.angle - before.angle) < .1,
      `phase ${time}: unwrapped angle prevents a sudden full spin at reflection`);
  }
  assert.deepEqual(cavityArrowAt(start - 1), cavityArrowAt(start));
  assert.deepEqual(cavityArrowAt(end + 1), cavityArrowAt(end));
  const exitAngle = cavityArrowAt(end).angle * Math.PI / 180;
  assert.ok(Math.sin(exitAngle) < -.999, "the final arrow feeds the vertical top-emission beam");
});

test("the expanded gap exposes both round-trip arrow midpoints beneath the opaque upper slab", () => {
  const underside = OLED_LAYERS[0].bottom;
  const frontEdges = [[[0, 3], [4, 3]], [[4, 3], [4, 0]]].map(edge =>
    edge.map(([x, y]) => projectPoint(x, y, underside)));
  const phases = [
    (CAVITY_STOPS[0].time + CAVITY_STOPS[1].time) / 2,
    (CAVITY_STOPS[1].time + CAVITY_STOPS[2].time) / 2
  ];
  const frames = [createBlackholeSVG(), createBlackholeSVG({ compactView: true })];
  for (const cell of SUBPIXELS) {
    const origin = projectPoint(cell.x, cell.y, SCENE_GEOMETRY.bottomPlane);
    for (const phase of phases) {
      const pose = cavityArrowAt(phase);
      const x = origin.x + pose.x, y = origin.y + pose.y;
      const edgesAtX = frontEdges.filter(([a, b]) => x >= Math.min(a.x, b.x) && x <= Math.max(a.x, b.x));
      assert.ok(edgesAtX.length, "arrow midpoint remains beneath the projected device footprint");
      const frontY = Math.max(...edgesAtX.map(([a, b]) => a.y + (x - a.x) / (b.x - a.x) * (b.y - a.y)));
      assert.ok(y - frontY >= 12,
        `cell ${cell.row}-${cell.col}, phase ${phase}: arrow midpoint needs visible clearance below the opaque OLED silhouette`);
      for (const frame of frames) assertInViewBox(frame, x, y, "cavity midpoint");
    }
  }
});

test("incoming white light disappears across a fixed planar black-matrix footprint, without needle-like traces", () => {
  const svg = createBlackholeSVG({ animated: true });
  const surfaces = [...svg.matchAll(/<path class="bh-motion bh-absorption-surface"([^>]*)>/g)];
  assert.equal(surfaces.length, 1, "one continuous surface cue darkens the complete boundary network");
  const attrs = surfaces[0][1];
  assert.match(attrs, /fill-rule="evenodd"/);
  assert.doesNotMatch(attrs, /transform=|stroke=|filter=|animation-delay/,
    "the absorbing footprint has no moving geometry, line rays or blur spilling into the apertures");
  const path = attrs.match(/\bd="([^"]+)"/)[1];
  const contours = [...path.matchAll(/M([^Z]+)Z/g)].map(([, contour]) =>
    contour.split("L").map(point => point.split(",").map(Number)));
  const expectedContours = [[0, 0, 4, 3], ...SUBPIXELS.map(({ col, row }) => [col + .1, row + .1, .8, .8])]
    .map(([x, y, width, height]) => [[x, y], [x + width, y], [x + width, y + height], [x, y + height]]
      .map(([px, py]) => {
        const p = projectPoint(px, py, SCENE_GEOMETRY.bottomPlane);
        return [Number(p.x.toFixed(2)), Number(p.y.toFixed(2))];
      }));
  assert.deepEqual(contours, expectedContours,
    "a full planar outline minus twelve fixed .8-square apertures absorbs only between subpixels");
  const animationName = svg.match(/svg\[data-animated="true"\] \.bh-absorption-surface\s*\{\s*animation-name:([^;]+);/);
  assert.ok(animationName);
  const keyframes = svg.match(new RegExp(`@keyframes ${animationName[1]} \\{((?:[^{}]|\\{[^{}]*\\})*)\\}`));
  assert.ok(keyframes);
  const stops = [...keyframes[1].matchAll(/([\d%,\s.]+)\{([^}]+)\}/g)].flatMap(([, times, declaration]) => {
    assert.match(declaration, /^opacity:[\d.]+;?$/,
      "absorption changes brightness only; it must not shrink, translate or produce reflected strokes");
    const opacity = Number(declaration.match(/opacity:([\d.]+)/)[1]);
    return times.trim().split(",").map(time => ({ time: Number(time.trim().replace("%", "")), opacity }));
  });
  const opacityAt = time => stops.find(stop => stop.time === time)?.opacity;
  assert.equal(opacityAt(0), 0);
  assert.ok(opacityAt(18) > 0 && opacityAt(18) < opacityAt(27));
  assert.ok(opacityAt(27) < opacityAt(SCENE_GEOMETRY.boundaryFade));
  assert.ok(opacityAt(SCENE_GEOMETRY.boundaryFade) >= .8);
  assert.equal(opacityAt(100), 0, "the next illumination cycle resets without a stale boundary overlay");
  assert.doesNotMatch(svg, /bh-sink-ray|bh-sink-contact|bh-sink-flow|bh-sink-limit|bh-absorption-tail/,
    "the rejected upright white rods and their clipping/gradient resources are fully removed");
  assert.doesNotMatch(svg + read("../research/blackhole.html"), /bh-radial|bh-branch|crosstalk|four smaller|Four connected/i);
});

test("the white OLED is a joined generic multilayer stack rather than two floating panes", () => {
  const svg = createBlackholeSVG();
  assert.ok(OLED_LAYERS.length >= 3, "multiple adjacent slabs should read as one OLED stack");
  assert.ok(Object.isFrozen(OLED_LAYERS));
  assert.equal(new Set(OLED_LAYERS.map(layer => layer.key)).size, OLED_LAYERS.length);
  const layers = [...svg.matchAll(/<g class="bh-oled-layer"([^>]*)>/g)];
  assert.equal(layers.length, OLED_LAYERS.length);
  OLED_LAYERS.forEach((layer, index) => {
    assert.ok(layer.top > layer.bottom, "each constituent slab has positive visible thickness");
    assert.match(layer.color, /^#[\da-f]{6}$/i);
    if (index) assert.equal(layer.bottom, OLED_LAYERS[index - 1].top, "there is no visual air gap between slabs");
    const attrs = layers[index][1];
    assert.equal(attrs.match(/data-layer="([^"]+)"/)[1], layer.key);
    assert.equal(Number(attrs.match(/data-bottom="([^"]+)"/)[1]), layer.bottom);
    assert.equal(Number(attrs.match(/data-top="([^"]+)"/)[1]), layer.top);
  });
  assert.equal(OLED_LAYERS.at(-1).top, SCENE_GEOMETRY.outputPlane);
  const tops = [...svg.matchAll(/<polygon points="([^"]+)" class="bh-oled-top"/g)];
  assert.equal(tops.length, 1, "only the outside top face spans the array");
  const expected = [[0, 0], [4, 0], [4, 3], [0, 3]].map(([x, y]) => {
    const p = projectPoint(x, y, SCENE_GEOMETRY.outputPlane);
    return [p.x, p.y];
  });
  assert.deepEqual(tops[0][1].split(" ").map(point => point.split(",").map(Number)), expected);
  for (const plane of SCENE_GEOMETRY.whiteEmissionPlanes) {
    assert.ok(plane >= OLED_LAYERS[0].bottom && plane <= OLED_LAYERS.at(-1).top,
      "the conceptual white source is inside the drawn stack");
  }
  assert.doesNotMatch(svg, /bh-el-layer/);
});

test("the solid OLED silhouette occludes lower structures in every component focus", () => {
  const bottom = OLED_LAYERS[0].bottom;
  const top = OLED_LAYERS.at(-1).top;
  const expectedFaces = [
    [[0, 0, top], [4, 0, top], [4, 3, top], [0, 3, top]],
    [[0, 3, bottom], [4, 3, bottom], [4, 3, top], [0, 3, top]],
    [[4, 0, bottom], [4, 3, bottom], [4, 3, top], [4, 0, top]]
  ].map(corners => corners.map(([x, y, z]) => {
    const projected = projectPoint(x, y, z);
    return `${Number(projected.x.toFixed(2))},${Number(projected.y.toFixed(2))}`;
  }).join(" "));

  for (const focus of Object.keys(COMPONENT_DESCRIPTIONS)) {
    const svg = createBlackholeSVG({ focus, animated: true });
    const occluders = [...svg.matchAll(/<g class="bh-oled-occluder"([^>]*)>([\s\S]*?)<\/g>/g)];
    assert.equal(occluders.length, 1, `${focus}: one fixed opaque backing must remain beneath the OLED finish`);
    const [occluder] = occluders;
    assert.doesNotMatch(occluder[0], /(?:opacity|mask|filter|animation|bh-part|bh-motion)/,
      `${focus}: the backing must not become transparent or animated`);
    const faces = [...occluder[2].matchAll(/<polygon points="([^"]+)"([^>]*)>/g)];
    assert.equal(faces.length, 3, `${focus}: top, front and side need opaque backing`);
    assert.deepEqual(faces.map(face => face[1]).sort(), [...expectedFaces].sort());
    for (const [, , attrs] of faces) {
      const fill = attrs.match(/\bfill="([^"]+)"/)?.[1] ?? occluder[1].match(/\bfill="([^"]+)"/)?.[1];
      assert.match(fill, /^#[\da-f]{6}$/i, "each face has an opaque color, directly or inherited from its group");
    }

    const ancestors = [];
    for (const tag of svg.slice(0, occluder.index).matchAll(/<g\b[^>]*>|<\/g>/g)) {
      if (tag[0] === "</g>") ancestors.pop();
      else ancestors.push(tag[0]);
    }
    assert.doesNotMatch(ancestors.join("\n"), /bh-part|bh-motion|opacity|mask|filter/,
      `${focus}: a faded ancestor must not reveal the lower array through the OLED`);
    assert.ok(occluder.index > svg.lastIndexOf('<g class="bh-cavity-cell"'), "cavity light is behind the OLED");
    assert.ok(occluder.index > svg.lastIndexOf('<use href="#bh-ring-disk"'), "all ring-disk units are behind the OLED");
    assert.ok(occluder.index > svg.indexOf('<g class="bh-part bh-boundary-light">'), "absorption light is behind the OLED");
    assert.ok(occluder.index + occluder[0].length <= svg.indexOf('<g class="bh-part bh-oled"'), "the finish is above the opaque backing");
    assert.ok(occluder.index < svg.indexOf('<g class="bh-part bh-rgb-light">'), "top-emission beams stay in front of the OLED");
    const topFace = svg.match(/<polygon[^>]*class="bh-oled-top"[^>]*>/);
    assert.ok(topFace);
    assert.doesNotMatch(topFace[0], /(?:^|\s)(?:fill-)?opacity=/, "the top surface itself is opaque");
  }
});

test("white OLED and the reflection cavity are conceptual rather than a disclosed recipe or measured results", () => {
  assert.equal(SCENE_GEOMETRY.whiteEmissionPlanes.length, 1, "one generic broadband source does not specify an unverified tandem chemistry");
  assert.ok(SCENE_GEOMETRY.whiteEmissionPlanes[0] > SCENE_GEOMETRY.bottomPlane);
  assert.ok(SCENE_GEOMETRY.outputPlane > SCENE_GEOMETRY.whiteEmissionPlanes[0]);
  assert.equal(SCENE_GEOMETRY.cavityUpperPlane, SCENE_GEOMETRY.outputPlane);
  assert.ok(SCENE_GEOMETRY.whiteEmissionPlanes[0] - SCENE_GEOMETRY.bottomPlane > SCENE_GEOMETRY.beamLength, "the expanded cavity leaves room to read the downward-and-reflected path");
  const content = [createBlackholeSVG(), read("../research/blackhole.html"), ...Object.values(COMPONENT_DESCRIPTIONS)].join("\n");
  assert.match(content, /white/i);
  assert.match(content, /Fabry[–\u2011-]P[eé]rot/i);
  assert.match(content, /top[ -]emission/i);
  assert.match(content, /not to scale/i);
  assert.match(content, /not (?:simulation|measured) results|no performance is represented|not calculated performance/i);
  assert.match(content, /material choices, dimensions and performance data are omitted/i);
  assert.match(content, /spectral selection.*not (?:frequency|wavelength) conversion/i);
  assert.match(content, /not coherent plane-wave emission/i);
  assert.doesNotMatch(content, /\b\d[\d,.]*\s*ppi\b|world[ -](?:best|leading)|\bB[ -]?Y[ -]?B\b/i);
});

test("ring and disk share material colors and intact annular tops drawn above boundary tracks", () => {
  const svg = createBlackholeSVG();
  const definition = svg.match(/<g id="bh-ring-disk">([\s\S]*?)<\/g>/)[1];
  const fillOf = className => definition.match(new RegExp(`class="${className}"[^>]+fill="([^"]+)"`))[1];
  assert.equal(fillOf("bh-ring-top"), fillOf("bh-disk-top"));
  assert.equal(fillOf("bh-ring-side"), fillOf("bh-disk-side"));
  const ringTop = definition.match(/class="bh-ring-top"[^>]+data-top="([^"]+)"/)[1];
  const diskTop = definition.match(/class="bh-disk-top"[^>]+cy="([^"]+)"/)[1];
  assert.equal(ringTop, diskTop, "ring and disk top surfaces must share the same height");
  const annulus = definition.match(/<path class="bh-ring-top"[^>]+d="([^"]+)"[^>]+fill-rule="evenodd"/);
  assert.ok(annulus, "ring top is a single closed annulus with a true cutout");
  assert.equal((annulus[1].match(/M/g) ?? []).length, 2);
  assert.equal((annulus[1].match(/Z/g) ?? []).length, 2);
  assert.equal((annulus[1].match(/a/g) ?? []).length, 4, "inner and outer rings each comprise two uninterrupted arcs");
  const tracks = svg.match(/<g class="bh-boundary-tracks">([\s\S]*?)<\/g>/);
  const raised = svg.match(/<g class="bh-raised-structures">([\s\S]*?)<\/g>/);
  assert.ok(tracks && raised);
  assert.equal((tracks[1].match(/<polygon/g) ?? []).length, 9);
  assert.ok(tracks.index + tracks[0].length <= raised.index, "all backing strips are painted before any raised structures");
  assert.doesNotMatch(raised[1], /<polygon/);
  const depths = [...raised[1].matchAll(/<use href="#bh-ring-disk"[^>]*data-base-depth="([\d.-]+)"/g)].map(([, depth]) => Number(depth));
  assert.equal(depths.length, 144);
  assert.deepEqual(depths, [...depths].sort((a, b) => a - b), "boundary units paint back-to-front");
});

test("all ground pads and black-matrix tracks stay behind the depth-sorted complete nanopillars", () => {
  for (const compactView of [false, true]) {
    const svg = createBlackholeSVG({ compactView });
    const pads = svg.match(/<g class="bh-cell-pads">([\s\S]*?)<\/g>/);
    const tracks = svg.match(/<g class="bh-boundary-tracks">([\s\S]*?)<\/g>/);
    const raised = svg.match(/<g class="bh-raised-structures">([\s\S]*?)<\/g>/);
    assert.ok(pads && tracks && raised);
    assert.equal((pads[1].match(/<polygon/g) ?? []).length, SUBPIXELS.length);
    assert.equal((tracks[1].match(/<polygon/g) ?? []).length, 9);
    const instances = [...raised[1].matchAll(/<use href="#bh-(pillar-[rgb]|ring-disk)"[^>]*\/>/g)];
    assert.equal(instances.length, 108 + 144, "one global depth queue contains every raised structure exactly once");
    const firstRaised = raised.index + raised[0].indexOf("<use");
    for (const ground of [pads, tracks]) {
      assert.ok(ground.index + ground[0].length < firstRaised,
        "a later-painted cell pad or opaque boundary track must never cut off a pillar cap or sidewall");
    }
    assert.doesNotMatch(raised[0], /<polygon|clip-path|<clipPath|\bmask=|\bfilter=/,
      "raised structures are not clipped to their projected planar cell boundaries");
    const depths = instances.map(([tag, type]) => {
      const depth = Number(tag.match(/data-base-depth="([\d.-]+)"/)[1]);
      const projectedY = Number(tag.match(/transform="translate\([\d.-]+,([\d.-]+)\)"/)[1]);
      const isPillar = type.startsWith("pillar-");
      assert.ok(Math.abs(depth - projectedY - (isPillar ? 1 : 1.5)) < .011,
        "depth sorting uses the common ground plane, not the different pillar and ring base elevations");
      assert.match(tag, isPillar ? /class="bh-part bh-mirrors bh-nanopillar"/ : /class="bh-part bh-absorbers bh-boundary-unit"/,
        "individual raised instances retain their own component highlighting");
      return depth;
    });
    assert.deepEqual(depths, [...depths].sort((a, b) => a - b),
      "pillars and ring-disk units share one back-to-front order instead of mutually occluding whole groups");
  }
});

test("nanopillars retain complete closed sidewalls and top caps on fully supported footprints", () => {
  const svg = createBlackholeSVG();
  const origin = projectPoint(0, 0), alongX = projectPoint(1, 0), alongY = projectPoint(0, 1);
  const a = alongX.x - origin.x, b = alongY.x - origin.x;
  const c = alongX.y - origin.y, d = alongY.y - origin.y;
  const determinant = a * d - b * c;
  assert.ok(determinant > 0);
  for (const channel of ["r", "g", "b"]) {
    const symbol = svg.match(new RegExp(`<g id="bh-pillar-${channel}">([\\s\\S]*?)<\\/g>`));
    assert.ok(symbol);
    assert.doesNotMatch(symbol[0], /clip-path|<clipPath|\bmask=|<rect|<polygon/,
      "a nanopillar is an intact cylinder, not a cell-clipped or sliced shape");
    assert.match(symbol[1], /<path d="M-5\.8,-8v8a5\.8,2\.7 0 0 0 11\.6,0v-8Z"/,
      "the original full-height closed sidewall preserves its complete lower arc");
    const cap = symbol[1].match(/<ellipse cy="(-?[\d.]+)" rx="([\d.]+)" ry="([\d.]+)"/);
    assert.ok(cap, "every cylinder has a complete elliptical top cap");
    assert.equal(Number(cap[1]), -8);
    const rx = Number(cap[2]), ry = Number(cap[3]);
    const extentX = Math.hypot(d * rx, b * ry) / determinant;
    const extentY = Math.hypot(c * rx, a * ry) / determinant;
    const instances = [...svg.matchAll(new RegExp(`<use href="#bh-pillar-${channel}" transform="translate\\(([\\d.-]+),([\\d.-]+)\\)"[^>]*data-cell="(\\d+)-(\\d+)"[^>]*\\/>`, "g"))];
    assert.equal(instances.length, SUBPIXELS.filter(cell => cell.channel === channel).length * 9);
    for (const [, screenX, screenY, row, col] of instances) {
      const dx = Number(screenX) - origin.x, dy = Number(screenY) + 1 - origin.y;
      const x = (d * dx - b * dy) / determinant;
      const y = (-c * dx + a * dy) / determinant;
      assert.ok(x - extentX > Number(col) + .1 && x + extentX < Number(col) + .9,
        "the cylinder footprint is fully supported inside its own subpixel horizontally");
      assert.ok(y - extentY > Number(row) + .1 && y + extentY < Number(row) + .9,
        "the cylinder footprint is fully supported inside its own subpixel in depth");
    }
  }
});

test("a solid three-face substrate supports the metamirror backplane", () => {
  const svg = createBlackholeSVG();
  assert.ok(SCENE_GEOMETRY.substrateBottom < -20, "the lower substrate has visible drawing thickness");
  const base = svg.match(/<g class="bh-substrate"[^>]*>([\s\S]*?)<\/g>/);
  assert.ok(base);
  for (const face of ["top", "front", "side"]) {
    const polygon = base[1].match(new RegExp(`<polygon points="([^"]+)" class="bh-substrate-${face}"[^>]+fill="([^"]+)"`));
    assert.ok(polygon, `missing opaque ${face} substrate face`);
    assert.notEqual(polygon[2], "none");
    assert.doesNotMatch(polygon[0], /fill-opacity/);
    const points = polygon[1].split(" ").map(point => point.split(",").map(Number));
    assert.equal(points.length, 4);
    for (const [x, y] of points) assertInViewBox(svg, x, y, `substrate ${face}`);
  }
  assert.ok(base.index < svg.indexOf('<g class="bh-part bh-mirrors">'), "substrate is behind the supported arrays");
});

test("obsolete dashed-beam animation, detached shape keys and layer-separation controls are absent", () => {
  for (const source of [read("../assets/blackhole-scene.mjs"), read("../assets/blackhole.js"), read("../research/blackhole.html"), read("../assets/project-detail.css"), createBlackholeSVG()]) {
    assert.doesNotMatch(source, /explod|bh-boundary-streak|bh-light-streak|bh-travel|bh-inset|project-checkbox/i);
  }
  assert.doesNotMatch(createBlackholeSVG(), /stroke-dasharray|stroke-dashoffset/);
  assert.doesNotMatch(read("../research/blackhole.html"), /<meta name="robots" content="noindex">/);
  assert.match(read("../research/blackhole.html"), /Brightness and complete disappearance at the boundaries are schematic/);
});

test("the device drawing is free of peripheral labels and names the absorber control Black matrix", () => {
  for (const compactView of [false, true]) {
    const svg = createBlackholeSVG({ compactView });
    assert.doesNotMatch(svg, /<text\b|bh-annotation|bh-label-leader|Supporting substrate/);
    assert.match(svg, /<title id="bh-title">/);
    assert.match(svg, /<desc id="bh-desc">/);
  }
  const page = read("../research/blackhole.html");
  assert.match(page, /data-focus-value="absorbers"[^>]*>Black matrix<\/button>/);
  assert.doesNotMatch(page, /Absorbing boundaries/i);
  assert.match(COMPONENT_DESCRIPTIONS.absorbers, /^Black matrix\b/);
});

test("compact viewport enlarges the complete device without detached shape keys", () => {
  const desktop = createBlackholeSVG();
  const compact = createBlackholeSVG({ compactView: true });
  const [desktopLeft, desktopTop, desktopWidth, desktopHeight] = viewBox(desktop);
  const [left, top, width, height] = viewBox(compact);
  assert.ok(left >= desktopLeft && top >= desktopTop);
  assert.ok(width < desktopWidth && height <= desktopHeight);
  assert.match(compact, /data-compact="true"/);
  assert.doesNotMatch(desktop + compact, /bh-inset/);
});

test("schematic code has no network calls, remote dependencies or external SVG resources", () => {
  const controller = read("../assets/blackhole.js");
  const scene = read("../assets/blackhole-scene.mjs");
  for (const source of [controller, scene]) {
    assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b|navigator\.sendBeacon/);
    assert.doesNotMatch(source, /(?:import|export)[^\n]+from\s*["'](?:https?:|\/\/|[^.])/);
  }
  const svg = createBlackholeSVG();
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id);
  const available = new Set(ids);
  assert.equal(available.size, ids.length, "SVG ids must be unique within a scene");
  for (const [, href] of svg.matchAll(/(?:href|src)="([^"]+)"/g)) {
    assert.ok(href.startsWith("#"), href);
    assert.ok(available.has(href.slice(1)), `missing SVG reference ${href}`);
  }
  for (const [, url] of svg.matchAll(/url\(([^)]+)\)/g)) {
    assert.ok(url.startsWith("#"), url);
    assert.ok(available.has(url.slice(1)), `missing paint reference ${url}`);
  }
  assert.doesNotMatch(svg, /<script|<foreignObject|@import/);
});

test("controller wires component selection without losing playback preference", async t => {
  const env = environment(t);
  await env.start();
  assert.equal(env.controls.hidden, false);
  assert.equal(env.observed, env.stage);
  assert.equal(env.demo.dataset.focus, "all");
  assert.equal(env.demo.dataset.playing, "true");
  assert.equal(env.svg.dataset.playing, "true");
  assert.equal(env.svg.dataset.animated, "true");
  assert.equal(env.motion.attributes["aria-pressed"], "true");
  assert.equal(env.motion.textContent, "Pause animation");

  for (const key of ["oled", "mirrors", "absorbers", "all"]) {
    env.clickFocus(key);
    assert.equal(env.demo.dataset.focus, key);
    assert.equal(env.svg.dataset.focus, key);
    assert.equal(env.description.textContent, COMPONENT_DESCRIPTIONS[key]);
    for (const [name, button] of Object.entries(env.focus)) {
      assert.equal(button.attributes["aria-pressed"], String(name === key));
    }
  }
  env.toggleMotion();
  assert.equal(env.demo.dataset.playing, "false");
  assert.equal(env.svg.dataset.animated, "true", "pause freezes an initialized sequence rather than swapping to a different diagram");
  assert.equal(env.motion.attributes["aria-pressed"], "false");
  assert.equal(env.motion.textContent, "Play animation");
  env.clickFocus("mirrors");
  assert.equal(env.demo.dataset.focus, "mirrors");
  assert.equal(env.demo.dataset.playing, "false");
  assert.equal(env.svg.dataset.playing, "false");
});

test("hidden and offscreen states pause motion without resetting the user's choice", async t => {
  const env = environment(t);
  await env.start();
  const renderCount = env.renderCount;
  env.tabVisible(false);
  assert.equal(env.svg.dataset.playing, "false");
  assert.equal(env.motion.attributes["aria-pressed"], "true");
  env.inView(false);
  env.tabVisible(true);
  assert.equal(env.svg.dataset.playing, "false");
  env.inView(true);
  assert.equal(env.svg.dataset.playing, "true");
  env.toggleMotion();
  env.inView(false);
  env.inView(true);
  env.tabVisible(false);
  env.tabVisible(true);
  assert.equal(env.svg.dataset.playing, "false");
  assert.equal(env.motion.attributes["aria-pressed"], "false");
  assert.equal(env.renderCount, renderCount, "visibility and motion updates must not replace the SVG");
});

test("reduced-motion default is static with explicit optional playback", async t => {
  const env = environment(t, { reducedMotion: true });
  await env.start();
  assert.equal(env.demo.dataset.playing, "false");
  assert.equal(env.svg.dataset.playing, "false");
  assert.equal(env.svg.dataset.animated, "false", "reduced-motion starts with the complete static schematic");
  assert.equal(env.motion.textContent, "Play animation");
  assert.match(env.stage.innerHTML, /<svg/);
  env.clickFocus("absorbers");
  assert.equal(env.svg.dataset.playing, "false");
  env.toggleMotion();
  assert.equal(env.svg.dataset.playing, "true");
  assert.equal(env.svg.dataset.animated, "true", "explicit play enables the optical sequence");
  env.reducedMotion(true);
  assert.equal(env.svg.dataset.playing, "false");
  assert.equal(env.motion.attributes["aria-pressed"], "false");
  env.reducedMotion(false);
  assert.equal(env.svg.dataset.playing, "false", "preference changes must not restart explicitly paused animation");
});

test("controller works without IntersectionObserver and respects a hidden initial document", async t => {
  const env = environment(t, { withObserver: false, initiallyHidden: true });
  await env.start();
  assert.equal(env.controls.hidden, false);
  assert.equal(env.svg.dataset.playing, "false");
  env.tabVisible(true);
  assert.equal(env.svg.dataset.playing, "true");
});

test("narrow viewport framing enlarges the main device and preserves control state on resize", async t => {
  const env = environment(t, { compactView: true });
  await env.start();
  const compactBox = viewBox(createBlackholeSVG({ compactView: true }));
  const desktopBox = viewBox(createBlackholeSVG());
  assert.deepEqual(viewBox(env.stage.innerHTML), compactBox);
  assert.match(env.stage.innerHTML, new RegExp(`width="${compactBox[2]}" height="${compactBox[3]}"`));
  env.clickFocus("absorbers");
  env.toggleMotion();
  env.compactScreen(false);
  assert.deepEqual(viewBox(env.stage.innerHTML), desktopBox);
  assert.equal(env.demo.dataset.focus, "absorbers");
  assert.equal(env.svg.dataset.playing, "false");
  env.compactScreen(true);
  assert.deepEqual(viewBox(env.stage.innerHTML), compactBox);
  assert.equal(env.demo.dataset.focus, "absorbers");
  assert.equal(env.svg.dataset.playing, "false");
});

test("loading the controller on a page without the demo is a no-op", async t => {
  const env = environment(t, { noDemo: true });
  await env.start();
  assert.equal(env.renderCount, 0);
  assert.equal(env.controls.hidden, true);
});
