import type { CSSProperties } from "react";
export type QRHanokVillageArchitecture =
  "hanok" | "palace";
export type QRHanokVillageView = "qr" | "village";
export type Phase =
  "QR_VIEW" | "TRANSITION_TO_VILLAGE" | "VILLAGE_VIEW" | "TRANSITION_TO_QR";
export interface QRHanokVillageProps {
  value: string;
  /** Geometry proportions inspired by traditional villages or palace halls. */
  architecture?: QRHanokVillageArchitecture;
  /** Painted timber ornament. Defaults to true for palace presets. */
  dancheong?: boolean;
  width?: number | string;
  height?: number | string;
  autoPlay?: boolean;
  /** All durations are milliseconds. */
  qrDuration?: number;
  villageDuration?: number;
  /** Total duration of the tile + camera sequence, in milliseconds. */
  transitionDuration?: number;
  /** Village camera zoom multiplier. QR framing stays fixed. Default: 1.3. */
  zoom?: number;
  initialView?: QRHanokVillageView;
  interactive?: boolean;
  showControls?: boolean;
  characterAnimation?: boolean;
  /** People, dogs and cats combined. Default: 24; range: 0–96. */
  residentCount?: number;
  /** Complete day/night cycle in milliseconds. Default: 60000. */
  dayNightDuration?: number;
  seed?: string | number;
  className?: string;
  style?: CSSProperties;
  /** Called when the camera reaches a stable view. */
  onViewChange?: (view: QRHanokVillageView) => void;
}
export interface QRHanokVillageRef {
  showVillage(): void;
  showQR(): void;
  toggle(): void;
}
