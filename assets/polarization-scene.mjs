// Paper-grounded schematic. Color samples: scripts/polarization-color-samples.json.
export const SUMMARY_DURATION = 20;
export const SUMMARY_CHAPTERS = Object.freeze([
  { start: 0, label: "The device", title: "Inside the structural-color cavity", caption: "An Al–SiO₂–Al metamirror, a planarizing dielectric cavity spacer, and a thin Ag top mirror form the layered device." },
  { start: 4, label: "x polarization", title: "x-polarization: color varies with radius", caption: "The five short-axis radii produce different reflected colors. The long-axis radius is fixed at 100 nm." },
  { start: 9, label: "Rotate", title: "Rotate the incident polarization", caption: "The polarization rotates from x to y; the geometry and layer stack remain unchanged." },
  { start: 14, label: "y polarization", title: "y-polarization: similar color across designs", caption: "The reflected colors remain similar across the same five short-axis radii." },
  { start: 18, label: "Result", title: "Color sensitivity depends on polarization", caption: "The reflected color varies strongly with the short-axis radius for x polarization, but only weakly for y polarization." }
].map(Object.freeze));
export const META_RADII = Object.freeze([25,30,35,40,45]);
export const LONG_RADIUS = 100;
export const ARRAY_ROWS = 2;
export const ARRAY_COLUMNS = 2;
// Shared tangents for the substrate, array lattice and ellipse orientation.
export const META_PROJECTION = Object.freeze([1,12/132,-38/80,32/80]);
export const X_COLORS = Object.freeze(["#defaa6","#f6d4ef","#ed9bfd","#7cb7fd","#01eefe"]);
export const DATA_Y_COLORS = Object.freeze(["#a6f9ff","#9af7ff","#8ff5ff","#89f5ff","#81f1fd"]);
// Representative central sample, shared for the near-invariant y-pol summary.
export const Y_COLORS = Object.freeze(META_RADII.map(()=>DATA_Y_COLORS[2]));
export const LAYERS = Object.freeze([
  {key:"bottom-al",label:"Al ground mirror",thicknessNm:150},
  {key:"gap-sio2",label:"SiO₂ gap",thicknessNm:20},
  {key:"nano-ellipse",label:"Al nano-ellipse",thicknessNm:20},
  {key:"dcsl",label:"DCSL / planarization",thicknessNm:180},
  {key:"top-ag",label:"Ag top mirror",thicknessNm:15}
].map(Object.freeze));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=(a,b,t)=>{const u=clamp((t-a)/(b-a),0,1);return u*u*(3-2*u);};
const blend=(a,b,t)=>`#${[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,"0")).join("")}`;
export function getLightCycle(seconds) {
  const time=clamp(Number.isFinite(seconds)?seconds:0,0,SUMMARY_DURATION);
  const local=time<10?time:time-10;
  const fade=time<10?1-ease(8,9,time):1;
  const incidentProgress=ease(1,2.6,local);
  return {
    incidentProgress,
    incidentTailProgress:Math.min(incidentProgress,ease(1.8,2.95,local)),
    // The incoming light clears completely before any colored response appears.
    incidentOpacity:ease(.9,1.1,local)*(1-ease(2.6,2.95,local))*fade,
    response:ease(2.95,3.15,local)*fade,
    reflectedProgress:ease(3.15,4,local),
    reflectedOpacity:ease(3.15,3.35,local)*fade
  };
}
export function getSummaryFrame(seconds) {
  const time=clamp(Number.isFinite(seconds)?seconds:0,0,SUMMARY_DURATION);
  const mix=ease(9,11,time);
  const chapter=SUMMARY_CHAPTERS.findLastIndex(item=>time>=item.start);
  const light=getLightCycle(time);
  return {time,chapter,...SUMMARY_CHAPTERS[chapter],angle:mix*90,illumination:light.incidentOpacity,...light,
    colors:X_COLORS.map((color,i)=>blend(color,Y_COLORS[i],mix))};
}
export const projectPoint=(x,y,z=0)=>({x:174+132*x-38*y,y:470+12*x+32*y-z});
const p=projectPoint;
const point=(x,y,z=0)=>{const a=p(x,y,z);return `${a.x.toFixed(2)},${a.y.toFixed(2)}`;};
const polygon=(points,attributes="")=>`<polygon points="${points.map(a=>point(...a)).join(" ")}" ${attributes}/>`;
const plane=(z,attrs)=>polygon([[0,0,z],[5,0,z],[5,2.5,z],[0,2.5,z]],attrs);
const side=(top,bottom,front,right)=>polygon([[0,2.5,top],[5,2.5,top],[5,2.5,bottom],[0,2.5,bottom]],front)+polygon([[5,0,top],[5,2.5,top],[5,2.5,bottom],[5,0,bottom]],right);

export function createPolarizationSVG(seconds=20) {
  const frame=getSummaryFrame(seconds);
  const pieces=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1040 750" width="1040" height="750" role="img" aria-labelledby="ps-title ps-desc">
  <title id="ps-title">Normal-incidence polarization-dependent structural color</title>
  <desc id="ps-desc">Five aligned 2 by 2 arrays of Al nano-ellipses have short radii of 25, 30, 35, 40 and 45 nm and the same long radius of 100 nm. The Al ground mirror, SiO₂ gap and Al ellipses form a MIM metamirror below a planarizing dielectric cavity spacer and a thin Ag top mirror. White light travels vertically down and disappears completely before colored reflected light grows upward, once per polarization. The incoming and reflected beams never appear together. x-polarized colors are sampled from Figure 1(e). A representative cyan from Figure 1(f) summarizes the nearly invariant y response. Geometry stays fixed; timing and the cutaway are schematic, not a field simulation.</desc>
  <defs>
    <linearGradient id="ps-metal" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#f2f7fd"/><stop offset=".25" stop-color="#a8bacd"/><stop offset=".6" stop-color="#d7e4f1"/><stop offset="1" stop-color="#6b88a6"/></linearGradient>
    <linearGradient id="ps-metal-edge" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#5d7995"/><stop offset=".45" stop-color="#b5c8dc"/><stop offset="1" stop-color="#344d68"/></linearGradient>
    <linearGradient id="ps-ground" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#46627e"/><stop offset="1" stop-color="#172b43"/></linearGradient>
    <linearGradient id="ps-dielectric" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#78adc7" stop-opacity=".14"/><stop offset="1" stop-color="#78adc7" stop-opacity=".035"/></linearGradient>
    <linearGradient id="ps-cap" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dce9f7" stop-opacity=".2"/><stop offset=".5" stop-color="#b7cde4" stop-opacity=".07"/><stop offset="1" stop-color="#dce9f7" stop-opacity=".14"/></linearGradient>
    <linearGradient id="ps-beam-shine" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".35" stop-color="#fff" stop-opacity=".32"/><stop offset=".6" stop-color="#fff" stop-opacity=".03"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="ps-shadow"><stop stop-color="#010813" stop-opacity=".85"/><stop offset="1" stop-color="#010813" stop-opacity="0"/></radialGradient>
    <filter id="ps-glow" x="-100%" y="-20%" width="300%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
  </defs>
  <g font-family="system-ui,sans-serif">
  <g class="ps-light-label" fill="#c1d0e1" font-size="14">
    <text x="79" y="47" fill="#eff5fd" font-size="17">Normal incidence</text>
    <text x="79" y="70">White light ↓</text><text x="79" y="91">Reflected color ↑</text>
    <text x="910" y="68" text-anchor="end" fill="#849db7" font-size="12">FIVE REPRESENTATIVE GEOMETRIES</text>
  </g>
  <g class="ps-polarization" transform="translate(967,69)">
    <circle r="29" fill="#102238" stroke="#6f8ba7"/>
    <circle r="23" fill="none" stroke="#8ba8c5" stroke-opacity=".35" stroke-dasharray="1 5"/>
    <g data-polarization-axis="true" transform="rotate(${-frame.angle})"><path d="M-18,0H18" stroke="#f4f8ff" stroke-width="3"/><path d="M-21,0L-13,-5V5Z M21,0L13,-5V5Z" fill="#f4f8ff"/></g>
    <text y="49" text-anchor="middle" fill="#9cb4cc" font-size="12">E-field</text>
  </g>
  <ellipse cx="459" cy="621" rx="422" ry="68" fill="url(#ps-shadow)"/>
  <g class="ps-device" stroke-linejoin="round">
  <g class="ps-layer" data-layer="bottom-al">
    ${side(0,-30,'fill="url(#ps-ground)" stroke="#627f9c"','fill="#233c56" stroke="#627f9c"')}
    ${plane(0,'fill="#44627e" stroke="#9fb9d2"')}
  </g>
  <g class="ps-layer" data-layer="gap-sio2">
    ${side(16,0,'fill="#8bb6cb" stroke="#b6dce9"','fill="#5d91ac" stroke="#9ac4d8"')}
    ${plane(16,'fill="#658aa3" stroke="#a9ccdf"')}
  </g>`];
  for(let i=1;i<5;i++) pieces.push(`<path d="M${point(i,0,16)}L${point(i,2.5,16)}" stroke="#c5e0ed" stroke-opacity=".28" stroke-dasharray="3 6"/>`);
  for(let col=0;col<5;col++) {
    pieces.push(polygon([[col+.07,.1,16.5],[col+.93,.1,16.5],[col+.93,2.4,16.5],[col+.07,2.4,16.5]],`class="ps-cell-response" data-color-index="${col}" fill="${frame.colors[col]}" fill-opacity="${frame.response*.2}"`));
    pieces.push(`<path d="M${point(col+.5,.2,17)}L${point(col+.5,2.3,17)}M${point(col+.12,1.25,17)}L${point(col+.88,1.25,17)}" stroke="#d0e5f3" stroke-opacity=".15" stroke-dasharray="2 5"/>`);
  }
  pieces.push(`<g class="ps-layer" data-layer="nano-ellipse">`);
  for(let row=0;row<ARRAY_ROWS;row++) for(let col=0;col<5;col++) for(let across=0;across<ARRAY_COLUMNS;across++) {
    const center=p(col+.27+across*.46,.65+row*1.2,40),rx=META_RADII[col]*.4,ry=LONG_RADIUS*.4;
    // Invert the planar projection for a strictly vertical 24 px extrusion.
    // The atom base then lies on the SiO₂ surface at z=16, with no lateral skew.
    const [a,b,c,d]=META_PROJECTION;
    const dy=24/(d-b*c),dx=-c*dy;
    // The visible half starts at the projected rightmost point, not local +x.
    // This makes a continuous cylinder wall even under an oblique plan view.
    const theta=Math.atan2(c*ry,a*rx),rightX=rx*Math.cos(theta),rightY=ry*Math.sin(theta);
    pieces.push(`<g class="ps-meta-atom" data-region-index="${col}" data-array-row="${row}" data-array-column="${across}" data-radius-nm="${META_RADII[col]}" transform="matrix(${a} ${b} ${c} ${d} ${center.x.toFixed(2)} ${center.y.toFixed(2)})">
      <ellipse cx="${dx}" cy="${dy}" rx="${rx}" ry="${ry}" fill="#203b54"/>
      <path d="M${rightX},${rightY}A${rx},${ry} 0 0 1 ${-rightX},${-rightY}L${-rightX+dx},${-rightY+dy}A${rx},${ry} 0 0 0 ${rightX+dx},${rightY+dy}Z" fill="url(#ps-metal-edge)"/>
      <ellipse rx="${rx}" ry="${ry}" fill="url(#ps-metal)" stroke="#e1eff9" stroke-width="1.1"/>
    </g>`);
  }
  pieces.push(`</g>
  <g class="ps-layer" data-layer="dcsl">
    ${side(180,16,'fill="url(#ps-dielectric)" stroke="#9abbd1" stroke-opacity=".5"','fill="#7eb7d3" fill-opacity=".08" stroke="#9abbd1" stroke-opacity=".5"')}
    <path d="M${point(0,0,16)}L${point(0,0,180)}M${point(5,0,16)}L${point(5,0,180)}" stroke="#8aaccc" stroke-opacity=".35" stroke-dasharray="3 5"/>
  </g>
  <g class="ps-layer" data-layer="top-ag">
    ${side(188,180,'fill="#a7bace" fill-opacity=".85" stroke="#d0e0ed" stroke-opacity=".7"','fill="#7894b2" stroke="#b6cfe3"')}
    ${plane(188,'fill="url(#ps-cap)" stroke="#bcd2e8" stroke-opacity=".7" stroke-width="1.3"')}
  </g>
  </g>
  <g class="ps-illumination" opacity="${frame.incidentOpacity}">`);
  for(let col=0;col<5;col++) {
    const end=p(col+.32,1.25,40),start={x:end.x,y:p(col+.32,1.25,188).y-185},length=end.y-start.y;
    pieces.push(`<g class="ps-incident-ray" data-input-index="${col}" data-origin="${start.x},${start.y}" data-tip="${end.x},${end.y}" data-length="${length}">
      <defs><clipPath id="ps-input-clip-${col}" clipPathUnits="userSpaceOnUse"><rect data-input-reveal x="${start.x-22}" y="${start.y+length*frame.incidentTailProgress}" width="44" height="${length*(frame.incidentProgress-frame.incidentTailProgress)}"/></clipPath></defs>
      <g clip-path="url(#ps-input-clip-${col})"><path d="M${start.x-4},${start.y}H${start.x+4}V${end.y}H${end.x-4}Z" fill="#f5f8ff" fill-opacity=".38"/></g>
      <g data-input-head transform="translate(0 ${(frame.incidentProgress-1)*length})"><path d="M${end.x-10},${end.y-15}L${end.x},${end.y}L${end.x+10},${end.y-15}Z" fill="#f6faff" fill-opacity=".9"/></g>
    </g>`);
  }
  pieces.push(`</g><g class="ps-output-rays" opacity="${frame.reflectedOpacity}">`);
  for(let col=0;col<5;col++) {
    const cap=p(col+.62,1.25,188),origin=p(col+.62,1.25,40),tip={x:origin.x,y:cap.y-198},r=15,length=origin.y-tip.y;
    const d=`M${cap.x-r},${cap.y}V${tip.y+18}H${cap.x+r}V${cap.y}Z`;
    pieces.push(`<g data-beam-index="${col}" data-origin="${origin.x},${origin.y}" data-tip="${tip.x},${tip.y}" data-length="${length}">
      <defs><clipPath id="ps-output-clip-${col}" clipPathUnits="userSpaceOnUse"><rect data-output-reveal x="${origin.x-38}" y="${origin.y-length*frame.reflectedProgress}" width="76" height="${length*frame.reflectedProgress}"/></clipPath></defs>
      <g clip-path="url(#ps-output-clip-${col})">
        <path d="M${origin.x-5},${origin.y}H${origin.x+5}V${cap.y}H${origin.x-5}Z" data-color-index="${col}" fill="${frame.colors[col]}" fill-opacity=".5"/>
        <path d="${d}" data-color-index="${col}" fill="${frame.colors[col]}" fill-opacity=".4" filter="url(#ps-glow)"/>
        <path d="${d}" data-color-index="${col}" fill="${frame.colors[col]}" fill-opacity=".92"/>
        <path d="${d}" fill="url(#ps-beam-shine)"/>
        <ellipse cx="${cap.x}" cy="${cap.y}" rx="${r}" ry="4.5" data-color-index="${col}" fill="${frame.colors[col]}"/>
      </g>
      <g data-output-head transform="translate(0 ${length*(1-frame.reflectedProgress)})"><path d="M${tip.x-23},${tip.y+19}L${tip.x},${tip.y}L${tip.x+23},${tip.y+19}Z" data-color-index="${col}" fill="${frame.colors[col]}"/><path d="M${tip.x-23},${tip.y+19}L${tip.x},${tip.y}L${tip.x+23},${tip.y+19}Z" fill="url(#ps-beam-shine)"/></g>
    </g>`);
  }
  pieces.push(`</g>
  <g class="ps-layer-labels" font-size="13" fill="#d6e5f4" stroke-linecap="round">
    <path d="M817,349H858" fill="none" stroke="#a3bad2"/><text x="870" y="346">Ag top mirror</text><text x="870" y="365" fill="#849db7" font-size="11">15 nm · semitransparent</text>
    <path d="M790,435H858" fill="none" stroke="#83b0cb"/><text x="870" y="432">DCSL</text><text x="870" y="451" fill="#849db7" font-size="11">Planarization + cavity</text>
    <path d="M738,502H858" fill="none" stroke="#c2d4e6"/><text x="870" y="499">Al nano-ellipse</text><text x="870" y="518" fill="#849db7" font-size="11">20 nm · patterned metal</text>
    <path d="M786,562H858" fill="none" stroke="#a4ccde"/><text x="870" y="566">SiO₂ gap · 20 nm</text>
    <path d="M764,606H858" fill="none" stroke="#8ba9c6"/><text x="870" y="610">Al ground · 150 nm</text>
    <path d="M1020,484H1027V617H1020" fill="none" stroke="#557693"/><text x="1027" y="475" text-anchor="end" fill="#8daac5" font-size="11">MIM</text>
  </g>
  <g class="ps-radius-labels" fill="#d3e2f1" font-size="14" text-anchor="middle">`);
  for(let col=0;col<5;col++) {
    const pos=p(col+.5,2.5,-62);
    pieces.push(`<text x="${pos.x}" y="${pos.y}">r<tspan baseline-shift="sub" font-size="10">x</tspan> = ${META_RADII[col]} nm</text>`);
  }
  pieces.push(`</g>
  <g class="ps-footnote" fill="#90a9c2" font-size="12">
    <text x="79" y="714">Fixed r<tspan baseline-shift="sub" font-size="9">y</tspan> = 100 nm · DCSL = 180 nm</text>
    <text x="961" y="714" text-anchor="end">Cutaway · vertical scale expanded · 2 × 2 array per design</text>
  </g></g></svg>`);
  return pieces.join("");
}
