import { useRef, useState } from "react";
import {
  QRHanokVillage,
  type QRHanokVillageRef,
  type QRHanokVillageView,
} from "../src";
export default function App() {
  const ref = useRef<QRHanokVillageRef>(null),
    [value, setValue] = useState("https://example.com"),
    [draft, setDraft] = useState(value),
    [seed, setSeed] = useState("bukchon"),
    [auto, setAuto] = useState(false),
    [transition, setTransition] = useState(1800),
    [duration, setDuration] = useState(9000),
    [cycle, setCycle] = useState(60000),
    [residentCount, setResidentCount] = useState(24),
    [zoom, setZoom] = useState(1.3),
    [view, setView] = useState<QRHanokVillageView>("qr");
  return (
    <main>
      <header>
        <a className="brand" href="./">
          <span className="brand-icon">韓</span> hanok
          <span className="brand-sub">INTERACTIVE OBJECTS</span>
        </a>
        <span className="edition">EXPERIMENT 001 / SEOUL, KR</span>
        <a
          href="https://www.npmjs.com/package/qr-hanok-village"
          className="package-link"
        >
          npm package ↗
        </a>
      </header>
      <section className="intro">
        <div className="eyebrow">
          <span /> A LITTLE WORLD, HIDDEN IN PLAIN SIGHT
        </div>
        <h1>
          A code.
          <br />A place to <em>wander.</em>
        </h1>
        <p>
          A familiar pattern becomes a tiny Korean village.
          <br />
          Tilt your perspective. Find something unexpected.
        </p>
      </section>
      <section className="workspace">
        <div className="stage">
          <div className="stage-top">
            <span>
              <i /> LIVE GENERATIVE SCENE
            </span>
            <span>ORTHOGRAPHIC / {view === "qr" ? "01" : "02"}</span>
          </div>
          <QRHanokVillage
            ref={ref}
            value={value}
            seed={seed}
            height="100%"
            autoPlay={auto}
            dayNightDuration={cycle}
            zoom={zoom}
            residentCount={residentCount}
            transitionDuration={transition}
            villageDuration={duration}
            onViewChange={setView}
            style={{ minHeight: 380 }}
          />
          <div className="stage-bottom">
            <span>
              {view === "qr" ? "01 — THE PATTERN" : "02 — THE VILLAGE"}
            </span>
            <span>
              {view === "qr"
                ? "Click the scene to explore ↗"
                : "Drag to rotate · Click to return ↙"}
            </span>
          </div>
        </div>
        <aside>
          <div className="panel-heading">
            <h2>Make it yours</h2>
            <span>↗</span>
          </div>
          <p className="panel-desc">Every link has a village of its own.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setValue(draft);
            }}
          >
            <label>
              DESTINATION URL
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                required
                placeholder="https://example.com"
              />
            </label>
            <button className="generate">
              Generate village <span>↗</span>
            </button>
          </form>
          <div className="divider" />
          <label>YOUR PERSPECTIVE</label>
          <div className="segmented">
            <button
              className={view === "qr" ? "selected" : ""}
              onClick={() => ref.current?.showQR()}
            >
              ▦ &nbsp; QR view
            </button>
            <button
              className={view === "village" ? "selected" : ""}
              onClick={() => ref.current?.showVillage()}
            >
              ⌂ &nbsp; Village view
            </button>
          </div>
          <div className="autoplay">
            <span>
              Autoplay <small>Let the scene unfold</small>
            </span>
            <button
              className={`switch ${auto ? "on" : ""}`}
              role="switch"
              aria-checked={auto}
              aria-label="Autoplay"
              onClick={() => setAuto(!auto)}
            >
              <span />
            </button>
          </div>
          <label className="range-label">
            REVEAL + CAMERA <b>{(transition / 1000).toFixed(1)} s</b>
            <input
              type="range"
              min="400"
              max="4000"
              step="100"
              value={transition}
              onChange={(e) => setTransition(+e.target.value)}
            />
          </label>
          <label className="range-label">
            VILLAGE ZOOM <b>{zoom.toFixed(2)}×</b>
            <input
              type="range"
              min="0.6"
              max="2"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(+e.target.value)}
            />
          </label>
          <label className="range-label">
            TIME IN THE VILLAGE <b>{duration / 1000} s</b>
            <input
              type="range"
              min="3000"
              max="20000"
              step="1000"
              value={duration}
              onChange={(e) => setDuration(+e.target.value)}
            />
          </label>
          <label className="range-label">
            DAY / NIGHT CYCLE <b>{cycle / 1000} s</b>
            <input
              type="range"
              min="10000"
              max="120000"
              step="10000"
              value={cycle}
              onChange={(e) => setCycle(+e.target.value)}
            />
          </label>
          <label className="range-label">
            VILLAGE RESIDENTS <b>{residentCount}</b>
            <input
              type="range"
              min="0"
              max="60"
              step="3"
              value={residentCount}
              onChange={(e) => setResidentCount(+e.target.value)}
            />
          </label>
          <label>
            VILLAGE SEED
            <input value={seed} onChange={(e) => setSeed(e.target.value)} />
          </label>
          <p className="seed-note">Same seed. Same little world. Always.</p>
        </aside>
      </section>
      <footer>
        <span>BUILT FROM PATTERNS. MADE FOR CURIOSITY.</span>
        <span>
          React + Three.js <span className="footer-dot">·</span> No external
          models
        </span>
      </footer>
    </main>
  );
}
