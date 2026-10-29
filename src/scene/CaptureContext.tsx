import { createContext, useContext, useLayoutEffect } from "react";
import { useThree, type RootState } from "@react-three/fiber";
/** Internal frame clock used by the demo exporter; not part of the public API. */
export interface CaptureFrame {
  time: number;
  camera: number;
  reveal: number;
  yaw: number;
  zoom: number;
  daylight: number;
  residents: boolean;
}
export interface CaptureSession {
  width: number;
  height: number;
  frame: CaptureFrame;
  onReady: (state: RootState) => void;
}
export const CaptureContext = createContext<CaptureSession | null>(null);
export const useCapture = () => useContext(CaptureContext);
export function CaptureBridge({ session }: { session: CaptureSession }) {
  const state = useThree();
  useLayoutEffect(() => {
    if (
      state.size.width === session.width &&
      state.size.height === session.height
    )
      session.onReady(state);
  }, [session, state, state.size.width, state.size.height]);
  return null;
}
