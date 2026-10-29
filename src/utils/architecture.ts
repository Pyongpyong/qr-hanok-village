import type { QRHanokVillageArchitecture } from "../types";
export function architectureStyle(preset: QRHanokVillageArchitecture) {
  switch (preset) {
    case "palace":
      return {
        floor: 0.25,
        wall: 0.76,
        variation: 0.2,
        roofScale: 1.15,
        wood: "#7e3630",
        stone: "#aaa79d",
        upperRatio: 0.74,
        upperLift: 0.3,
      };
    default:
      return {
        floor: 0.14,
        wall: 0.61,
        variation: 0.16,
        roofScale: 1,
        wood: "#645642",
        stone: "#b4afa1",
        upperRatio: 0,
        upperLift: 0,
      };
  }
}
