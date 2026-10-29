# qr-hanok-village

[Live demo](https://qr-hanok-village.vercel.app/)

A React component that transforms a scannable QR code into a miniature Korean hanok village. Dark QR modules become tiled roofs, while people, dogs, and cats wander through the alleys. A day/night cycle adds warm, independently changing window lights.

Built with React and Three.js. No external 3D models, stylesheet imports, or scene setup required.

## Installation

```sh
npm install qr-hanok-village react@^19 react-dom@^19 three @react-three/fiber@^9
```

Requires React 19, React DOM 19, React Three Fiber 9, and Three.js `>=0.170.0 <1`. These are peer dependencies and are not bundled into the library. The package provides ESM and TypeScript declarations. Node.js 22.14 or newer is required for Node-based tooling and server rendering.

## Basic usage

```tsx
import { QRHanokVillage } from "qr-hanok-village";

export default function App() {
  return (
    <QRHanokVillage value="https://example.com" width={500} height={500} />
  );
}
```

The component starts in QR view with autoplay enabled. Click or tap to reveal the village. In village view, drag to rotate or tilt the camera, and scroll or pinch to zoom; click without dragging to return to the QR code. The QR tiles reappear during the final part of the camera's return.

The default width is `100%` and the default height is `500px`. Resizing is handled automatically. If you use `height="100%"`, give the parent an explicit height.

## Props

All durations are in milliseconds.

| Prop                 | Type                                                               | Default                                      | Description                                                                       |
| -------------------- | ------------------------------------------------------------------ | -------------------------------------------- | --------------------------------------------------------------------------------- |
| `architecture`       | `"hanok" \| "palace"` | `"hanok"`                                    | Village or palace-inspired geometry preset.                                       |
| `dancheong`          | `boolean`                                                          | `false` for hanok, `true` for palace presets | Painted green, blue, red, and gold timber ornament.                               |
| `value`              | `string`                                                           | Required                                     | Text or URL encoded in the QR code.                                               |
| `width`              | `number \| string`                                                 | `"100%"`                                     | Container width; numbers are pixels.                                              |
| `height`             | `number \| string`                                                 | `500`                                        | Container height; numbers are pixels.                                             |
| `autoPlay`           | `boolean`                                                          | `true`                                       | QR → village day/night/day cycle → QR.                             |
| `qrDuration`         | `number`                                                           | `3000`                                       | Time spent in QR view when autoplay is enabled.                                   |
| `villageDuration`    | `number`                                                           | —                                            | Deprecated; ignored. Autoplay follows `dayNightDuration`.                              |
| `transitionDuration` | `number`                                                           | `1400`                                       | Total duration of a view change. Set to `0` for an instant change.                |
| `zoom`               | `number`                                                           | `1.3`                                        | Positive camera zoom multiplier for village view. QR framing stays fixed.         |
| `initialView`        | `"qr" \| "village"`                                                | `"qr"`                                       | View used on the initial mount.                                                   |
| `interactive`        | `boolean`                                                          | `true`                                       | Enable click/tap switching, drag rotation, and wheel/pinch zoom.                                     |
| `showControls`       | `boolean`                                                          | `false`                                      | Show basic QR and village buttons.                                                |
| `characterAnimation` | `boolean`                                                          | `true`                                       | Show and animate people, dogs, and cats in village view.                          |
| `residentCount`      | `number`                                                           | `24`                                         | Combined population. Rounded down and limited to `0–96`.                          |
| `dayNightDuration`   | `number`                                                           | `60000`                                      | Duration of a complete day → night → day cycle.                                   |
| `seed`               | `string \| number`                                                 | `value`                                      | Reproduce the village layout and animation patterns without changing the QR data. |
| `className`          | `string`                                                           | —                                            | Class applied to the outer container.                                             |
| `style`              | `React.CSSProperties`                                              | —                                            | Inline styles applied to the outer container.                                     |
| `onViewChange`       | `(view: QRHanokVillageView) => void`                               | —                                            | Called when a transition completes, not on initial mount.                         |

```tsx
<QRHanokVillage
  value="https://example.com"
  autoPlay
  qrDuration={5000}
  transitionDuration={1800}
  zoom={1.3}
  residentCount={36}
  dayNightDuration={90000}
  seed="bukchon"
  showControls
/>
```

View changes are ignored while a transition is running. Autoplay pauses during dragging and restarts its waiting period when the gesture ends. Changing `value` or `seed` preserves the current view.

Each village visit starts in daylight and runs a complete day → night → day cycle (`dayNightDuration`, default 60 seconds). Autoplay then returns to QR view. With autoplay disabled, lighting continues cycling in village view. Holding a drag or pinch defers automatic return until release. Wheel and pinch zoom affect only village view; zoom resets on return to QR or when the `zoom` prop changes. The background and floor darken together at night, and each house's windows brighten and dim at different intervals. The default population is eight people, eight dogs, and eight cats. Set `residentCount={0}` or `characterAnimation={false}` to hide them.

Use finite, nonnegative durations and a finite, positive zoom. Higher zoom values may crop the village edges. An empty or oversized QR value displays an inline error.

## Architecture styles

```tsx
<QRHanokVillage
  value="https://example.com"
  architecture="palace"
  dancheong
/>
```

Choose `hanok` for the original village, or `palace` for palace-inspired roof tiers, columns, and raised stone platforms. These are procedural style presets, not replicas of the real palace layouts. Set `dancheong` independently to add painted eaves and bracket details. QR roof footprints and encoding remain unchanged across styles.

## Ref API

```tsx
import { useRef } from "react";
import { QRHanokVillage, type QRHanokVillageRef } from "qr-hanok-village";

export function ControlledVillage() {
  const ref = useRef<QRHanokVillageRef>(null);

  return (
    <>
      <QRHanokVillage ref={ref} value="https://example.com" />
      <button onClick={() => ref.current?.showVillage()}>
        Explore village
      </button>
      <button onClick={() => ref.current?.showQR()}>Show QR</button>
      <button onClick={() => ref.current?.toggle()}>Toggle view</button>
    </>
  );
}
```

| Method          | Description                  |
| --------------- | ---------------------------- |
| `showVillage()` | Transition to village view.  |
| `showQR()`      | Transition to QR view.       |
| `toggle()`      | Switch to the opposite view. |

The package exports `QRHanokVillage` and these TypeScript types:

```ts
import type {
  QRHanokVillageArchitecture,
  QRHanokVillageProps,
  QRHanokVillageRef,
  QRHanokVillageView,
} from "qr-hanok-village";

// QRHanokVillageView = "qr" | "village"
```

## Next.js and SSR

Use a client component wrapper with the App Router:

```tsx
"use client";

import { QRHanokVillage } from "qr-hanok-village";

export default function Village() {
  return <QRHanokVillage value="https://example.com" />;
}
```

Importing the package and rendering its container on the server do not require browser globals. The WebGL canvas is created after mounting in the browser. Keep `"use client"` in your application's wrapper. A fallback message is shown when WebGL is unavailable.

## QR scanning and browser support

Scan the code in QR view. Autoplay is off by default so visitors have time to scan. Shorter URLs and a sufficiently large display area improve readability; scanning results also depend on screen brightness and the scanning device. Physical smartphone scanning has not been validated across devices.

Targets modern Chrome, Edge, Firefox, and Safari with ES2022, WebGL2, and ResizeObserver support. React 18 is not supported.

For manual, instant view changes, use `autoPlay={false}` and `transitionDuration={0}`. Disable the crowd separately with `characterAnimation={false}`.

## License

[MIT](https://github.com/Pyongpyong/qr-hanok-village/blob/main/LICENSE).
