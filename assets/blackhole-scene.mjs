// Illustration coordinates only, not device dimensions or simulated fields.
export const COMPONENT_DESCRIPTIONS = Object.freeze({
  all: "White illumination terminates at the black matrix. Curved arrows show cavity round trips above the metamirrors, with selected RGB components building toward top emission.",
  oled: "White OLED stack — a joined, schematic laminate supplies broadband emission. Layer colors distinguish regions, not separate red, green and blue OLEDs or a particular emitter sequence.",
  mirrors: "RGB metamirrors — curved arrows follow the upward and downward cavity paths. Increasing color prominence illustrates spectral selection, not photons changing wavelength.",
  absorbers: "Black matrix — incoming wavefronts lose brightness across the ring–disk boundaries while the square metamirror regions remain illuminated. Absorption strength and timing are illustrative."
});

const PALETTE = {
  r: { light: "#ffd8d1", main: "#ff493d", dark: "#982127" },
  g: { light: "#d5ffe4", main: "#33f590", dark: "#14794f" },
  b: { light: "#dbedff", main: "#388dff", dark: "#2055a9" }
};
const BAYER_TILE = [["r", "g"], ["g", "b"]];
// A cropped 4-by-3 window of the repeating RG/GB Bayer tile.
const ROWS = Array.from({length:3},(_,row) => Array.from({length:4},(_,col) => BAYER_TILE[row%2][col%2]));
export const SUBPIXELS = Object.freeze(ROWS.flatMap((channels, row) => channels.map((channel, col) => Object.freeze({ row, col, x: col + .5, y: row + .5, channel }))));
export const SCENE_GEOMETRY = Object.freeze({
  bottomPlane: 12, substrateBottom: -30,
  whiteEmissionPlanes: Object.freeze([286]),
  cavityUpperPlane: 300, outputPlane: 300, beamLength: 126,
  boundaryFade: 36, colorStart: 48, colorFull: 68,
  beamStart: 74, beamFull: 86, cycleSeconds: 16
});
// Joined display-only strata, not a disclosed layer recipe or emitter sequence.
export const OLED_LAYERS = Object.freeze([
  { key: "lower-interface", bottom: 278, top: 282, color: "#34475b" },
  { key: "emissive-region", bottom: 282, top: 288, color: "#dfedf6" },
  { key: "transport-region", bottom: 288, top: 294, color: "#506174" },
  { key: "upper-interface", bottom: 294, top: 300, color: "#8596a9" }
].map(Object.freeze));
export const WAVEFRONTS = Object.freeze([
  { start: 1, arrival: 14 }, { start: 10, arrival: 23 }, { start: 19, arrival: 32 }
].map(Object.freeze));
// Three schematic round trips, then a final ascent through the output interface.
export const CAVITY_STOPS = Object.freeze([
  { time: 38, plane: 12 }, { time: 43, plane: 300 }, { time: 48, plane: 12 },
  { time: 53, plane: 300 }, { time: 58, plane: 12 }, { time: 63, plane: 300 },
  { time: 68, plane: 12 }, { time: 74, plane: 300 }
].map(Object.freeze));
export function cavityArrowAt(phase) {
  const t = Math.max(38, Math.min(74, phase));
  const height = SCENE_GEOMETRY.cavityUpperPlane-SCENE_GEOMETRY.bottomPlane;
  if (t < 68) {
    const theta = (t-38)*Math.PI/5;
    const turn = Math.floor((t-38)/10);
    let angle = Math.atan2(-height/2*Math.sin(theta),-18*Math.cos(theta))*180/Math.PI;
    if (angle < 180-1e-8) angle += 360;
    return { x: -18*Math.sin(theta), y: -height/2*(1-Math.cos(theta)), angle: angle+turn*360 };
  }
  // The final reflected branch bends into the common vertical output axis.
  const u = (t-68)/6, v = 1-u;
  const x = -66*v*v*u, y = -height*(2.1*v*u*u+u*u*u);
  const dx = -66*(1-4*u+3*u*u), dy = -height*(4.2*u-3.3*u*u);
  let angle = Math.atan2(dy,dx)*180/Math.PI;
  if (angle < 180-1e-8) angle += 360;
  return { x, y, angle: angle+1080 };
}
export function projectPoint(x, y, z = 0) {
  return { x: 430 + x * 90 - y * 70, y: 450 + x * 18 + y * 26 - z };
}
const n = value => Number(value.toFixed(2));
const point = (x, y, z = 0) => { const p = projectPoint(x, y, z); return `${n(p.x)},${n(p.y)}`; };
const polygon = (corners, attrs = "") => `<polygon points="${corners.map(c => point(...c)).join(" ")}" ${attrs}/>`;
const plane = (x, y, w, h, z, attrs) => polygon([[x, y, z], [x + w, y, z], [x + w, y + h, z], [x, y + h, z]], attrs);

export function createBlackholeSVG({ focus = "all", playing = false, animated = playing, compactView = false } = {}) {
  if (!Object.hasOwn(COMPONENT_DESCRIPTIONS, focus)) throw new RangeError("Unknown component focus");
  const { bottomPlane, substrateBottom, whiteEmissionPlanes, cavityUpperPlane, outputPlane, beamLength, boundaryFade, colorStart, colorFull, beamStart, beamFull, cycleSeconds } = SCENE_GEOMETRY;
  const parts = [];
  const contour = (x,y,w,h,z) => `M${point(x,y,z)}L${point(x+w,y,z)}L${point(x+w,y+h,z)}L${point(x,y+h,z)}Z`;
  // Fixed, exact square apertures: only boundary brightness changes, never size.
  const boundaryAt = z => contour(0,0,4,3,z) + SUBPIXELS.map(({col,row}) => contour(col+.1,row+.1,.8,.8,z)).join("");
  const boundaryContour = boundaryAt(whiteEmissionPlanes[0]);
  const sourceCorners = [[0,0],[4,0],[4,3],[0,3]].map(([x,y]) => projectPoint(x,y,whiteEmissionPlanes[0]));
  const maskX = Math.min(...sourceCorners.map(p=>p.x))-8, maskY = Math.min(...sourceCorners.map(p=>p.y))-8;
  const maskWidth = Math.max(...sourceCorners.map(p=>p.x))-maskX+8, maskHeight = Math.max(...sourceCorners.map(p=>p.y))-maskY+8;
  const waveMasks = WAVEFRONTS.map((_,i) => `<mask id="bh-wave-envelope-${i}" maskUnits="userSpaceOnUse" x="${maskX}" y="${maskY}" width="${maskWidth}" height="${maskHeight}" style="mask-type:luminance">
    ${plane(0,0,4,3,whiteEmissionPlanes[0], 'fill="white"')}
    <path class="bh-motion bh-boundary-cut" data-front="${i}" d="${boundaryContour}" fill="black" fill-rule="evenodd"/>
  </mask>`).join("");
  const waveKeyframes = WAVEFRONTS.map(({start,arrival},i) => `
    svg[data-animated="true"] .bh-wavefront[data-front="${i}"] { animation-name:bh-wave-${i}; }
    @keyframes bh-wave-${i} {
      0%,${start}%{opacity:0;transform:translateY(0)}
      ${start+2}%{opacity:.42;transform:translateY(0)}
      ${arrival}%,41%{opacity:.42;transform:translateY(var(--wave-distance))}
      62%{opacity:.12;transform:translateY(var(--wave-distance))}
      88%{opacity:.04;transform:translateY(var(--wave-distance))}
      100%{opacity:0;transform:translateY(var(--wave-distance))}
    }`).join("");
  const arrowTransform = phase => {
    const p = cavityArrowAt(phase);
    return `translate(${n(p.x)}px,${n(p.y)}px) rotate(${n(p.angle)}deg)`;
  };
  const cavityTravel = Array.from({length:73},(_,i)=>38+i*.5).map(phase => `${phase}%{transform:${arrowTransform(phase)}}`).join("\n");
  const colorDefinitions = Object.entries(PALETTE).map(([key,c]) => `
    <linearGradient id="bh-post-${key}"><stop stop-color="${c.dark}"/><stop offset=".55" stop-color="${c.main}"/><stop offset="1" stop-color="${c.dark}"/></linearGradient>
    <linearGradient id="bh-volume-${key}"><stop stop-color="${c.main}" stop-opacity="0"/><stop offset=".17" stop-color="${c.main}" stop-opacity=".82"/><stop offset=".43" stop-color="${c.light}"/><stop offset=".6" stop-color="${c.main}"/><stop offset=".84" stop-color="${c.main}" stop-opacity=".85"/><stop offset="1" stop-color="${c.main}" stop-opacity="0"/></linearGradient>
    <radialGradient id="bh-cap-${key}"><stop stop-color="${c.light}"/><stop offset=".5" stop-color="${c.main}"/><stop offset="1" stop-color="${c.dark}"/></radialGradient>
    <g id="bh-pillar-${key}"><path d="M-5.8,-8v8a5.8,2.7 0 0 0 11.6,0v-8Z" fill="url(#bh-post-${key})"/><path d="M-2.7,-7v7" stroke="${c.light}" stroke-opacity=".42" stroke-width="1.2"/><ellipse cy="-8" rx="5.8" ry="2.7" fill="${c.light}" stroke="${c.main}" stroke-width=".7"/></g>`).join("");
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${compactView ? "185 24 645 626" : "0 0 960 660"}" width="${compactView ? 645 : 960}" height="${compactView ? 626 : 660}" role="img" aria-labelledby="bh-title bh-desc" data-focus="${focus}" data-playing="${Boolean(playing)}" data-animated="${Boolean(animated)}" data-compact="${Boolean(compactView)}">
  <title id="bh-title">Project Blackhole: white wavefronts, boundary absorption and RGB emission</title>
  <desc id="bh-desc">Three translucent white wavefronts illuminate the array. Illumination progressively darkens across the ring–disk black-matrix boundaries while square metamirror regions remain lit. Curved directional arrows illustrate three Fabry–Pérot cavity round trips across an enlarged viewing gap, becoming more strongly red, green or blue as the selected spectral component is emphasized. A final ascent feeds bright volumetric beams above a joined white-OLED stack. The stack has adjacent graphite-colored strata and a narrow white emissive band, not separated glass panes or separate RGB OLEDs. Conceptual schematic, not calculated performance; the curved paths are not literal ray trajectories or simulated fields. Wavefronts symbolize broadband illumination. Color buildup illustrates spectral selection, not frequency conversion or optical gain. Layer colors and relative thicknesses do not specify materials or an emitter recipe.</desc>
  <defs>
    <linearGradient id="bh-base" x2=".8" y2="1"><stop stop-color="#263b50"/><stop offset="1" stop-color="#142435"/></linearGradient>
    <linearGradient id="bh-substrate-front" x2="0" y2="1"><stop stop-color="#45607c"/><stop offset=".35" stop-color="#2b415d"/><stop offset="1" stop-color="#172a43"/></linearGradient>
    <linearGradient id="bh-substrate-side" x2="0" y2="1"><stop stop-color="#334a67"/><stop offset="1" stop-color="#12233a"/></linearGradient>
    <linearGradient id="bh-absorber-side"><stop stop-color="#455971"/><stop offset=".5" stop-color="#90a6bb"/><stop offset="1" stop-color="#455971"/></linearGradient>
    <radialGradient id="bh-shadow"><stop stop-color="#020811" stop-opacity=".65"/><stop offset="1" stop-color="#020811" stop-opacity="0"/></radialGradient>
    <filter id="bh-soft-glow" x="-75%" y="-20%" width="250%" height="140%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="bh-arrow-glow" filterUnits="userSpaceOnUse" x="-27" y="-12" width="39" height="24" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="2.4"/></filter>
    <linearGradient id="bh-beam-fade" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="white"/><stop offset=".78" stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient>
    <mask id="bh-beam-envelope" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#bh-beam-fade)"/></mask>
    <linearGradient id="bh-stack-top" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#172737"/><stop offset=".34" stop-color="#293d50"/><stop offset=".51" stop-color="#465b6c"/><stop offset=".63" stop-color="#304457"/><stop offset="1" stop-color="#192a3d"/></linearGradient>
    <linearGradient id="bh-stack-edge"><stop stop-color="#a6bbcc" stop-opacity=".25"/><stop offset=".42" stop-color="#e1eef8" stop-opacity=".8"/><stop offset="1" stop-color="#85a1ba" stop-opacity=".2"/></linearGradient>
    ${waveMasks}
    <g id="bh-ring-disk">
      <path class="bh-ring-side" d="M-5.7,-4.5v1.4a5.7,2.9 0 0 0 11.4,0v-1.4Z" fill="url(#bh-absorber-side)"/>
      <ellipse cy="-4.5" rx="3.4" ry="1.72" fill="#0c192a"/>
      <path class="bh-disk-side" d="M-1.3,-4.5v1.4a1.3,.66 0 0 0 2.6,0v-1.4Z" fill="url(#bh-absorber-side)"/>
      <ellipse class="bh-disk-top" cy="-4.5" rx="1.3" ry=".66" fill="#aec1d2"/>
      <path class="bh-ring-top" data-top="-4.5" d="M-5.7,-4.5a5.7,2.9 0 1 0 11.4,0a5.7,2.9 0 1 0 -11.4,0Z M-3.4,-4.5a3.4,1.72 0 1 0 6.8,0a3.4,1.72 0 1 0 -6.8,0Z" fill="#aec1d2" fill-rule="evenodd"/>
    </g>
${colorDefinitions}
  </defs>
  <style>
    .bh-part { transition:opacity .22s ease; }
    svg[data-focus="oled"] .bh-mirrors, svg[data-focus="oled"] .bh-absorbers,
    svg[data-focus="mirrors"] .bh-oled, svg[data-focus="mirrors"] .bh-absorbers,
    svg[data-focus="absorbers"] .bh-oled, svg[data-focus="absorbers"] .bh-mirrors { opacity:.25; }
    svg[data-focus="absorbers"] .bh-rgb-light, svg[data-focus="absorbers"] .bh-cavity-light { opacity:.2; }
    .bh-motion { animation-duration:${cycleSeconds}s; animation-timing-function:cubic-bezier(.4,0,.25,1); animation-iteration-count:infinite; animation-play-state:paused; transform-origin:0 0; }
    svg[data-playing="true"] .bh-motion { animation-play-state:running; }
    .bh-wavefront { opacity:.16; transform:translateY(var(--wave-rest)); }
    .bh-boundary-cut { opacity:0; }
    .bh-cavity-color { color:var(--channel); }
    .bh-cavity-loop { opacity:.42; }
    .bh-cavity-arrow { transform:${arrowTransform(40.5)}; }
    .bh-absorption-surface { opacity:0; }
    svg[data-animated="true"] .bh-boundary-cut[data-front="0"] { animation-name:bh-boundary-first; }
    svg[data-animated="true"] .bh-boundary-cut[data-front="1"] { animation-name:bh-boundary-second; }
    svg[data-animated="true"] .bh-boundary-cut[data-front="2"] { animation-name:bh-boundary-third; }
    svg[data-animated="true"] .bh-cavity-loop { animation-name:bh-cavity-presence; }
    svg[data-animated="true"] .bh-cavity-arrow { animation-name:bh-cavity-travel; animation-timing-function:linear; }
    svg[data-animated="true"] .bh-cavity-color { animation-name:bh-cavity-color; }
    svg[data-animated="true"] .bh-cavity-cursor { animation-name:bh-cursor-presence; }
    svg[data-animated="true"] .bh-absorption-surface { animation-name:bh-boundary-absorption; }
    svg[data-animated="true"] .bh-output { animation-name:bh-output-presence; }
    svg[data-animated="true"] .bh-beam-volume { animation-name:bh-beam-rise; }
    svg[data-animated="true"] .bh-beam-end { animation-name:bh-beam-end-rise; }
    svg[data-animated="true"] .bh-exit-glow { animation-name:bh-output-presence; }
    svg[data-animated="true"] .bh-el-glow { animation-name:bh-source; }
${waveKeyframes}
    @keyframes bh-boundary-first { 0%,11%{opacity:0} 17%,20%{opacity:.76} 26%,29%{opacity:.94} ${boundaryFade}%,100%{opacity:1} }
    @keyframes bh-boundary-second { 0%,19%{opacity:0} 26%,29%{opacity:.94} ${boundaryFade}%,100%{opacity:1} }
    @keyframes bh-boundary-third { 0%,28%{opacity:0} ${boundaryFade}%,100%{opacity:1} }
    @keyframes bh-cavity-presence { 0%,36%{opacity:0} 39%,76%{opacity:1} 84%,92%{opacity:.3} 100%{opacity:0} }
    @keyframes bh-cursor-presence { 0%,36%{opacity:0} 39%,76%{opacity:1} 81%,100%{opacity:0} }
    @keyframes bh-cavity-travel { 0%{transform:${arrowTransform(38)}} ${cavityTravel} 100%{transform:${arrowTransform(74)}} }
    @keyframes bh-cavity-color { 0%,43%{color:#ffffff} ${colorStart}%{color:var(--channel-light)} ${colorFull}%,100%{color:var(--channel)} }
    @keyframes bh-output-presence { 0%,${beamStart}%{opacity:0} ${beamStart+6}%,92%{opacity:1} 100%{opacity:0} }
    @keyframes bh-beam-rise { 0%,${beamStart}%{transform:scaleY(0)} ${beamFull}%,100%{transform:scaleY(1)} }
    @keyframes bh-beam-end-rise { 0%,${beamStart}%{transform:translateY(var(--beam-distance))} ${beamFull}%,100%{transform:translateY(0)} }
    @keyframes bh-source { 0%,38%,100%{opacity:.25} 6%,28%{opacity:.85} }
    @keyframes bh-boundary-absorption { 0%,11%{opacity:0} 18%,20%{opacity:.36} 27%,29%{opacity:.65} 36%,85%{opacity:.85} 100%{opacity:0} }
    @media (prefers-reduced-motion:reduce) { .bh-part { transition:none; } }
    @media print { .bh-motion { animation:none !important; } }
  </style>
  <ellipse cx="506" cy="580" rx="327" ry="68" fill="url(#bh-shadow)"/>
  <g class="bh-substrate" stroke-linejoin="round">
    ${polygon([[0,3,0],[4,3,0],[4,3,substrateBottom],[0,3,substrateBottom]], 'class="bh-substrate-front" fill="url(#bh-substrate-front)" stroke="#627c97" stroke-width="1.1"')}
    ${polygon([[4,0,0],[4,3,0],[4,3,substrateBottom],[4,0,substrateBottom]], 'class="bh-substrate-side" fill="url(#bh-substrate-side)" stroke="#536d89" stroke-width="1.1"')}
    ${plane(0,0,4,3,0,'class="bh-substrate-top" fill="url(#bh-base)" stroke="#8aa2ba" stroke-width="1.2"')}
    ${polygon([[0,3,-6],[4,3,-6],[4,3,-8],[0,3,-8]], 'fill="#a3b7c8" fill-opacity=".33"')}
    ${polygon([[4,0,-6],[4,3,-6],[4,3,-8],[4,0,-8]], 'fill="#8ca2b9" fill-opacity=".25"')}
  </g><g class="bh-part bh-mirrors">`);
  for (const { row,col,channel } of SUBPIXELS) {
    parts.push(plane(col+.1,row+.1,.8,.8,.5,`fill="${PALETTE[channel].main}" fill-opacity=".14" stroke="${PALETTE[channel].main}" stroke-opacity=".5" stroke-width=".8"`));
    for (let depth=0;depth<3;depth++) for (let across=0;across<3;across++) {
      parts.push(`<use href="#bh-pillar-${channel}" transform="translate(${point(col+.27+across*.23,row+.27+depth*.23,1)})"/>`);
    }
  }
  parts.push(`</g><g class="bh-part bh-absorbers"><g class="bh-boundary-tracks">`);
  // Draw all strips first so crossing strips never cut the annular ring tops.
  for (let col=0;col<=4;col++) parts.push(plane(col-.075,-.075,.15,3.15,1.2,'fill="#0a1422"'));
  for (let row=0;row<=3;row++) parts.push(plane(-.075,row-.075,4.15,.15,1.2,'fill="#0a1422"'));
  parts.push(`</g><g class="bh-boundary-units">`);
  const rings = [];
  for (let col=0;col<=4;col++) for (let step=0;step<=15;step++) rings.push([col,step/5]);
  for (let row=0;row<=3;row++) for (let step=1;step<20;step++) if (step%5!==0) rings.push([step/5,row]);
  rings.sort((a,b)=>projectPoint(...a).y-projectPoint(...b).y);
  for (const [x,y] of rings) parts.push(`<use href="#bh-ring-disk" transform="translate(${point(x,y,1.5)})"/>`);
  parts.push(`</g></g><g class="bh-spacer" fill="#8cbacc" fill-opacity=".025">
    ${polygon([[0,3,bottomPlane],[4,3,bottomPlane],[4,3,OLED_LAYERS[0].bottom],[0,3,OLED_LAYERS[0].bottom]])}
    ${polygon([[4,0,bottomPlane],[4,3,bottomPlane],[4,3,OLED_LAYERS[0].bottom],[4,0,OLED_LAYERS[0].bottom]])}
  </g>`);
  // Physical coverage must survive component highlighting: keep this opaque
  // backing outside the .bh-part wrapper whose opacity is reduced by focus.
  const oledParts = [`<g class="bh-oled-occluder" fill="#223348" stroke-linejoin="round">
    ${polygon([[0,3,OLED_LAYERS[0].bottom],[4,3,OLED_LAYERS[0].bottom],[4,3,outputPlane],[0,3,outputPlane]])}
    ${polygon([[4,0,OLED_LAYERS[0].bottom],[4,3,OLED_LAYERS[0].bottom],[4,3,outputPlane],[4,0,outputPlane]])}
    ${plane(0,0,4,3,outputPlane)}
  </g><g class="bh-part bh-oled" stroke-linejoin="round">`];
  // Adjacent side facets make a single laminate. Only the outer face is drawn
  // across the array; internal strata never become separated transparent panes.
  for (const {key,bottom,top,color} of OLED_LAYERS) {
    oledParts.push(`<g class="bh-oled-layer" data-layer="${key}" data-bottom="${bottom}" data-top="${top}">
      ${polygon([[0,3,bottom],[4,3,bottom],[4,3,top],[0,3,top]],`fill="${color}"`)}
      ${polygon([[4,0,bottom],[4,3,bottom],[4,3,top],[4,0,top]],`fill="${color}"`)}
      ${polygon([[4,0,bottom],[4,3,bottom],[4,3,top],[4,0,top]],'fill="#11233d" fill-opacity=".25"')}
    </g>`);
    if(key==="emissive-region") oledParts.push(`<g class="bh-motion bh-el-glow">
      ${polygon([[0,3,bottom+1],[4,3,bottom+1],[4,3,top-1],[0,3,top-1]],'fill="#f1faff" filter="url(#bh-soft-glow)"')}
      ${polygon([[4,0,bottom+1],[4,3,bottom+1],[4,3,top-1],[4,0,top-1]],'fill="#f1faff" filter="url(#bh-soft-glow)"')}
    </g>`);
  }
  oledParts.push(plane(0,0,4,3,outputPlane,'class="bh-oled-top" fill="url(#bh-stack-top)" stroke="url(#bh-stack-edge)" stroke-width="1.2"'));
  oledParts.push(`<path d="${contour(.035,.035,3.93,2.93,outputPlane)}" fill="none" stroke="#c4d6e5" stroke-opacity=".12" stroke-width=".65"/>`);
  oledParts.push(`</g>`);
  parts.push(`<g class="bh-part bh-white-light">`);
  const waveDistance = whiteEmissionPlanes[0]-bottomPlane;
  for (let i=0;i<WAVEFRONTS.length;i++) {
    parts.push(`<g class="bh-motion bh-wavefront" data-front="${i}" data-start-plane="${whiteEmissionPlanes[0]}" data-end-plane="${bottomPlane}" style="--wave-distance:${waveDistance}px;--wave-rest:${30+i*30}px">
      <g mask="url(#bh-wave-envelope-${i})">${plane(0,0,4,3,whiteEmissionPlanes[0],'class="bh-wave-surface" fill="#ffffff"')}</g>
    </g>`);
  }
  parts.push(`</g><g class="bh-part bh-boundary-light">`);
  // Absorption is a surface loss of illumination, never upright white objects.
  // Keep the apertures fixed so darkening cannot read as a shrinking wavefront.
  parts.push(`<path class="bh-motion bh-absorption-surface" d="${boundaryAt(bottomPlane)}" fill="#02070d" fill-opacity=".65" fill-rule="evenodd"/>`);
  parts.push(`</g><g class="bh-part bh-cavity-light">`);
  const depthSorted = [...SUBPIXELS].sort((a,b)=>projectPoint(a.x,a.y).y-projectPoint(b.x,b.y).y);
  for (const {row,col,x,y,channel} of depthSorted) {
    const c = PALETTE[channel];
    const height = cavityUpperPlane-bottomPlane;
    const upward = `M0,0A18,${height/2} 0 0 1 0,-${height}`;
    const downward = `M0,-${height}A18,${height/2} 0 0 1 0,0`;
    parts.push(`<g class="bh-cavity-cell" data-cell="${row}-${col}" data-channel="${channel}" data-lower-plane="${bottomPlane}" data-upper-plane="${cavityUpperPlane}" data-exit-plane="${outputPlane}">
      <g transform="translate(${point(x,y,bottomPlane)})"><g class="bh-motion bh-cavity-color" style="--channel:${c.main};--channel-light:${c.light}"><g class="bh-motion bh-cavity-loop">
        <path d="${upward} ${downward}" fill="none" stroke="currentColor" stroke-width="7" opacity=".1" filter="url(#bh-soft-glow)"/>
        <path class="bh-cavity-path" data-direction="up" d="${upward}" fill="none" stroke="currentColor" stroke-width="2.1" opacity=".48"/>
        <path class="bh-cavity-path" data-direction="down" d="${downward}" fill="none" stroke="currentColor" stroke-width="2.1" opacity=".48"/>
        <g class="bh-motion bh-cavity-cursor"><g class="bh-motion bh-cavity-arrow">
          <path d="M-18,0H-5" fill="none" stroke="currentColor" stroke-width="6" opacity=".65" filter="url(#bh-arrow-glow)"/>
          <path d="M-18,0H-5" fill="none" stroke="currentColor" stroke-width="3.8" stroke-linecap="round"/>
          <path class="bh-cavity-arrowhead" d="M-8,-6L5,0L-8,6Z" fill="currentColor"/>
        </g></g>
      </g></g></g>
    </g>`);
  }
  parts.push(`</g>`, ...oledParts, `<g class="bh-part bh-rgb-light">`);
  // Paint beams back-to-front so their circular faces and overlap establish depth.
  for (const {row,col,x,y,channel} of depthSorted) {
    const exit = projectPoint(x,y,outputPlane);
    const tip = projectPoint(x,y,outputPlane+beamLength);
    const length = n(exit.y-tip.y);
    const c = PALETTE[channel];
    const body = `M-11,0 L-22,-${length} A22,7 0 0 1 22,-${length} L11,0 A11,4 0 0 1 -11,0Z`;
    parts.push(`<g transform="translate(${n(exit.x)},${n(exit.y)})">
      <g class="bh-motion bh-exit-glow">
        <ellipse rx="23" ry="8" fill="${c.main}" fill-opacity=".5" filter="url(#bh-soft-glow)"/>
      </g>
      <g class="bh-motion bh-output" data-cell="${row}-${col}" data-channel="${channel}" data-origin="${n(exit.x)},${n(exit.y)}" data-tip="${n(tip.x)},${n(tip.y)}" style="--beam-distance:${length}px">
        <g class="bh-motion bh-beam-volume" mask="url(#bh-beam-envelope)">
          <path d="${body}" fill="${c.main}" fill-opacity=".32" filter="url(#bh-soft-glow)"/>
          <path class="bh-beam-body" d="${body}" fill="url(#bh-volume-${channel})"/>
          <path class="bh-beam-core" d="M-2,0 L-4,-${length} L1,-${length} L2,0Z" fill="${c.light}" fill-opacity=".85" filter="url(#bh-soft-glow)"/>
        </g>
        <g class="bh-motion bh-beam-end"><ellipse class="bh-beam-cap" cy="-${length}" rx="20" ry="6" fill="${c.main}" fill-opacity=".06" filter="url(#bh-soft-glow)"/></g>
      </g>
    </g>`);
  }
  parts.push(`</g></svg>`);
  return parts.join("");
}
