import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COMPONENT_DESCRIPTIONS, SCENE_GEOMETRY, SUBPIXELS, createBlackholeSVG, projectPoint } from "../assets/blackhole-scene.mjs";

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
  const pillars = [...svg.matchAll(/<use href="#bh-pillar-([rgb])" transform="translate\(([\d.-]+),([\d.-]+)\)"/g)].slice(0, 108);
  assert.equal(pillars.length, 108);
  SUBPIXELS.forEach((cell, index) => {
    const cellPillars = pillars.slice(index * 9, index * 9 + 9);
    assert.ok(cellPillars.every(([, channel]) => channel === cell.channel));
    const meanX = cellPillars.reduce((sum, pillar) => sum + Number(pillar[2]), 0) / 9;
    const meanY = cellPillars.reduce((sum, pillar) => sum + Number(pillar[3]), 0) / 9;
    const center = projectPoint(cell.x, cell.y, 1);
    assert.ok(Math.abs(meanX - center.x) < .01, "pillar array must be centered on the output axis");
    assert.ok(Math.abs(meanY - center.y) < .01, "pillar array must be centered on the output axis");
  });
  const boundaryElements = (svg.match(/<use href="#bh-ring-disk"/g) ?? []).length;
  assert.equal(boundaryElements, 144);
  for (const [, points] of svg.matchAll(/<polygon points="([^"]+)"/g)) {
    for (const point of points.split(" ")) {
      const [x, y] = point.split(",").map(Number);
      assertInViewBox(svg, x, y, "device polygon");
    }
  }
});

test("every RGB subpixel has a centered substantial output with an unobstructed pointed arrowhead", () => {
  const round = value => Number(value.toFixed(2));
  for (const compactView of [false, true]) {
    const svg = createBlackholeSVG({ compactView });
    const outputs = [...svg.matchAll(/<g class="bh-motion bh-output"([^>]*)>([\s\S]*?<path class="bh-motion bh-arrowhead"[^>]+\/>)/g)];
    assert.equal(outputs.length, 12);
    const seen = new Set();
    for (const [, attributes, body] of outputs) {
      const key = attributes.match(/data-cell="([^"]+)"/)[1];
      const cell = SUBPIXELS.find(cell => `${cell.row}-${cell.col}` === key);
      assert.ok(cell, `unknown output cell ${key}`);
      assert.ok(!seen.has(key), `duplicate output cell ${key}`);
      seen.add(key);
      assert.match(attributes, new RegExp(`data-channel="${cell.channel}"`));
      const core = body.match(/<path class="bh-output-core"([^>]+)\/>/);
      assert.ok(core, `missing output core for ${key}`);
      const path = core[1].match(/d="M([\d.-]+),([\d.-]+) L([\d.-]+),([\d.-]+)"/);
      assert.ok(path, `output ${key} must be a straight path`);
      const [x1, y1, x2, y2] = path.slice(1).map(Number);
      const origin = projectPoint(cell.x, cell.y, SCENE_GEOMETRY.bottomPlane);
      const tip = projectPoint(cell.x, cell.y, SCENE_GEOMETRY.outputPlane + SCENE_GEOMETRY.beamLength);
      const declaredOrigin = attributes.match(/data-origin="([^"]+)"/)[1].split(",").map(Number);
      const declaredTip = attributes.match(/data-tip="([^"]+)"/)[1].split(",").map(Number);
      assert.deepEqual(declaredOrigin, [round(origin.x), round(origin.y)]);
      assert.deepEqual(declaredTip, [round(tip.x), round(tip.y)]);
      assert.deepEqual([x1, y1, x2], [0, 0, 0], "output shaft starts at the array center in local mirror coordinates");
      assert.ok(y2 < 0, "output grows upward");
      assert.match(core[1], /stroke-linecap="butt"/, "the shaft cannot project a rounded cap through the pointed head");
      assert.ok(Number(core[1].match(/stroke-width="([\d.]+)"/)[1]) >= 4, "output cores should be visibly substantial");
      const channelDefinition = svg.match(new RegExp(`<g id="bh-pillar-${cell.channel}">([\\s\\S]*?)</g>`))[1];
      const channelColor = channelDefinition.match(/<ellipse[^>]+stroke="([^"]+)"/)[1];
      assert.equal(core[1].match(/stroke="([^"]+)"/)[1], channelColor, `output ${key} must match its underlying RGB array`);
      const head = body.match(/<path class="bh-motion bh-arrowhead"[^>]+d="M([\d.-]+),([\d.-]+) L([\d.-]+),([\d.-]+) L([\d.-]+),([\d.-]+)Z"[^>]+fill="([^"]+)"/);
      assert.ok(head, `output ${key} requires a closed triangular head`);
      const [tipX, tipY, leftX, leftY, rightX, rightY] = head.slice(1, 7).map(Number);
      assert.equal(tipX, 0);
      assert.equal(tipY, round(tip.y - origin.y));
      assert.equal(leftY, rightY);
      assert.ok(leftX < 0 && rightX > 0 && tipY < leftY);
      assert.ok(y2 > tipY + 5 && y2 <= leftY, "shaft terminates within the triangle base, safely behind the sharp tip");
      assert.equal(head[7], channelColor);
      assert.doesNotMatch(body, /stroke="#(?:fff|ffffff|f5f8ff)"/i, "upward outputs contain no white moving streak");
      assertInViewBox(svg, origin.x, origin.y, `output ${key} origin`);
      assertInViewBox(svg, tip.x, tip.y, `output ${key} arrow tip`);
    }
  }
});

test("three luminous curved white wavefronts descend without glass-like panels before RGB output grows", () => {
  const svg = createBlackholeSVG({ animated: true });
  const fronts = [...svg.matchAll(/<g class="bh-motion bh-wavefront"([^>]*)>([\s\S]*?)<\/g>/g)];
  assert.equal(fronts.length, 3);
  const sourcePlane = SCENE_GEOMETRY.whiteEmissionPlanes[0];
  const distance = sourcePlane - SCENE_GEOMETRY.bottomPlane;
  const seen = new Set(), delays = [];
  for (const [, attributes, body] of fronts) {
    const key = attributes.match(/data-front="([^"]+)"/)[1];
    assert.ok(!seen.has(key));
    seen.add(key);
    assert.equal(Number(attributes.match(/data-start-plane="([^"]+)"/)[1]), sourcePlane);
    assert.equal(Number(attributes.match(/data-end-plane="([^"]+)"/)[1]), SCENE_GEOMETRY.bottomPlane);
    assert.equal(Number(attributes.match(/--wave-distance:([\d.]+)px/)[1]), distance);
    const rest = Number(attributes.match(/--wave-rest:([\d.]+)px/)[1]);
    assert.ok(rest > 0 && rest < distance, "static fallback places each wave inside the optical gap");
    delays.push(Number(attributes.match(/animation-delay:([\d.]+)s/)[1]));
    assert.match(attributes, /fill="none" stroke-linecap="round"/);
    assert.doesNotMatch(body, /<polygon|<rect|<ellipse|<circle|<use|marker|bh-wave-surface|bh-wave-sheet/,
      "incoming light is made of open wave curves, not framed planes or arrow glyphs");
    const ribbons = [...body.matchAll(/<path class="bh-wave-ribbon" d="([^"]+)"([^>]*)\/>/g)];
    const crests = [...body.matchAll(/<path class="bh-wave-crest" d="([^"]+)"([^>]*)\/>/g)];
    const glows = [...body.matchAll(/<path class="bh-wave-glow" d="([^"]+)"([^>]*)\/>/g)];
    assert.equal(ribbons.length, 4, "white waves cover multiple rows across the array");
    assert.equal(crests.length, 4);
    assert.equal(glows.length, 4);
    ribbons.forEach(([, d, properties], index) => {
      assert.match(d, /^M/);
      assert.equal((d.match(/C/g) ?? []).length, 8, "each open wave has repeated smooth cubic crests");
      assert.doesNotMatch(d, /[LZ]/i, "no straight rectangular perimeter or closed surface");
      assert.match(properties, /stroke="url\(#bh-wave-ink\)"/);
      assert.ok(Number(properties.match(/stroke-width="([\d.]+)"/)[1]) >= 5, "white wave bands remain visibly substantial");
      assert.ok(Number(properties.match(/stroke-opacity="([\d.]+)"/)[1]) >= .7);
      assert.equal(crests[index][1], d);
      assert.equal(glows[index][1], d);
      assert.match(glows[index][2], /filter="url\(#bh-wave-softness\)"/);
      const coordinates = [...d.matchAll(/([\d.-]+),([\d.-]+)/g)].map(match => match.slice(1).map(Number));
      assert.ok(coordinates.at(-1)[0] - coordinates[0][0] > 300, "each ribbon spans the array rather than a single subpixel");
      const [[x0, y0], [x1, y1], , [x3, y3]] = coordinates;
      assert.ok(Math.abs(y1 - (y0 + (y3 - y0) * (x1 - x0) / (x3 - x0))) > 4,
        "cubic control points visibly deviate from a straight wavefront");
      for (const [x, y] of coordinates) {
        assertInViewBox(svg, x, y, "wave source curve");
        assertInViewBox(svg, x, y + distance, "wave arrival curve");
      }
    });
    assert.equal((body.match(/<path/g) ?? []).length, 12);
  }
  const ink = svg.match(/<linearGradient id="bh-wave-ink">([\s\S]*?)<\/linearGradient>/)[1];
  for (const [, color] of ink.matchAll(/stop-color="([^"]+)"/g)) {
    assert.equal(color.toLowerCase(), "#ffffff", "incoming crests are white rather than tinted transparent glass");
  }
  for (const colorStop of ink.matchAll(/<stop[^>]+\/>/g)) {
    const opacity = colorStop[0].match(/stop-opacity="([\d.]+)"/);
    if (opacity && Number(opacity[1]) > 0) {
      assert.ok(Number(opacity[1]) >= .9, "only feathered edges should be transparent");
    }
  }
  assert.equal(new Set(delays).size, 3, "the broad fronts have distinct arrival times");
  const duration = Number(svg.match(/\.bh-motion \{ animation-duration:([\d.]+)s/)[1]);
  const waveCompletion = Number(svg.match(/([\d.]+)%\{transform:translateY\(var\(--wave-distance\)\)\}/)[1]);
  const rgbStart = Number(svg.match(/@keyframes bh-output-grow\s*\{\s*0%,([\d.]+)%\{transform:scaleY\(0\)/)[1]);
  assert.ok(rgbStart / 100 * duration >= waveCompletion / 100 * duration + Math.max(...delays), "RGB output starts after the last white wave reaches the mirror");
  assert.match(svg, /svg\[data-animated="true"\] \.bh-wavefront \{ animation-name:bh-wave-descent;/);
  assert.match(svg, /svg\[data-playing="true"\] \.bh-motion \{ animation-play-state:running;/);
  assert.doesNotMatch(svg, /bh-white-down|bh-white-head|bh-white-shaft|stroke-dasharray|stroke-dashoffset/);
});

test("each subpixel branches four connected RGB arrows from the main output body to its ring-disk black matrix", () => {
  const round = value => Number(value.toFixed(2));
  const svg = createBlackholeSVG();
  assert.ok(SCENE_GEOMETRY.branchPlane > SCENE_GEOMETRY.bottomPlane, "branches start above the mirror, not from the output base");
  assert.ok(SCENE_GEOMETRY.branchPlane < SCENE_GEOMETRY.whiteEmissionPlanes[0], "branches remain inside the illustrated optical gap");
  const rays = [...svg.matchAll(/<g class="bh-radial-ray"([^>]*)>([\s\S]*?class="bh-motion bh-absorption"[^>]+\/>)/g)];
  assert.equal(rays.length, 48);
  const seen = new Set();
  for (const [, attributes, body] of rays) {
    const key = attributes.match(/data-cell="([^"]+)"/)[1];
    const cell = SUBPIXELS.find(cell => `${cell.row}-${cell.col}` === key);
    assert.ok(cell);
    const direction = attributes.match(/data-direction="([^"]+)"/)[1];
    assert.ok(["north", "east", "south", "west"].includes(direction));
    assert.ok(!seen.has(`${key}-${direction}`));
    seen.add(`${key}-${direction}`);
    assert.match(attributes, new RegExp(`data-channel="${cell.channel}"`));
    const [boundaryX, boundaryY] = attributes.match(/data-boundary="([^"]+)"/)[1].split(",").map(Number);
    if (direction === "east" || direction === "west") {
      assert.equal(boundaryX, cell.col + (direction === "east" ? 1 : 0));
      assert.ok(boundaryY > cell.row && boundaryY < cell.row + 1);
    } else {
      assert.equal(boundaryY, cell.row + (direction === "south" ? 1 : 0));
      assert.ok(boundaryX > cell.col && boundaryX < cell.col + 1);
    }
    const ring = projectPoint(boundaryX, boundaryY, 1.5);
    assert.ok(svg.includes(`href="#bh-ring-disk" transform="translate(${round(ring.x)},${round(ring.y)})"`), "every arrow terminates at a physical ring-disk instance");
    const center = projectPoint(cell.x, cell.y, SCENE_GEOMETRY.branchPlane);
    const origin = attributes.match(/data-origin="([^"]+)"/)[1].split(",").map(Number);
    assert.deepEqual(origin, [round(center.x), round(center.y)], "outward rays originate on the body of the main RGB output axis");
    const outputOrigin = projectPoint(cell.x, cell.y, SCENE_GEOMETRY.bottomPlane);
    const outputTip = projectPoint(cell.x, cell.y, SCENE_GEOMETRY.outputPlane + SCENE_GEOMETRY.beamLength);
    assert.equal(origin[0], round(outputOrigin.x));
    assert.equal(origin[0], round(outputTip.x));
    assert.ok(origin[1] < outputOrigin.y && origin[1] > outputTip.y);
    const end = attributes.match(/data-end="([^"]+)"/)[1].split(",").map(Number);
    const target = projectPoint(boundaryX, boundaryY, 5.5);
    assert.deepEqual(end, [round(target.x), round(target.y)]);
    assert.ok(end[1] <= ring.y && end[1] >= ring.y - 6, "light is absorbed at the unit surface, not below the substrate");
    assert.equal(Number(attributes.match(/data-branch-plane="([^"]+)"/)[1]), SCENE_GEOMETRY.branchPlane);
    const dx = round(end[0] - origin[0]), dy = round(end[1] - origin[1]);
    const length = round(Math.hypot(dx, dy));
    assert.match(body, new RegExp(`<g transform="translate\\(${origin[0]},${origin[1]}\\)">`));
    const rotation = body.match(/<g class="bh-branch-geometry" transform="rotate\(([\d.-]+)\)"/);
    assert.ok(rotation, "the branch has a fixed coordinate frame anchored to the main shaft");
    assert.equal(Number(rotation[1]), round(Math.atan2(dy, dx) * 180 / Math.PI));
    assert.equal(Number(body.match(/--branch-start:([\d.-]+)px/)[1]), -length);
    const shaft = body.match(/<path class="bh-motion bh-branch-shaft" d="M0,0 L([\d.-]+),0"([^>]+)\/>/);
    assert.ok(shaft, "the growing branch shaft is always attached to local origin zero");
    const shaftLength = Number(shaft[1]);
    assert.ok(shaftLength > 0 && shaftLength < length);
    assert.match(shaft[2], /stroke-linecap="butt"/);
    const glyph = body.match(/<path class="bh-motion bh-radial-arrow" d="([^"]+)" fill="([^"]+)"/);
    assert.ok(glyph);
    assert.ok(glyph[1].endsWith("Z"), "branches retain closed triangular heads");
    const localPoints = [...glyph[1].matchAll(/[ML]([\d.-]+),([\d.-]+)/g)].map(match => match.slice(1).map(Number));
    assert.equal(localPoints.length, 3);
    assert.deepEqual(localPoints[0], [length, 0], "the final arrow tip reaches the physical boundary");
    assert.equal(localPoints[1][0], localPoints[2][0]);
    assert.ok(localPoints[1][1] < 0 && localPoints[2][1] > 0);
    assert.ok(localPoints.every(([x]) => x <= length), "the triangular head never extends past its boundary endpoint");
    for (const progress of [0, .1, .25, .5, .75, 1]) {
      const shaftEnd = shaftLength * progress;
      const headBase = localPoints[1][0] - length * (1 - progress);
      assert.ok(shaftEnd >= headBase, "the moving arrowhead never disconnects from its growing shaft");
    }
    const definition = svg.match(new RegExp(`<g id="bh-pillar-${cell.channel}">([\\s\\S]*?)</g>`))[1];
    const channelColor = definition.match(/<ellipse[^>]+stroke="([^"]+)"/)[1];
    assert.equal(glyph[2], channelColor);
    assert.equal(shaft[2].match(/stroke="([^"]+)"/)[1], channelColor);
  }
  const branchGrow = svg.match(/@keyframes bh-branch-grow\s*\{\s*0%,([\d.]+)%\{transform:scaleX\(0\)\} ([\d.]+)%,100%\{transform:scaleX\(1\)\}/);
  assert.ok(branchGrow);
  const [, start, end] = branchGrow.map(Number);
  const branchTip = svg.match(/@keyframes bh-branch-tip\s*\{\s*0%,([\d.]+)%\{transform:translateX\(var\(--branch-start\)\)\} ([\d.]+)%,100%\{transform:translateX\(0\)\}/);
  assert.ok(branchTip);
  assert.deepEqual(branchTip.slice(1).map(Number), [start, end], "branch shaft and tip share the same growth timeline");
  assert.match(svg, /\.bh-motion \{[^}]+animation-timing-function:linear;[^}]+transform-origin:0 0;/);
  const outputGrow = svg.match(/@keyframes bh-output-grow\s*\{\s*0%,([\d.]+)%\{transform:scaleY\(0\)\} ([\d.]+)%,100%\{transform:scaleY\(1\)\}/);
  const [, outputStart, outputEnd] = outputGrow.map(Number);
  const outputShaftLength = -Number(svg.match(/class="bh-output-core" d="M0,0 L0,([\d.-]+)"/)[1]);
  const crossingTime = outputStart + (outputEnd - outputStart) * (SCENE_GEOMETRY.branchPlane - SCENE_GEOMETRY.bottomPlane) / outputShaftLength;
  assert.ok(start >= crossingTime, "branches appear only after the main RGB shaft reaches the junction height");
  const absorptionPeak = Number(svg.match(/@keyframes bh-absorb[^}]+\}\s*([\d.]+)%\{opacity:\.75/)[1]);
  assert.ok(end > start && end < 100);
  assert.ok(absorptionPeak >= end && absorptionPeak <= end + 5, "the boundary response follows the disappearing arrow tip");
  assert.doesNotMatch(svg, /bh-leak-trace|bh-leak-packet|bh-leakage|bh-radial-travel|bh-radial-glyph|--ray-rest/);
});

test("two visible EL regions use tinted translucent full-array surfaces", () => {
  const svg = createBlackholeSVG();
  const layers = [...svg.matchAll(/<polygon points="([^"]+)" class="bh-el-layer" data-plane="([^"]+)" fill="([^"]+)" fill-opacity="([^"]+)"/g)];
  assert.equal(layers.length, 2);
  assert.deepEqual(layers.map(layer => Number(layer[2])), [...SCENE_GEOMETRY.whiteEmissionPlanes]);
  for (const [, points, plane, fill, opacity] of layers) {
    assert.match(fill, /^#[\da-f]{6}$/i);
    assert.doesNotMatch(fill, /^#(?:fff|ffffff|000000)$/i);
    assert.ok(Number(opacity) >= .2 && Number(opacity) < 1, "EL surfaces should be visibly colored yet translucent");
    const corners = points.split(" ").map(point => point.split(",").map(Number));
    const expected = [[0, 0], [4, 0], [4, 3], [0, 3]].map(([x, y]) => {
      const p = projectPoint(x, y, Number(plane) + 4);
      return [p.x, p.y];
    });
    assert.deepEqual(corners, expected);
  }
});

test("tandem white OLED and the reflection cavity are conceptual rather than measured results", () => {
  assert.equal(SCENE_GEOMETRY.whiteEmissionPlanes.length, 2);
  assert.ok(SCENE_GEOMETRY.whiteEmissionPlanes[0] > SCENE_GEOMETRY.bottomPlane);
  assert.ok(SCENE_GEOMETRY.whiteEmissionPlanes[1] > SCENE_GEOMETRY.whiteEmissionPlanes[0]);
  assert.ok(SCENE_GEOMETRY.outputPlane > SCENE_GEOMETRY.whiteEmissionPlanes[1]);
  assert.ok(SCENE_GEOMETRY.whiteEmissionPlanes[0] - SCENE_GEOMETRY.bottomPlane > SCENE_GEOMETRY.beamLength, "separated EL regions leave room to read the downward-and-reflected path");
  const content = [createBlackholeSVG(), read("../research/blackhole.html"), ...Object.values(COMPONENT_DESCRIPTIONS)].join("\n");
  assert.match(content, /tandem/i);
  assert.match(content, /white/i);
  assert.match(content, /Fabry[–\u2011-]P[eé]rot/i);
  assert.match(content, /top[ -]emission/i);
  assert.match(content, /not to scale/i);
  assert.match(content, /not (?:simulation|measured) results|no performance is represented|not calculated performance/i);
  assert.match(content, /material choices, dimensions and performance data are omitted/i);
  assert.match(content, /spectral selection.*not (?:frequency|wavelength) conversion/i);
  assert.match(content, /not coherent plane-wave emission/i);
  assert.doesNotMatch(content, /\b\d[\d,.]*\s*ppi\b|world[ -](?:best|leading)/i);
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
  const units = svg.match(/<g class="bh-boundary-units">([\s\S]*?)<\/g>/);
  assert.ok(tracks && units);
  assert.equal((tracks[1].match(/<polygon/g) ?? []).length, 9);
  assert.ok(tracks.index + tracks[0].length <= units.index, "all backing strips are painted before any rings");
  assert.doesNotMatch(units[1], /<polygon/);
  const depths = [...units[1].matchAll(/transform="translate\([\d.-]+,([\d.-]+)\)"/g)].map(([, y]) => Number(y));
  assert.equal(depths.length, 144);
  assert.deepEqual(depths, [...depths].sort((a, b) => a - b), "boundary units paint back-to-front");
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
  assert.match(read("../research/blackhole.html"), /Crosstalk suppression is a proposed function, not a simulated or measured result\./);
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
