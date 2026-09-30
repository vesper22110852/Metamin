import { mountSummaryPlayer } from "./summary-player.mjs?v=1";
import { createPolarizationSVG, getSummaryFrame } from "./polarization-scene.mjs?v=5";

const root=document.querySelector("[data-paper-summary]");
if(root) {
  const stage=root.querySelector("[data-summary-stage]");
  stage.innerHTML=createPolarizationSVG(0);
  const fills=[...stage.querySelectorAll("[data-color-index]")];
  const illumination=stage.querySelector(".ps-illumination");
  const output=stage.querySelector(".ps-output-rays");
  const responses=[...stage.querySelectorAll(".ps-cell-response")];
  const inputs=[...stage.querySelectorAll("[data-input-index]")].map(group=>({
    length:Number(group.dataset.length),originY:Number(group.dataset.origin.split(",")[1]),
    reveal:group.querySelector("[data-input-reveal]"),
    head:group.querySelector("[data-input-head]")
  }));
  const outputs=[...stage.querySelectorAll("[data-beam-index]")].map(group=>({
    length:Number(group.dataset.length),originY:Number(group.dataset.origin.split(",")[1]),
    reveal:group.querySelector("[data-output-reveal]"),
    head:group.querySelector("[data-output-head]")
  }));
  const axis=stage.querySelector("[data-polarization-axis]");
  const title=root.querySelector("[data-summary-title]");
  const caption=root.querySelector("[data-summary-caption]");
  const angle=root.querySelector("[data-summary-angle]");
  const chapters=[...root.querySelectorAll("[data-summary-chapter]")];
  let currentChapter=-1;
  mountSummaryPlayer(root,{duration:20,render(seconds) {
    const frame=getSummaryFrame(seconds);
    for(const element of fills) element.setAttribute("fill",frame.colors[Number(element.dataset.colorIndex)]);
    illumination.setAttribute("opacity",String(frame.incidentOpacity));
    output.setAttribute("opacity",String(frame.reflectedOpacity));
    for(const surface of responses) surface.setAttribute("fill-opacity",String(frame.response*.2));
    for(const ray of inputs) {
      ray.reveal.setAttribute("y",String(ray.originY+ray.length*frame.incidentTailProgress));
      ray.reveal.setAttribute("height",String(ray.length*(frame.incidentProgress-frame.incidentTailProgress)));
      ray.head.setAttribute("transform",`translate(0 ${(frame.incidentProgress-1)*ray.length})`);
    }
    for(const ray of outputs) {
      ray.reveal.setAttribute("y",String(ray.originY-ray.length*frame.reflectedProgress));
      ray.reveal.setAttribute("height",String(ray.length*frame.reflectedProgress));
      ray.head.setAttribute("transform",`translate(0 ${ray.length*(1-frame.reflectedProgress)})`);
    }
    axis.setAttribute("transform",`rotate(${-frame.angle})`);
    angle.textContent=`${Math.round(frame.angle)}° · ${frame.angle<.5 ? "x polarization" : frame.angle>89.5 ? "y polarization" : "rotating polarization"}`;
    for(const button of chapters) {
      const active=button.dataset.time==="4" ? frame.angle===0 && frame.time>=4 : frame.angle===90;
      button.setAttribute("aria-current",active ? "step" : "false");
    }
    if(currentChapter!==frame.chapter) {
      currentChapter=frame.chapter;
      title.textContent=frame.title;
      caption.textContent=frame.caption;
    }
  }});
  root.querySelector("[data-summary-controls]").hidden=false;
}
