// Optical display-color samples from Figure 1(e–f), DOI 10.1088/2040-8986/ae90be.
// The x samples correspond to r_x = 25, 30, 35, 40, 45 nm (r_y = 100 nm).
// A single representative y sample intentionally idealizes the small differences
// in the paper. Interpolation is a UI transition, not an optical simulation.
export const X_COLORS = Object.freeze(['#defaa6', '#f6d4ef', '#ed9bfd', '#7cb7fd', '#01eefe']);
export const Y_COLOR = '#8ff5ff';

const SVG_NS = 'http://www.w3.org/2000/svg';
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const xRgb = X_COLORS.map(rgb);
const yRgb = rgb(Y_COLOR);

export function colorPalette(amount = 0) {
  const clamped = Math.max(0, Math.min(1, amount));
  const t = Number.isNaN(clamped) ? 0 : clamped;
  return xRgb.map(color => `rgb(${color.map((v, i) => Math.round(yRgb[i] + (v - yRgb[i]) * t)).join(',')})`);
}

/** Mount the approved 960 × 720 floral artwork into an empty SVG group. */
export function mountFlower(paintingElement) {
  const document = paintingElement.ownerDocument;
  const colored = [];
  const mark = (name, attributes, color, parent = paintingElement, stroke = false) => {
    const element = document.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    if (color !== null) {
      const attribute = stroke ? 'stroke' : 'fill';
      element.setAttribute(attribute, Y_COLOR);
      element.setAttribute('data-geometry', String(color));
      colored.push({element, color, attribute});
    }
    parent.appendChild(element);
    return element;
  };
  const group = (attributes, parent = paintingElement) => mark('g', attributes, null, parent);
  const curvePoint = (a, b, c, d, t) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;

  // The background uses the fifth geometry, so it shares the y-pol response.
  mark('rect', {x: 0, y: 0, width: 960, height: 720}, 4);
  const stems = group({'data-part': 'stems'});
  const blooms = group({'data-part': 'flowers'});
  const flowers = [
    {x:90,y:146,r:44,p:8,c:0,a:2,center:1,tilt:-8,base:135},
    {x:250,y:128,r:51,p:7,c:2,a:1,center:0,tilt:12,base:292},
    {x:476,y:173,r:85,p:8,c:3,a:1,center:2,tilt:-9,base:409},
    {x:674,y:99,r:37,p:6,c:1,a:2,center:0,tilt:12,base:635},
    {x:877,y:155,r:54,p:8,c:0,a:1,center:2,tilt:8,base:829},
    {x:191,y:309,r:104,p:9,c:1,a:2,center:0,tilt:-5,base:259},
    {x:752,y:305,r:119,p:8,c:2,a:1,center:0,tilt:10,base:674},
    {x:487,y:416,r:113,p:9,c:1,a:2,center:3,tilt:7,base:519},
    {x:54,y:481,r:50,p:7,c:2,a:1,center:0,tilt:-11,base:86},
    {x:242,y:547,r:85,p:8,c:3,a:1,center:0,tilt:-8,base:202},
    {x:829,y:550,r:93,p:9,c:0,a:2,center:1,tilt:8,base:846},
    {x:604,y:628,r:65,p:7,c:2,a:1,center:0,tilt:-5,base:634},
    {x:398,y:650,r:45,p:7,c:0,a:2,center:1,tilt:6,base:400}
  ];

  function leaf(x, y, rotation, size, color) {
    const node = group({transform: `translate(${x} ${y}) rotate(${rotation}) scale(${size})`}, stems);
    mark('path', {d: 'M0 0 C-36 -10 -63 -52 -57 -91 C-16 -80 9 -42 0 0 Z'}, color, node);
    mark('path', {d: 'M0 0 Q-25 -39 -45 -73', fill: 'none', 'stroke-width': 2.1, 'stroke-linecap': 'round'}, 3, node, true);
  }

  for (let i = 0; i < flowers.length; i++) {
    const f = flowers[i], bx = f.base, by = 752;
    const c1x = bx + (i % 2 ? -34 : 35), c1y = by - 155;
    const c2x = f.x + (i % 2 ? 29 : -28), c2y = f.y + 116;
    mark('path', {d: `M${bx} ${by} C${c1x} ${c1y} ${c2x} ${c2y} ${f.x} ${f.y}`, fill: 'none', 'stroke-width': f.r > 70 ? 7 : 5, 'stroke-linecap': 'round'}, 3, stems, true);
    const positions = f.y < 450 ? [.18, .38, .58, .77] : [.28, .62];
    positions.forEach((t, j) => {
      const x = curvePoint(bx, c1x, c2x, f.x, t), y = curvePoint(by, c1y, c2y, f.y, t);
      const right = (i + j) % 2 === 0;
      const size = (.54 + (1 - t) * .35) * (f.r > 65 ? 1 : .72);
      leaf(x, y, right ? 91 : -24, size, 0);
    });
  }

  // Small stems and seed heads fill the spaces without introducing new colors.
  for (const [x, y, height] of [[335,697,160], [705,700,110], [924,702,264], [32,700,102]]) {
    mark('path', {d: `M${x} ${y} Q${x - 22} ${y - height * .6} ${x + 7} ${y - height}`, fill: 'none', 'stroke-width': 4, 'stroke-linecap': 'round'}, 3, stems, true);
    for (let j = 0; j < 5; j++) {
      mark('ellipse', {cx: x + (j % 2 ? 13 : -9), cy: y - height + 18 + j * 16, rx: 8, ry: 13, transform: `rotate(${j % 2 ? 35 : -35} ${x + (j % 2 ? 13 : -9)} ${y - height + 18 + j * 16})`}, j % 2 ? 1 : 0, stems);
    }
  }

  function blossom(f, index) {
    const node = group({transform: `translate(${f.x} ${f.y}) rotate(${f.tilt})`}, blooms);
    const r = f.r, w = r * .34;
    for (let j = 0; j < f.p; j++) {
      const petal = group({transform: `rotate(${j * 360 / f.p})`}, node);
      mark('path', {d: `M0 ${r * .08} C${-w} ${-r * .12} ${-w * 1.1} ${-r * .79} ${-w * .45} ${-r * .98} C${-w * .2} ${-r * 1.08} ${w * .1} ${-r * 1.02} 0 ${-r * .94} C${w * .34} ${-r * 1.07} ${w * .77} ${-r * .97} ${w * .88} ${-r * .77} C${w * 1.1} ${-r * .46} ${w * .6} ${-r * .03} 0 ${r * .08} Z`}, f.c, petal);
      mark('path', {d: `M0 ${-r * .16} C${-r * .08} ${-r * .28} ${-r * .065} ${-r * .51} ${-r * .01} ${-r * .69} C${r * .034} ${-r * .48} ${r * .055} ${-r * .28} 0 ${-r * .16} Z`}, f.a, petal);
    }
    // Scalloped inner rosettes and pollen preserve the approved flat-print art.
    for (let j = 0; j < f.p; j++) {
      const angle = (j + .5) * Math.PI * 2 / f.p;
      mark('ellipse', {cx: Math.sin(angle) * r * .23, cy: Math.cos(angle) * r * .23, rx: r * .11, ry: r * .19, transform: `rotate(${-angle * 180 / Math.PI} ${Math.sin(angle) * r * .23} ${Math.cos(angle) * r * .23})`}, f.a, node);
    }
    mark('circle', {r: r * .19}, f.center, node);
    mark('circle', {r: r * .095}, index % 2 ? 3 : 2, node);
    for (let j = 0; j < 11; j++) {
      const a = j * Math.PI * 2 / 11;
      mark('circle', {cx: Math.sin(a) * r * .145, cy: Math.cos(a) * r * .145, r: Math.max(1.7, r * .018)}, index % 2 ? 1 : 2, node);
    }
  }
  flowers.forEach(blossom);

  function paint(amount) {
    const palette = colorPalette(amount);
    for (const item of colored) item.element.setAttribute(item.attribute, palette[item.color]);
  }
  paint(0);
  return {paint};
}
