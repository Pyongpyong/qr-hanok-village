import { seededRandom } from "./villageGenerator";
export function createHouseLight(seed: string) {
  const random = seededRandom(`house-light:${seed}`);
  return {
    key: Math.floor(random() * 0x7fffffff),
    period: 2.5 + random() * 5.5,
    offset: random() * 20,
  };
}
function noise(key: number, epoch: number) {
  let h = Math.imul(key ^ epoch, 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Smoothly varying random targets; all windows of a house share one light. */
export function houseBrightness(
  profile: ReturnType<typeof createHouseLight>,
  seconds: number,
) {
  const time = (Math.max(0, seconds) + profile.offset) / profile.period,
    epoch = Math.floor(time),
    t = time - epoch,
    ease = t * t * (3 - 2 * t);
  const a = noise(profile.key, epoch),
    b = noise(profile.key, epoch + 1);
  return 0.06 + 1.5 * (a + (b - a) * ease);
}
