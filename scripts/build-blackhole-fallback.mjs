import { writeFileSync } from "node:fs";
import { createBlackholeSVG } from "../assets/blackhole-scene.mjs";

writeFileSync(new URL("../assets/blackhole-concept.svg", import.meta.url), `${createBlackholeSVG()}\n`);
console.log("Updated Blackhole SVG fallback.");
