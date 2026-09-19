// Illustration coordinates only, not device dimensions or calculated optical paths.
export const COMPONENT_DESCRIPTIONS = Object.freeze({
  all: "Soft white waves descend from the tandem OLED. Each RGB output branches into four smaller arrows along its shaft; those branches fade at the black matrix. This is an illustrative sequence, not a time-resolved simulation.",
  oled: "Tandem white OLED — two illustrative EL regions supply broadband light across the array. Their separation from the backplane is exaggerated to make the downward optical path visible.",
  mirrors: "RGB metamirrors — wavelength-selective reflection and the Fabry–Pérot cavity favor each subpixel’s red, green or blue output. This is spectral selection from white light, not frequency conversion.",
  absorbers: "Black matrix — ring–disk structures surround each subpixel. Four smaller arrows branch from the central RGB shaft and disappear at these boundaries, illustrating the intended suppression of optical crosstalk."
});

const PALETTE = {
  r: { light: "#ffd0d8", main: "#ff537c", dark: "#943454" },
  g: { light: "#c5ffe7", main: "#50efb0", dark: "#247d75" },
  b: { light: "#d3e4ff", main: "#639dff", dark: "#315caa" }
};
const ROWS = [["r", "g", "b", "g"], ["b", "g", "r", "b"], ["g", "r", "g", "b"]];
export const SUBPIXELS = Object.freeze(ROWS.flatMap((channels, row) => channels.map((channel, col) => Object.freeze({ row, col, x: col + .5, y: row + .5, channel }))));
export const SCENE_GEOMETRY = Object.freeze({
  bottomPlane: 12, substrateBottom: -30, branchPlane: 96,
  whiteEmissionPlanes: Object.freeze([154, 174]),
  outputPlane: 194, beamLength: 88
});
export function projectPoint(x, y, z = 0) {
  return { x: 430 + x * 90 - y * 70, y: 350 + x * 27 + y * 40 - z };
}
const n = value => Number(value.toFixed(2));
const point = (x, y, z = 0) => { const p = projectPoint(x, y, z); return `${n(p.x)},${n(p.y)}`; };
const polygon = (corners, attrs = "") => `<polygon points="${corners.map(c => point(...c)).join(" ")}" ${attrs}/>`;
const plane = (x, y, w, h, z, attrs) => polygon([[x, y, z], [x + w, y, z], [x + w, y + h, z], [x, y + h, z]], attrs);
const waveCurve = (y,z,phase) => {
  let path=`M${point(.04,y,z)}`;
  for (let segment=0;segment<8;segment++) {
    const x=.04+segment*.49;
    const amplitude=(segment%2===phase?1:-1)*8;
    path+=` C${point(x+.16,y,z+amplitude)} ${point(x+.33,y,z+amplitude)} ${point(x+.49,y,z)}`;
  }
  return path;
};

export function createBlackholeSVG({ focus = "all", playing = false, animated = playing, compactView = false } = {}) {
  if (!Object.hasOwn(COMPONENT_DESCRIPTIONS, focus)) throw new RangeError("Unknown component focus");
  const { bottomPlane, substrateBottom, branchPlane, whiteEmissionPlanes, outputPlane, beamLength } = SCENE_GEOMETRY;
  const parts = [];
  const colorDefinitions = Object.entries(PALETTE).map(([key, c]) => `
    <linearGradient id="bh-post-${key}"><stop stop-color="${c.dark}"/><stop offset=".55" stop-color="${c.main}"/><stop offset="1" stop-color="${c.dark}"/></linearGradient>
    <g id="bh-pillar-${key}"><path d="M-5.8,-8v8a5.8,2.7 0 0 0 11.6,0v-8Z" fill="url(#bh-post-${key})"/><path d="M-2.7,-7v7" stroke="${c.light}" stroke-opacity=".42" stroke-width="1.2"/><ellipse cy="-8" rx="5.8" ry="2.7" fill="${c.light}" stroke="${c.main}" stroke-width=".7"/></g>`).join("");
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${compactView ? "185 54 645 578" : "0 0 960 660"}" width="${compactView ? 645 : 960}" height="${compactView ? 578 : 660}" role="img" aria-labelledby="bh-title bh-desc" data-focus="${focus}" data-playing="${Boolean(playing)}" data-animated="${Boolean(animated)}" data-compact="${Boolean(compactView)}">
  <title id="bh-title">Project Blackhole: white-light reflection and RGB top emission</title>
  <desc id="bh-desc">Two tinted, translucent tandem OLED EL regions sit above twelve RGB metamirror subpixels on a solid substrate. Soft luminous white waves descend across the array, then red, green and blue arrows grow upward from the center of every 3 by 3 pillar array. Four connected smaller RGB branches grow from an elevated point on each main arrow shaft and disappear at its black matrix. The Fabry–Pérot cavity response is conceptual, not calculated performance. Not to scale: spacing and timing are exaggerated. White waves are visual symbols, not coherent plane-wave emission from an OLED. Colors do not identify constituent materials. This is spectral selection, not frequency conversion.</desc>
  <defs>
    <linearGradient id="bh-base" x2=".8" y2="1"><stop stop-color="#425d7b"/><stop offset="1" stop-color="#1c314d"/></linearGradient>
    <linearGradient id="bh-substrate-front" x2="0" y2="1"><stop stop-color="#45607c"/><stop offset=".35" stop-color="#2b415d"/><stop offset="1" stop-color="#172a43"/></linearGradient>
    <linearGradient id="bh-substrate-side" x2="0" y2="1"><stop stop-color="#334a67"/><stop offset="1" stop-color="#12233a"/></linearGradient>
    <linearGradient id="bh-wave-ink"><stop stop-color="#ffffff" stop-opacity="0"/><stop offset=".12" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".5" stop-color="#ffffff"/><stop offset=".88" stop-color="#ffffff" stop-opacity=".95"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
    <filter id="bh-wave-softness" x="-10%" y="-60%" width="120%" height="220%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="3.5"/></filter>
    <linearGradient id="bh-absorber-side"><stop stop-color="#455971"/><stop offset=".5" stop-color="#90a6bb"/><stop offset="1" stop-color="#455971"/></linearGradient>
    <radialGradient id="bh-shadow"><stop stop-color="#020811" stop-opacity=".65"/><stop offset="1" stop-color="#020811" stop-opacity="0"/></radialGradient>
    <filter id="bh-beam-glow" x="-300%" y="-15%" width="700%" height="130%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="2.3"/></filter>
    <g id="bh-ring-disk">
      <path class="bh-ring-side" d="M-5.7,-4.5v1.4a5.7,2.9 0 0 0 11.4,0v-1.4Z" fill="url(#bh-absorber-side)"/>
      <ellipse cx="0" cy="-4.5" rx="3.4" ry="1.72" fill="#0c192a"/>
      <path class="bh-disk-side" d="M-1.3,-4.5v1.4a1.3,.66 0 0 0 2.6,0v-1.4Z" fill="url(#bh-absorber-side)"/>
      <ellipse class="bh-disk-top" cy="-4.5" rx="1.3" ry=".66" fill="#aec1d2"/>
      <path class="bh-ring-top" data-top="-4.5" d="M-5.7,-4.5a5.7,2.9 0 1 0 11.4,0a5.7,2.9 0 1 0 -11.4,0Z M-3.4,-4.5a3.4,1.72 0 1 0 6.8,0a3.4,1.72 0 1 0 -6.8,0Z" fill="#aec1d2" fill-rule="evenodd"/>
    </g>
${colorDefinitions}
  </defs>
  <style>
    .bh-part { transition: opacity .22s ease; }
    svg[data-focus="oled"] .bh-mirrors, svg[data-focus="oled"] .bh-absorbers,
    svg[data-focus="mirrors"] .bh-oled, svg[data-focus="mirrors"] .bh-absorbers,
    svg[data-focus="absorbers"] .bh-oled, svg[data-focus="absorbers"] .bh-mirrors { opacity:.22; }
    svg[data-focus="absorbers"] .bh-main-light { opacity:.14; }
    .bh-motion { animation-duration:7.2s; animation-timing-function:linear; animation-iteration-count:infinite; animation-play-state:paused; transform-origin:0 0; }
    svg[data-playing="true"] .bh-motion { animation-play-state:running; }
    .bh-wavefront { opacity:.22; transform:translateY(var(--wave-rest)); }
    .bh-branch { opacity:.7; }
    .bh-absorption { opacity:0; }
    svg[data-animated="true"] .bh-wavefront { animation-name:bh-wave-descent; }
    svg[data-animated="true"] .bh-output { animation-name:bh-output-presence; }
    svg[data-animated="true"] .bh-output-shaft { animation-name:bh-output-grow; }
    svg[data-animated="true"] .bh-arrowhead { animation-name:bh-output-tip; }
    svg[data-animated="true"] .bh-reflection { animation-name:bh-reflection; }
    svg[data-animated="true"] .bh-el-glow { animation-name:bh-source; }
    svg[data-animated="true"] .bh-branch { animation-name:bh-branch-presence; }
    svg[data-animated="true"] .bh-branch-shaft { animation-name:bh-branch-grow; }
    svg[data-animated="true"] .bh-radial-arrow { animation-name:bh-branch-tip; }
    svg[data-animated="true"] .bh-absorption { animation-name:bh-absorb; }
    @keyframes bh-wave-descent {
      0%,5%{opacity:0;transform:translateY(0)}
      10%{opacity:.95}
      28%{opacity:.95}
      30%{transform:translateY(var(--wave-distance))}
      34%,100%{opacity:0;transform:translateY(var(--wave-distance))}
    }
    @keyframes bh-output-presence { 0%,34%{opacity:0} 39%,83%{opacity:1} 96%,100%{opacity:0} }
    @keyframes bh-output-grow { 0%,35%{transform:scaleY(0)} 66%,100%{transform:scaleY(1)} }
    @keyframes bh-output-tip { 0%,35%{transform:translateY(var(--output-distance))} 66%,100%{transform:translateY(0)} }
    @keyframes bh-reflection { 0%,29%,76%,100%{opacity:0} 36%,50%{opacity:.95} }
    @keyframes bh-source { 0%,42%,100%{opacity:.2} 8%,26%{opacity:.9} }
    @keyframes bh-branch-presence { 0%,47%{opacity:0} 50%,71%{opacity:.92} 72%,100%{opacity:0} }
    @keyframes bh-branch-grow { 0%,47%{transform:scaleX(0)} 72%,100%{transform:scaleX(1)} }
    @keyframes bh-branch-tip { 0%,47%{transform:translateX(var(--branch-start))} 72%,100%{transform:translateX(0)} }
    @keyframes bh-absorb { 0%,68%,92%,100%{opacity:0;transform:scale(1)} 73%{opacity:.75;transform:scale(1)} 88%{opacity:0;transform:scale(.3)} }
    @media (prefers-reduced-motion:reduce) { .bh-part { transition:none; } }
    @media print { .bh-motion { animation:none !important; } }
  </style>
  <ellipse cx="506" cy="516" rx="327" ry="118" fill="url(#bh-shadow)"/>
  <g class="bh-substrate" stroke-linejoin="round">
    ${polygon([[0,3,0],[4,3,0],[4,3,substrateBottom],[0,3,substrateBottom]], 'class="bh-substrate-front" fill="url(#bh-substrate-front)" stroke="#627c97" stroke-width="1.1"')}
    ${polygon([[4,0,0],[4,3,0],[4,3,substrateBottom],[4,0,substrateBottom]], 'class="bh-substrate-side" fill="url(#bh-substrate-side)" stroke="#536d89" stroke-width="1.1"')}
    ${plane(0,0,4,3,0,'class="bh-substrate-top" fill="url(#bh-base)" stroke="#8aa2ba" stroke-width="1.2"')}
    ${polygon([[0,3,-6],[4,3,-6],[4,3,-8],[0,3,-8]], 'fill="#a3b7c8" fill-opacity=".33"')}
    ${polygon([[4,0,-6],[4,3,-6],[4,3,-8],[4,0,-8]], 'fill="#8ca2b9" fill-opacity=".25"')}
  </g><g class="bh-part bh-mirrors">`);
  for (const { row, col, channel } of SUBPIXELS) {
    parts.push(plane(col+.1,row+.1,.8,.8,.5,`fill="${PALETTE[channel].main}" fill-opacity=".1" stroke="${PALETTE[channel].main}" stroke-opacity=".32" stroke-width=".75"`));
    for (let depth=0; depth<3; depth++) for (let across=0; across<3; across++) {
      parts.push(`<use href="#bh-pillar-${channel}" transform="translate(${point(col+.27+across*.23,row+.27+depth*.23,1)})"/>`);
    }
  }
  parts.push(`</g><g class="bh-part bh-absorbers"><g class="bh-boundary-tracks">`);
  // Finish every backing strip before drawing any ring, so crossings cannot cut rings.
  for (let col=0;col<=4;col++) parts.push(plane(col-.04,-.04,.08,3.08,1.2,'fill="#101c2c"'));
  for (let row=0;row<=3;row++) parts.push(plane(-.04,row-.04,4.08,.08,1.2,'fill="#101c2c"'));
  parts.push(`</g><g class="bh-boundary-units">`);
  const rings = [];
  for (let col=0;col<=4;col++) for (let step=0;step<=15;step++) rings.push([col,step/5]);
  for (let row=0;row<=3;row++) for (let step=1;step<20;step++) if (step%5!==0) rings.push([step/5,row]);
  rings.sort((a,b)=>projectPoint(...a).y-projectPoint(...b).y);
  for (const [x,y] of rings) parts.push(`<use href="#bh-ring-disk" transform="translate(${point(x,y,1.5)})"/>`);
  parts.push(`</g></g><g class="bh-part bh-oled" stroke-linejoin="round">`);
  // The OLED remains a single suspended drawing layer with a readable optical gap.
  // Its illustrated separation is not a proposed physical air gap.
  whiteEmissionPlanes.forEach((z,index) => {
    const tint=index===0?"#7fb5dd":"#a8a0de";
    parts.push(polygon([[0,3,z-5],[4,3,z-5],[4,3,z+4],[0,3,z+4]],`fill="${tint}" fill-opacity=".18" stroke="${tint}" stroke-opacity=".4"`));
    parts.push(polygon([[4,0,z-5],[4,3,z-5],[4,3,z+4],[4,0,z+4]],`fill="${tint}" fill-opacity=".13" stroke="${tint}" stroke-opacity=".35"`));
    parts.push(plane(0,0,4,3,z+4,`class="bh-el-layer" data-plane="${z}" fill="${tint}" fill-opacity=".24" stroke="${tint}" stroke-opacity=".65" stroke-width="1.1"`));
    parts.push(`<g class="bh-motion bh-el-glow">${plane(0,0,4,3,z+4.2,'fill="#f7f7ff" fill-opacity=".1"')}</g>`);
  });
  parts.push(`</g><g class="bh-part bh-main-light">`);
  // A broad descending wave packet is a visual cue, not a coherence claim.
  const waveDistance=whiteEmissionPlanes[0]-bottomPlane;
  for (let front=0;front<3;front++) {
    parts.push(`<g class="bh-motion bh-wavefront" data-front="${front}" data-start-plane="${whiteEmissionPlanes[0]}" data-end-plane="${bottomPlane}" style="--wave-distance:${waveDistance}px;--wave-rest:${42+front*34}px;animation-delay:${n(front*.12)}s" fill="none" stroke-linecap="round">`);
    [.3,1.1,1.9,2.7].forEach((y,row) => {
      const d=waveCurve(y,whiteEmissionPlanes[0],row%2);
      parts.push(`<path class="bh-wave-glow" d="${d}" stroke="url(#bh-wave-ink)" stroke-width="13" stroke-opacity=".45" filter="url(#bh-wave-softness)"/>
        <path class="bh-wave-ribbon" d="${d}" stroke="url(#bh-wave-ink)" stroke-width="5.5" stroke-opacity=".78"/>
        <path class="bh-wave-crest" d="${d}" stroke="url(#bh-wave-ink)" stroke-width="1.8"/>`);
    });
    parts.push(`</g>`);
  }
  for (const {row,col,x,y,channel} of SUBPIXELS) {
    const mirror=projectPoint(x,y,bottomPlane);
    const tip=projectPoint(x,y,outputPlane+beamLength);
    const upLength=mirror.y-tip.y;
    const c=PALETTE[channel].main;
    parts.push(`<g transform="translate(${n(mirror.x)},${n(mirror.y)})">
      <ellipse class="bh-motion bh-reflection" rx="18" ry="7" fill="${c}" fill-opacity=".35" stroke="${c}" stroke-opacity=".8"/>
      <g class="bh-motion bh-output" data-cell="${row}-${col}" data-channel="${channel}" data-origin="${n(mirror.x)},${n(mirror.y)}" data-tip="${n(tip.x)},${n(tip.y)}" style="--output-distance:${n(upLength)}px">
        <g class="bh-motion bh-output-shaft">
          <path d="M-4,0 L-4,-${n(upLength-17)} L4,-${n(upLength-17)} L4,0Z" fill="${c}" fill-opacity=".3" filter="url(#bh-beam-glow)"/>
          <path class="bh-output-core" d="M0,0 L0,-${n(upLength-14)}" stroke="${c}" stroke-width="5.5" stroke-linecap="butt" fill="none"/>
        </g>
        <path class="bh-motion bh-arrowhead" d="M0,-${n(upLength)} L-8,-${n(upLength-17)} L8,-${n(upLength-17)}Z" fill="${c}"/>
      </g>
    </g>`);
  }
  parts.push(`</g><g class="bh-part bh-boundary-light">`);
  for (const {row,col,x,y,channel} of SUBPIXELS) {
    const start=projectPoint(x,y,branchPlane);
    const boundaries={north:[col+.4,row],east:[col+1,row+.4],south:[col+.6,row+1],west:[col,row+.6]};
    for (const [direction,boundary] of Object.entries(boundaries)) {
      const end=projectPoint(...boundary,5.5);
      const dx=n(end.x-start.x),dy=n(end.y-start.y);
      const angle=n(Math.atan2(dy,dx)*180/Math.PI);
      const length=n(Math.hypot(dx,dy));
      const c=PALETTE[channel].main;
      parts.push(`<g class="bh-radial-ray" data-cell="${row}-${col}" data-channel="${channel}" data-direction="${direction}" data-origin="${n(start.x)},${n(start.y)}" data-branch-plane="${branchPlane}" data-boundary="${boundary.join(",")}" data-end="${n(end.x)},${n(end.y)}">
        <g transform="translate(${n(start.x)},${n(start.y)})">
          <g class="bh-motion bh-branch" style="--branch-start:-${length}px">
            <g class="bh-branch-geometry" transform="rotate(${angle})">
              <path class="bh-motion bh-branch-shaft" d="M0,0 L${n(length-7)},0" stroke="${c}" stroke-width="2.1" stroke-linecap="butt" fill="none"/>
              <path class="bh-motion bh-radial-arrow" d="M${length},0 L${n(length-8)},-4.2 L${n(length-8)},4.2Z" fill="${c}"/>
            </g>
          </g>
        </g>
        <g transform="translate(${n(end.x)},${n(end.y)})"><ellipse class="bh-motion bh-absorption" rx="7.5" ry="3.8" fill="none" stroke="${c}" stroke-width="1.1"/></g>
      </g>`);
    }
  }
  parts.push(`</g></svg>`);
  return parts.join("");
}
