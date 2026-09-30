import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {X_COLORS, Y_COLOR, colorPalette, mountFlower} from '../assets/polarization-flower.mjs';

class SvgElement {
  constructor(name, document) {
    this.name = name;
    this.ownerDocument = document;
    this.attributes = {};
    this.children = [];
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  appendChild(child) { this.children.push(child); return child; }
}

function fixture() {
  const document = {
    createElementNS(namespace, name) {
      assert.equal(namespace, 'http://www.w3.org/2000/svg');
      return new SvgElement(name, document);
    }
  };
  const painting = new SvgElement('g', document);
  const api = mountFlower(painting);
  const nodes = [];
  const visit = element => { nodes.push(element); element.children.forEach(visit); };
  visit(painting);
  const marks = nodes.filter(node => Object.hasOwn(node.attributes, 'data-geometry'));
  return {painting, api, nodes, marks};
}

const markColor = mark => mark.attributes.stroke ?? mark.attributes.fill;

test('flower palette keeps the five published x samples and representative y sample', () => {
  assert.deepEqual(X_COLORS, ['#defaa6', '#f6d4ef', '#ed9bfd', '#7cb7fd', '#01eefe']);
  assert.equal(Y_COLOR, '#8ff5ff');
  assert.deepEqual(colorPalette(0), Array(5).fill('rgb(143,245,255)'));
  assert.deepEqual(colorPalette(1), ['rgb(222,250,166)', 'rgb(246,212,239)', 'rgb(237,155,253)', 'rgb(124,183,253)', 'rgb(1,238,254)']);
});

test('UI interpolation is clamped and remains deterministic', () => {
  assert.deepEqual(colorPalette(-5), colorPalette(0));
  assert.deepEqual(colorPalette(5), colorPalette(1));
  assert.deepEqual(colorPalette(-Infinity), colorPalette(0));
  assert.deepEqual(colorPalette(Infinity), colorPalette(1));
  assert.deepEqual(colorPalette(NaN), colorPalette(0));
  assert.deepEqual(colorPalette(), colorPalette(0));
  assert.deepEqual(colorPalette(.5), ['rgb(183,248,211)', 'rgb(195,229,247)', 'rgb(190,200,254)', 'rgb(134,214,254)', 'rgb(72,242,255)']);
});

test('art preserves all 594 marks, 13 flowers, and five geometry classes', () => {
  const {painting, nodes, marks} = fixture();
  assert.equal(marks.length, 594);
  assert.equal(nodes.find(node => node.attributes['data-part'] === 'flowers').children.length, 13);
  assert.deepEqual([...new Set(marks.map(mark => mark.attributes['data-geometry']))].sort(), ['0', '1', '2', '3', '4']);
  const background = painting.children[0];
  assert.equal(background.name, 'rect');
  assert.deepEqual(background.attributes, {x: '0', y: '0', width: '960', height: '720', fill: 'rgb(143,245,255)', 'data-geometry': '4'});
});

test('every original floral shape and transform is preserved', () => {
  const {painting} = fixture();
  // Baseline independently computed from the user-approved inline fragment.
  const snapshot = node => ({
    name: node.name,
    attributes: Object.fromEntries(Object.entries(node.attributes).map(([key, value]) => [key,
      /^(fill|stroke)$/.test(key) && value !== 'none' ? 'color' : value])),
    children: node.children.map(snapshot)
  });
  const digest = createHash('sha256').update(JSON.stringify(snapshot(painting))).digest('hex');
  assert.equal(digest, '74648f0ea851c8b838e561c803af996240b7abb000904a1b870fa356ab8dc2e1');
});

test('initial y state conceals every mark, and x state adds no extra colors', () => {
  const {api, marks} = fixture();
  assert.deepEqual([...new Set(marks.map(markColor))], ['rgb(143,245,255)']);
  api.paint(1);
  assert.deepEqual([...new Set(marks.map(markColor))].sort(), [...colorPalette(1)].sort());
  for (const mark of marks) assert.equal(markColor(mark), colorPalette(1)[Number(mark.attributes['data-geometry'])]);
  api.paint(0);
  assert.deepEqual([...new Set(marks.map(markColor))], ['rgb(143,245,255)']);
});

test('multiple flower instances are independent', () => {
  const first = fixture(), second = fixture();
  first.api.paint(1);
  assert.equal(new Set(first.marks.map(markColor)).size, 5);
  assert.equal(new Set(second.marks.map(markColor)).size, 1);
});

test('static fallback retains all art and labels it as an illustrative application', async () => {
  const svg = await readFile(new URL('../assets/polarization-flower.svg', import.meta.url), 'utf8');
  assert.match(svg, /viewBox="0 0 960 720"/);
  assert.match(svg, /Illustrative application concept/);
  assert.match(svg, /not a fabricated or measured/);
  assert.equal((svg.match(/data-geometry=/g) ?? []).length, 594);
  const colors = [...svg.matchAll(/(?:fill|stroke)="(rgb\([^)]+\))"/g)].map(match => match[1]);
  assert.deepEqual([...new Set(colors)].sort(), [...colorPalette(1)].sort());
  assert.doesNotMatch(svg, /<script|https?:\/\/(?!www\.w3\.org)/);
});
