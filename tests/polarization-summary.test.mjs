import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SUMMARY_DURATION, SUMMARY_CHAPTERS, META_RADII, LONG_RADIUS, ARRAY_ROWS, ARRAY_COLUMNS, META_PROJECTION, projectPoint, LAYERS, X_COLORS, Y_COLORS, DATA_Y_COLORS, getSummaryFrame, getLightCycle, createPolarizationSVG } from "../assets/polarization-scene.mjs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const rgb = color => [1, 3, 5].map(start => parseInt(color.slice(start, start + 2), 16));
const distance = (a, b) => Math.hypot(...rgb(a).map((value, index) => value - rgb(b)[index]));
const spread = colors => Math.max(...colors.flatMap(a => colors.map(b => distance(a, b))));
const atoms = svg => [...svg.matchAll(/<g class="ps-meta-atom"[^>]*>[\s\S]*?<\/g>/g)].map(match => match[0]);

test("publication story is a frozen five-chapter, 20-second sequence", () => {
  assert.equal(SUMMARY_DURATION, 20);
  assert.deepEqual(SUMMARY_CHAPTERS.map(chapter => chapter.start), [0, 4, 9, 14, 18]);
  assert.ok(Object.isFrozen(SUMMARY_CHAPTERS));
  assert.ok(SUMMARY_CHAPTERS.every(chapter => Object.isFrozen(chapter) && chapter.label && chapter.title && chapter.caption));
  for (let index = 0; index < SUMMARY_CHAPTERS.length; index++) {
    const frame = getSummaryFrame(SUMMARY_CHAPTERS[index].start);
    assert.equal(frame.chapter, index);
    assert.equal(frame.title, SUMMARY_CHAPTERS[index].title);
    assert.equal(frame.caption, SUMMARY_CHAPTERS[index].caption);
  }
  assert.equal(getSummaryFrame(20).chapter, 4);
});

test("story frames stay finite and within bounds, including invalid inputs", () => {
  assert.equal(getSummaryFrame(-10).time, 0);
  assert.equal(getSummaryFrame(100).time, 20);
  for (const invalid of [NaN, Infinity, -Infinity, undefined, "not a number"]) {
    assert.equal(getSummaryFrame(invalid).time, 0);
  }
  for (let seconds = 0; seconds <= 20; seconds += .125) {
    const frame = getSummaryFrame(seconds);
    assert.equal(frame.time, seconds);
    assert.ok(frame.angle >= 0 && frame.angle <= 90);
    for (const key of ["incidentProgress", "incidentTailProgress", "incidentOpacity", "response", "reflectedProgress", "reflectedOpacity"]) {
      assert.ok(Number.isFinite(frame[key]) && frame[key] >= 0 && frame[key] <= 1, `${key} stays bounded at ${seconds}s`);
    }
    assert.equal(frame.colors.length, 5);
    assert.ok(frame.colors.every(color => /^#[0-9a-f]{6}$/.test(color)));
  }
});

test("x and y endpoints are correct, with smooth monotonic rotation and no geometry tuning", () => {
  for (const seconds of [0, 4, 8, 9]) {
    assert.equal(getSummaryFrame(seconds).angle, 0);
    assert.deepEqual(getSummaryFrame(seconds).colors, X_COLORS);
  }
  for (const seconds of [11, 14, 18, 20]) {
    assert.equal(getSummaryFrame(seconds).angle, 90);
    assert.deepEqual(getSummaryFrame(seconds).colors, Y_COLORS);
  }
  assert.equal(getSummaryFrame(10).angle, 45);
  let previous = getSummaryFrame(9);
  for (let seconds = 9.025; seconds <= 11; seconds += .025) {
    const frame = getSummaryFrame(seconds);
    assert.ok(frame.angle >= previous.angle && frame.angle - previous.angle < 2);
    for (let region = 0; region < 5; region++) {
      assert.ok(distance(frame.colors[region], Y_COLORS[region]) <= distance(previous.colors[region], Y_COLORS[region]) + 1e-9);
    }
    previous = frame;
  }
});

test("paper-sampled colors preserve five x responses and an explicitly representative y color", () => {
  assert.ok([X_COLORS, Y_COLORS, DATA_Y_COLORS].every(Object.isFrozen));
  assert.deepEqual(X_COLORS, ["#defaa6", "#f6d4ef", "#ed9bfd", "#7cb7fd", "#01eefe"]);
  assert.deepEqual(DATA_Y_COLORS, ["#a6f9ff", "#9af7ff", "#8ff5ff", "#89f5ff", "#81f1fd"]);
  assert.deepEqual(Y_COLORS, Array(5).fill(DATA_Y_COLORS[2]));
  assert.equal(new Set(X_COLORS).size, 5);
  assert.equal(new Set(Y_COLORS).size, 1);
  assert.ok(new Set(DATA_Y_COLORS).size > 1, "the actual sampled y-map variation is retained separately");
  assert.ok(spread(X_COLORS) > 100);
  assert.ok(spread(DATA_Y_COLORS) < spread(X_COLORS) * .2);
});

test("palette provenance records the published figure and independently sampled x/y cells", () => {
  const provenance = JSON.parse(read("../scripts/polarization-color-samples.json"));
  assert.match(provenance.sourceUrl, /^https:\/\//);
  assert.match(JSON.stringify(provenance.figure), /1/);
  const size = Array.isArray(provenance.imageSize) ? provenance.imageSize : [provenance.imageSize.width, provenance.imageSize.height];
  assert.deepEqual(size, [1725, 971]);
  assert.match(JSON.stringify(provenance.conditions), /100/);
  assert.match(JSON.stringify(provenance.conditions), /180/);
  assert.match(JSON.stringify(provenance.method), /median/i);
  assert.match(JSON.stringify(provenance.method), /17/);
  assert.equal(provenance.samples.length, 5);
  assert.deepEqual(provenance.samples.map(sample => sample.rxNm), META_RADII);
  assert.deepEqual(provenance.samples.map(sample => sample.x.hex), X_COLORS);
  assert.deepEqual(provenance.samples.map(sample => sample.y.hex), DATA_Y_COLORS);
  assert.equal(provenance.representativeYColor, Y_COLORS[0]);
  assert.ok(provenance.scope, "sampling and representative-color limitations must be documented");
  for (const [index, sample] of provenance.samples.entries()) {
    const coordinates = center => Array.isArray(center) ? center : [center.x, center.y];
    assert.deepEqual(coordinates(sample.x.center), [1332 + 84 * index, 235]);
    assert.deepEqual(coordinates(sample.y.center), [1332 + 84 * index, 717]);
  }
});

test("white light arrives before the cavity responds and reflected light rises", () => {
  for (const offset of [0, 10]) {
    for (const local of [0, .8]) {
      const frame = getLightCycle(offset + local);
      assert.equal(frame.incidentProgress, 0);
      assert.equal(frame.incidentTailProgress, 0);
      assert.equal(frame.incidentOpacity, 0);
      assert.equal(frame.response, 0);
      assert.equal(frame.reflectedOpacity, 0);
    }
    const arriving = getLightCycle(offset + 1.8);
    assert.ok(arriving.incidentProgress > 0 && arriving.incidentProgress < 1);
    assert.equal(arriving.incidentOpacity, 1);
    assert.equal(arriving.response, 0);
    assert.equal(arriving.reflectedProgress, 0);
    for (let local = 0; local <= 2.95; local += .05) {
      const frame = getLightCycle(offset + local);
      assert.equal(frame.response, 0);
      assert.equal(frame.reflectedOpacity, 0, "a reflected beam must not appear before white light reaches the metamirror");
    }
    const response = getLightCycle(offset + 3.05);
    assert.equal(response.incidentProgress, 1);
    assert.equal(response.incidentTailProgress, 1);
    assert.equal(response.incidentOpacity, 0);
    assert.ok(response.response > 0 && response.response < 1);
    assert.equal(response.reflectedProgress, 0);
    assert.equal(response.reflectedOpacity, 0);
    const leaving = getLightCycle(offset + 3.4);
    assert.equal(leaving.response, 1);
    assert.ok(leaving.reflectedProgress > 0 && leaving.reflectedProgress < 1);
    assert.equal(leaving.reflectedOpacity, 1);
    const snapshot = getLightCycle(offset + 4);
    assert.equal(snapshot.incidentProgress, 1);
    assert.equal(snapshot.incidentTailProgress, 1);
    assert.equal(snapshot.incidentOpacity, 0);
    assert.equal(snapshot.response, 1);
    assert.equal(snapshot.reflectedProgress, 1);
    assert.equal(snapshot.reflectedOpacity, 1);
  }
});

test("light flow safely resets for y polarization and remains continuous at transition boundaries", () => {
  const keys = ["incidentProgress", "incidentTailProgress", "incidentOpacity", "response", "reflectedProgress", "reflectedOpacity"];
  for (const invalid of [NaN, Infinity, -Infinity, undefined, "not a number"]) {
    assert.deepEqual(getLightCycle(invalid), getLightCycle(0));
  }
  assert.deepEqual(getLightCycle(-5), getLightCycle(0));
  assert.deepEqual(getLightCycle(25), getLightCycle(20));
  for (let seconds = 0; seconds <= 20; seconds += .025) {
    const frame = getLightCycle(seconds);
    for (const key of keys) assert.ok(Number.isFinite(frame[key]) && frame[key] >= 0 && frame[key] <= 1, `${key} at ${seconds}s`);
  }
  for (const time of [9, 9.5, 10]) {
    const frame = getLightCycle(time);
    for (const key of ["incidentOpacity", "response", "reflectedOpacity"]) {
      assert.equal(frame[key], 0, `${key} resets during polarization change`);
    }
  }
  for (const time of [.9, 1, 1.1, 1.8, 2.6, 2.95, 3.15, 3.35, 4, 8, 9, 10, 10.9, 11, 11.1, 11.8, 12.6, 12.95, 13.15, 13.35, 14]) {
    const before = getLightCycle(time - 1e-5), after = getLightCycle(time + 1e-5);
    for (const key of ["incidentOpacity", "response", "reflectedOpacity"]) {
      assert.ok(Math.abs(after[key] - before[key]) < .001, `${key} cannot flash at ${time}s`);
    }
  }
});

test("white light fully clears before color appears, with one pass per polarization and no repeated pulses", () => {
  for (let step = 0; step <= 20000; step++) {
    const seconds = step / 1000;
    const frame = getLightCycle(seconds);
    assert.equal(frame.incidentOpacity * frame.reflectedOpacity, 0, `incoming and reflected beams cannot coexist at ${seconds}s`);
    assert.ok(frame.incidentTailProgress <= frame.incidentProgress, `the trailing edge cannot overtake the wavefront at ${seconds}s`);
    if (frame.reflectedOpacity > 0) {
      assert.equal(frame.incidentTailProgress, frame.incidentProgress, `all incoming light has left its path before reflection at ${seconds}s`);
    }
    assert.ok(Object.keys(frame).every(key => !/pulse/i.test(key)), "the animation no longer exposes recurring pulse state");
  }
  for (const offset of [0, 10]) {
    let previous = getLightCycle(offset), inputStarts = 0, outputStarts = 0;
    for (let step = 1; step < 10000; step++) {
      const local = step / 1000, frame = getLightCycle(offset + local);
      if (previous.incidentOpacity === 0 && frame.incidentOpacity > 0) inputStarts++;
      if (previous.reflectedOpacity === 0 && frame.reflectedOpacity > 0) outputStarts++;
      assert.ok(frame.incidentProgress >= previous.incidentProgress, "the incident front only advances downward");
      assert.ok(frame.incidentTailProgress >= previous.incidentTailProgress, "the trailing edge only advances downward");
      assert.ok(frame.reflectedProgress >= previous.reflectedProgress, "the reflected front only advances upward");
      if (local >= 2.95) assert.equal(frame.incidentOpacity, 0, "white light never reappears during the held color response");
      previous = frame;
    }
    assert.equal(inputStarts, 1);
    assert.equal(outputStarts, 1);
    const frontOnly = getLightCycle(offset + 1.5), draining = getLightCycle(offset + 2.5);
    assert.equal(frontOnly.incidentTailProgress, 0);
    assert.ok(draining.incidentTailProgress > 0 && draining.incidentTailProgress < draining.incidentProgress);
  }
  for (const path of ["../assets/polarization-scene.mjs", "../assets/polarization-summary.js", "../assets/polarization-summary.svg"]) {
    assert.doesNotMatch(read(path), /data-(?:input|output)-pulse|(?:incident|reflected)Pulse(?:Position|Opacity)|Traveling highlights/);
  }
});

test("five aligned 2×2 arrays have proportional short radii, one fixed long radius, and never morph", () => {
  assert.ok(Object.isFrozen(META_RADII));
  assert.deepEqual(META_RADII, [25, 30, 35, 40, 45]);
  assert.equal(LONG_RADIUS, 100);
  assert.equal(ARRAY_ROWS, 2);
  assert.equal(ARRAY_COLUMNS, 2);
  assert.deepEqual(META_PROJECTION, [1, 12 / 132, -38 / 80, 32 / 80]);
  const reference = createPolarizationSVG(0);
  const fixedAtoms = atoms(reference);
  assert.equal(fixedAtoms.length, META_RADII.length * ARRAY_ROWS * ARRAY_COLUMNS);
  assert.equal(new Set(fixedAtoms.map(atom => atom.match(/transform="([^"]+)"/)[1])).size, 20);
  const displayedRadii = [], arrayPositions = new Set();
  for (const atom of fixedAtoms) {
    const index = Number(atom.match(/data-region-index="(\d+)"/)[1]);
    const row = Number(atom.match(/data-array-row="(\d+)"/)[1]);
    const column = Number(atom.match(/data-array-column="(\d+)"/)[1]);
    assert.ok(index >= 0 && index < 5);
    assert.ok(row >= 0 && row < ARRAY_ROWS);
    assert.ok(column >= 0 && column < ARRAY_COLUMNS);
    arrayPositions.add(`${index}:${row}:${column}`);
    assert.equal(Number(atom.match(/data-radius-nm="([\d.]+)"/)[1]), META_RADII[index]);
    const [a, b, c, d, tx, ty] = atom.match(/matrix\(([^)]+)\)/)[1].split(/[\s,]+/).map(Number);
    [a, b, c, d].forEach((value, axis) => assert.ok(Math.abs(value - META_PROJECTION[axis]) < 1e-8));
    const center = projectPoint(index + [.27, .73][column], [.65, 1.85][row], 40);
    assert.ok(Math.abs(tx - center.x) < .0051, `aligned atom x in region ${index}`);
    assert.ok(Math.abs(ty - center.y) < .0051, `aligned atom y in region ${index}`);
    const radii = [...atom.matchAll(/<ellipse[^>]*rx="([\d.]+)" ry="([\d.]+)"/g)];
    assert.ok(radii.length >= 2, "each atom retains a solid top and side treatment");
    for (const [, rx, ry] of radii) {
      assert.ok(Math.abs(Number(rx) / Number(ry) - META_RADII[index] / LONG_RADIUS) < .001);
      assert.ok(Number(rx) < Number(ry), "the varied axis remains the short axis");
      assert.equal(Number(rx), META_RADII[index] * .4);
      assert.equal(Number(ry), LONG_RADIUS * .4);
    }
    displayedRadii.push({ index, radii: radii.map(([, rx, ry]) => [Number(rx), Number(ry)]) });
  }
  assert.equal(arrayPositions.size, 20, "each design has all four unique array positions");
  assert.equal(new Set(displayedRadii.flatMap(item => item.radii.map(([, ry]) => ry))).size, 1);
  assert.ok(displayedRadii.find(item => item.index === 4).radii[0][0] / displayedRadii.find(item => item.index === 0).radii[0][0] > 1.79);
  for (const seconds of [0, 2, 4, 9, 10, 11.5, 13, 14, 18, 20]) {
    const svg = createPolarizationSVG(seconds);
    assert.deepEqual(atoms(svg), fixedAtoms);
    assert.equal([...svg.matchAll(/data-beam-index="\d"/g)].length, 5);
    assert.doesNotMatch(svg, /NaN|Infinity|undefined|<animate(?:Transform|Motion)?\b/);
  }
  const controller = read("../assets/polarization-summary.js");
  assert.equal([...controller.matchAll(/stage\.innerHTML\s*=/g)].length, 1);
  assert.doesNotMatch(controller, /(?:atom|ellipse)[\w.]*\.setAttribute\(["'](?:rx|ry|points|d|transform)["']/i);
  assert.doesNotMatch(controller.slice(controller.indexOf("mountSummaryPlayer(root")), /innerHTML\s*=/);
});

test("all twenty atom bases extrude vertically onto the spacer without lateral skew", () => {
  const fixedAtoms = atoms(createPolarizationSVG(4));
  assert.equal(fixedAtoms.length, 20);
  for (const atom of fixedAtoms) {
    const [a, b, c, d, tx, ty] = atom.match(/matrix\(([^)]+)\)/)[1].split(/[\s,]+/).map(Number);
    const ellipses = [...atom.matchAll(/<ellipse([^>]*)\/>/g)].map(match => match[1]);
    assert.equal(ellipses.length, 2, "the atom has distinct lower and upper elliptical faces");
    const centers = ellipses.map(ellipse => {
      const cx = Number(ellipse.match(/\bcx="([\d.-]+)"/)?.[1] ?? 0);
      const cy = Number(ellipse.match(/\bcy="([\d.-]+)"/)?.[1] ?? 0);
      return { x: a * cx + c * cy + tx, y: b * cx + d * cy + ty };
    });
    const [lower, upper] = centers;
    assert.ok(Math.abs(lower.x - upper.x) < 1e-9, "the extrusion must not shear sideways");
    assert.ok(Math.abs(lower.y - upper.y - 24) < 1e-9, "z=40 atom top must reach the z=16 SiO₂ surface");
  }
});

test("MIM structure, planarization, and upper mirror are explicitly layered in the device", () => {
  const keys = ["bottom-al", "gap-sio2", "nano-ellipse", "dcsl", "top-ag"];
  assert.deepEqual(LAYERS.map(layer => layer.key), keys);
  assert.deepEqual(LAYERS.map(layer => layer.thicknessNm), [150, 20, 20, 180, 15]);
  assert.ok(Object.isFrozen(LAYERS) && LAYERS.every(Object.isFrozen));
  const svg = createPolarizationSVG(4);
  let previous = -1;
  for (const key of keys) {
    const match = svg.match(new RegExp(`<g[^>]*class="ps-layer"[^>]*data-layer="${key}"[^>]*>`));
    assert.ok(match, `Missing visible layer: ${key}`);
    assert.ok(match.index > previous, `${key} is ordered above the previous layer`);
    previous = match.index;
  }
});

test("white incidence and all five reflected beams are normal to the horizontal device", () => {
  const svg = createPolarizationSVG(4);
  const rays = [...svg.matchAll(/<[^>]*data-origin="([\d.-]+),([\d.-]+)"[^>]*data-tip="([\d.-]+),([\d.-]+)"[^>]*>/g)];
  assert.equal(rays.length, 10, "all five normal inputs and all five outputs must be explicit");
  assert.equal([...svg.matchAll(/data-input-index="\d"/g)].length, 5);
  let downward = 0;
  let upward = 0;
  for (const [, x0, y0, x1, y1] of rays) {
    assert.equal(Number(x0), Number(x1), "beam centerlines must have no lateral displacement");
    assert.notEqual(Number(y0), Number(y1));
    if (Number(y1) > Number(y0)) downward++;
    else upward++;
  }
  assert.equal(downward, 5, "white light travels downward at each representative design");
  assert.equal(upward, 5, "one reflected beam travels upward for each radius case");
});

test("SVG light reveals and arrowheads move along their normal-incidence paths rather than cross-fading two stills", () => {
  const attribute = (tag, name) => Number(tag.match(new RegExp(`\\b${name}="([\\d.-]+)"`))?.[1]);
  const translate = tag => tag.match(/translate\(([^)]+)\)/)[1].split(/[\s,]+/).map(Number);
  for (const seconds of [0, 1.3, 1.8, 2.6, 2.8, 3.1, 3.4, 4, 8.5, 9, 10, 11.8, 12.8, 13.4, 14, 20]) {
    const svg = createPolarizationSVG(seconds), frame = getLightCycle(seconds);
    const inputRays = [...svg.matchAll(/<g class="ps-incident-ray"[^>]*>/g)].map(match => match[0]);
    const outputRays = [...svg.matchAll(/<g data-beam-index="\d+"[^>]*>/g)].map(match => match[0]);
    const inputs = [...svg.matchAll(/<rect data-input-reveal[^>]*\/>/g)].map(match => match[0]);
    const outputs = [...svg.matchAll(/<rect data-output-reveal[^>]*\/>/g)].map(match => match[0]);
    const inputHeads = [...svg.matchAll(/<g data-input-head[^>]*>/g)].map(match => translate(match[0]));
    const outputHeads = [...svg.matchAll(/<g data-output-head[^>]*>/g)].map(match => translate(match[0]));
    for (const group of [inputRays, outputRays, inputs, outputs, inputHeads, outputHeads]) assert.equal(group.length, 5);
    for (let region = 0; region < 5; region++) {
      const inputLength = attribute(inputRays[region], "data-length"), outputLength = attribute(outputRays[region], "data-length");
      const inputOriginY = Number(inputRays[region].match(/data-origin="[\d.-]+,([\d.-]+)"/)[1]);
      const outputOriginY = Number(outputRays[region].match(/data-origin="[\d.-]+,([\d.-]+)"/)[1]);
      assert.ok(Math.abs(attribute(inputs[region], "height") - inputLength * (frame.incidentProgress - frame.incidentTailProgress)) < 1e-8);
      assert.ok(Math.abs(attribute(inputs[region], "y") - (inputOriginY + inputLength * frame.incidentTailProgress)) < 1e-8);
      assert.ok(Math.abs(attribute(outputs[region], "height") - outputLength * frame.reflectedProgress) < 1e-8);
      assert.ok(Math.abs(attribute(outputs[region], "y") - (outputOriginY - outputLength * frame.reflectedProgress)) < 1e-8);
      assert.equal(inputHeads[region][0], 0);
      assert.equal(outputHeads[region][0], 0);
      assert.ok(Math.abs(inputHeads[region][1] - (frame.incidentProgress - 1) * inputLength) < 1e-8);
      assert.ok(Math.abs(outputHeads[region][1] - (1 - frame.reflectedProgress) * outputLength) < 1e-8);
    }
    assert.equal(Number(svg.match(/class="ps-illumination" opacity="([\d.]+)"/)[1]), frame.incidentOpacity);
    assert.equal(Number(svg.match(/class="ps-output-rays" opacity="([\d.]+)"/)[1]), frame.reflectedOpacity);
  }
});

test("device polygons, ray endpoints, text and atoms fit the SVG viewport", () => {
  const svg = createPolarizationSVG(20);
  const [left, top, width, height] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  function inside(x, y, label) {
    assert.ok(Number.isFinite(x) && x >= left && x <= left + width, `${label} x=${x}`);
    assert.ok(Number.isFinite(y) && y >= top && y <= top + height, `${label} y=${y}`);
  }
  for (const [, coordinates] of svg.matchAll(/<polygon points="([^"]+)"/g)) {
    for (const coordinate of coordinates.split(/\s+/)) inside(...coordinate.split(",").map(Number), "polygon");
  }
  for (const atom of atoms(svg)) {
    const matrix = atom.match(/matrix\(([^)]+)\)/)[1].split(/[\s,]+/).map(Number);
    const [a, b, c, d, tx, ty] = matrix;
    for (const [, ellipse] of atom.matchAll(/<ellipse([^>]*)\/>/g)) {
      const attribute = (name, fallback = 0) => Number(ellipse.match(new RegExp(`\\b${name}="([\\d.-]+)"`))?.[1] ?? fallback);
      const rx = attribute("rx"), ry = attribute("ry"), cx = attribute("cx"), cy = attribute("cy");
      const centerX = a * cx + c * cy + tx, centerY = b * cx + d * cy + ty;
      const extentX = Math.hypot(a * rx, c * ry), extentY = Math.hypot(b * rx, d * ry);
      inside(centerX - extentX, centerY - extentY, "meta-atom bounds");
      inside(centerX + extentX, centerY + extentY, "meta-atom bounds");
    }
  }
  for (const [, x, y] of svg.matchAll(/<text x="([-\d.]+)" y="([-\d.]+)"/g)) inside(Number(x), Number(y), "text anchor");
  const output = svg.slice(svg.indexOf('<g class="ps-output-rays"'), svg.indexOf('<g class="ps-layer-labels"'));
  assert.ok(output.length > 0);
  for (const [, d] of output.matchAll(/<path[^>]* d="([^"]+)"/g)) {
    for (const [, x, y] of d.matchAll(/[ML]([-\d.]+),([-\d.]+)/g)) inside(Number(x), Number(y), "output ray");
  }
  for (const [, x, y] of svg.matchAll(/data-(?:origin|tip)="([\d.-]+),([\d.-]+)"/g)) inside(Number(x), Number(y), "ray endpoint");
});

test("static fallback is the x-polarized frame and includes self-contained accessible SVG", () => {
  const fallback = read("../assets/polarization-summary.svg").trim();
  assert.equal(fallback, createPolarizationSVG(4).trim());
  assert.equal(createPolarizationSVG(4), createPolarizationSVG(4));
  assert.match(fallback, /role="img" aria-labelledby="ps-title ps-desc"/);
  assert.match(fallback, /<title id="ps-title">/);
  assert.match(fallback, /<desc id="ps-desc">/);
  assert.match(fallback, /(?:paper|Fig(?:ure)?\.?\s*1)/i);
  assert.doesNotMatch(fallback, /Illustrative colors|neither palette is sampled/);
  const ids = [...fallback.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of fallback.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(id), `Missing SVG resource: ${id}`);
  assert.doesNotMatch(fallback, /<(?:script|image|foreignObject)\b|\b(?:href|src)="https?:/);
});

test("publication actions distinguish the publisher paper from the local 20-second summary", () => {
  const list = read("../publications.html");
  const html = read("../publications/polarization-decoupled-cavity.html");
  assert.match(list, /href="https:\/\/doi\.org\/10\.1088\/2040-8986\/ae90be">Paper/);
  assert.match(list, /href="publications\/polarization-decoupled-cavity\.html\?v=\d+">Summary<\/a>/);
  assert.match(html, /href="https:\/\/doi\.org\/10\.1088\/2040-8986\/ae90be">the published paper/);
  assert.match(html, /Source:/);
  assert.match(html, /rendered-image colors, not colors recomputed from spectral data/);
  assert.match(html, /representative cyan.*small variation/);
  assert.match(html, /not time-resolved simulations, a calculated polarization sweep, or measured footage/);
  assert.match(html, /Geometry remains fixed/);
  assert.match(html, /polarization-summary\.svg\?v=\d+/);
  assert.match(html, /polarization-summary\.js\?v=\d+" type="module"/);
  assert.doesNotMatch(html, /<iframe\b|<video\b/);
});

test("summary page exposes only x-pol and y-pol snapshots, without numbered scene buttons or comparison", () => {
  const html = read("../publications/polarization-decoupled-cavity.html");
  for (const control of ["play", "replay", "seek", "time", "status", "stage", "title", "caption", "angle"]) {
    assert.match(html, new RegExp(`data-summary-${control}(?:[\\s>])`));
  }
  assert.match(html, /data-summary-controls hidden/);
  assert.match(html, /data-summary-seek type="range" min="0" max="20" value="0" step="0\.05"/);
  const times = [...html.matchAll(/data-summary-chapter data-time="([\d.]+)"/g)].map(match => Number(match[1]));
  assert.deepEqual(times, [4, 14]);
  const snapshots = [...html.matchAll(/<button[^>]*data-summary-chapter[^>]*>([\s\S]*?)<\/button>/g)].map(match => match[1].trim());
  assert.deepEqual(snapshots, ["x-pol", "y-pol"]);
  assert.doesNotMatch(html, /data-summary-comparison|paper-film-comparison|<span>(?:00|04|09|14|18)<\/span>/);
  const controller = read("../assets/polarization-summary.js");
  assert.equal([...html.matchAll(/\bdata-summary-play(?:\s|>)/g)].length, 1, "only the player controls contain a Play button");
  assert.doesNotMatch(html + controller + read("../assets/paper-summary.css"), /paper-preview-play|data-summary-preview-play|previewPlay/);
  assert.doesNotMatch(controller, /data-summary-comparison|comparison\.style/);
  assert.match(controller, /if\(root\)/);
  assert.match(controller, /mountSummaryPlayer\(root,\{duration:20,autoplay:true,respectReducedMotion:false/);
  assert.match(controller, /\.hidden=false/);
  assert.doesNotMatch(controller + read("../assets/polarization-scene.mjs"), /\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
});
