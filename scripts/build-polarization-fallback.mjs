import { writeFileSync } from "node:fs";
import { createPolarizationSVG } from "../assets/polarization-scene.mjs";
writeFileSync(new URL("../assets/polarization-summary.svg", import.meta.url),createPolarizationSVG(4)+"\n");
console.log("Updated publication summary fallback.");
