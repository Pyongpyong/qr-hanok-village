import { seededRandom } from "./villageGenerator";
import type { QRHanokVillageView } from "../types";

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

/** Tiles dissolve at departure and reappear during the final camera-return segment. */
export function transitionFrame(
  view: QRHanokVillageView,
  elapsed: number,
  duration: number,
) {
  const length = Number.isFinite(duration) ? Math.max(0, duration) : 1400;
  if (length === 0)
    return {
      camera: view === "village" ? 1 : 0,
      reveal: view === "village" ? 1 : 0,
      done: true,
    };
  const tileTime = Math.min(350, length * 0.25);
  const time = Math.max(0, elapsed);
  const camera = smooth(time / length),
    reveal = smooth(
      (time - (view === "qr" ? length - tileTime : 0)) / tileTime,
    );
  return {
    camera: view === "village" ? camera : 1 - camera,
    reveal: view === "village" ? reveal : 1 - reveal,
    done: time >= length,
  };
}

/** Each tile receives a unique, reproducible position in a shuffled reveal order. */
export function tileOrder(count: number, seed: string) {
  const order = Array.from({ length: count }, (_, i) => i),
    random = seededRandom(`qr-tiles:${seed}`);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return Float32Array.from(order, (rank) =>
    count > 1 ? rank / (count - 1) : 0,
  );
}
