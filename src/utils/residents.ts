import { makeRoute, seededRandom, type Village } from "./villageGenerator";
export function createResidents(village: Village, count: number, seed: string) {
  const total = Number.isFinite(count)
    ? Math.max(0, Math.min(96, Math.floor(count)))
    : 24;
  const random = seededRandom(`residents:${seed}`);
  return Array.from({ length: total }, (_, i) => {
    const kind = (["person", "dog", "cat"] as const)[i % 3];
    const route = makeRoute(village.lanes, `${seed}:resident:${i}`);
    return {
      kind,
      route,
      offset: random() * route.length,
      speed: 0.32 + random() * 0.35,
      coat: ["#d0a06a", "#e0d8c6", "#888c95", "#ba8055"][
        Math.floor(random() * 4)
      ],
      shirt: ["#b86b55", "#6b8e88", "#8b83a5", "#d1a656", "#7b9169", "#6484a1"][
        Math.floor(random() * 6)
      ],
      hair: ["#49392c", "#65503a", "#33363a"][Math.floor(random() * 3)],
    };
  }).filter((r) => r.route.length > 1);
}
