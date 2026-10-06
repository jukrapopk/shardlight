import { Canvas } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ShardLight } from 'shardlight/react';
import { ShardLightMesh } from 'shardlight/r3f';
import { createShardLight } from 'shardlight/three';

const PRESETS = ['star', 'sun', 'anamorphic', 'sparkle'] as const;
type Preset = (typeof PRESETS)[number];

const TARGET_BOX = 260;

interface TargetProps {
  preset: Preset;
  color: string;
  flicker: boolean;
}

/** Plain three.js: an orthographic camera framing a 2-unit plane. */
function ThreeView({ preset, color, flicker }: TargetProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(TARGET_BOX, TARGET_BOX);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
    camera.position.z = 1;

    const light = createShardLight({
      preset,
      color,
      size: 2,
      resolution: 512,
      effects: flicker ? [{ type: 'flicker' }] : [],
    });
    scene.add(light.object);

    let raf = 0;
    const loop = () => {
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      light.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [preset, color, flicker]);

  return <div className="light-box" ref={hostRef} />;
}

function snippet(props: TargetProps): string {
  const parts = [
    `preset="${props.preset}"`,
    props.color.toUpperCase() !== '#FFF4E0' ? `color="${props.color}"` : null,
    props.flicker ? 'flicker' : null,
  ].filter(Boolean);
  return `<ShardLight ${parts.join(' ')} />`;
}

export function App() {
  const [preset, setPreset] = useState<Preset>('star');
  const [color, setColor] = useState('#FFF4E0');
  const [flicker, setFlicker] = useState(false);

  const target: TargetProps = { preset, color, flicker };

  return (
    <div className="page">
      {/* Hero */}
      <header className="hero">
        <div className="hero-light">
          <ShardLight preset="star" color={color} size={300} flicker={flicker} />
        </div>
        <p className="eyebrow">one light · three targets</p>
        <h1>shardlight</h1>
        <p className="lede">
          Layered <em>shard</em> lens-flare lights that render identically in 2D React, three.js and
          React Three Fiber.
        </p>
        <div className="hero-actions">
          <a className="button primary" href="#play">
            Try it
          </a>
          <a
            className="button"
            href="https://github.com/jukrapopk/shardlight"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <code className="install">npm install shardlight</code>
        </div>
        <div className="badges">
          <img alt="npm version" src="https://img.shields.io/npm/v/shardlight" loading="lazy" />
          <img alt="license" src="https://img.shields.io/npm/l/shardlight" loading="lazy" />
          <img
            alt="CI"
            src="https://img.shields.io/github/actions/workflow/status/jukrapopk/shardlight/ci.yml"
            loading="lazy"
          />
        </div>
      </header>

      {/* Interactive three-target playground */}
      <section id="play" className="section">
        <h2>One light, three targets</h2>
        <p className="sub">
          The same config renders to <code>&lt;img&gt;</code>, three.js planes and R3F meshes.
        </p>

        <div className="controls">
          <label>
            Preset
            <select value={preset} onChange={(event) => setPreset(event.target.value as Preset)}>
              {PRESETS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Color
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={flicker}
              onChange={(e) => setFlicker(e.target.checked)}
            />{' '}
            flicker
          </label>
        </div>

        <div className="targets">
          <figure>
            <div className="light-box">
              <ShardLight preset={preset} color={color} size={TARGET_BOX} flicker={flicker} />
            </div>
            <figcaption>React (DOM)</figcaption>
          </figure>

          <figure>
            <ThreeView {...target} />
            <figcaption>three.js</figcaption>
          </figure>

          <figure>
            <div className="light-box">
              <Canvas
                orthographic
                dpr={[1, 2]}
                camera={{ position: [0, 0, 1], zoom: TARGET_BOX / 2 }}
                gl={{ antialias: true, alpha: true }}
                style={{ width: TARGET_BOX, height: TARGET_BOX }}
              >
                <ShardLightMesh preset={preset} color={color} size={2} flicker={flicker} />
              </Canvas>
            </div>
            <figcaption>React Three Fiber</figcaption>
          </figure>
        </div>

        <pre className="code">{snippet(target)}</pre>
      </section>

      {/* Presets */}
      <section className="section">
        <h2>Presets</h2>
        <p className="sub">Registered by default — pass a name and go.</p>
        <div className="presets">
          {PRESETS.map((name) => (
            <figure key={name} className="preset-card">
              <div className="light-box small">
                <ShardLight preset={name} size={160} />
              </div>
              <figcaption>{name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Quick start */}
      <section className="section">
        <h2>Quick start</h2>
        <div className="cards">
          <div className="card">
            <h3>React (DOM)</h3>
            <pre>{`import { ShardLight } from 'shardlight/react';

<ShardLight preset="sun" size={320} flicker />`}</pre>
          </div>
          <div className="card">
            <h3>three.js</h3>
            <pre>{`import { createShardLight } from 'shardlight/three';

const light = createShardLight({ preset: 'sun', size: 0.6 });
scene.add(light.object);`}</pre>
          </div>
          <div className="card">
            <h3>React Three Fiber</h3>
            <pre>{`import { ShardLightMesh } from 'shardlight/r3f';

<ShardLightMesh preset="sun" size={0.4} flicker />`}</pre>
          </div>
        </div>
      </section>

      <footer>
        <span>MIT ·</span>
        <a href="https://github.com/jukrapopk/shardlight" target="_blank" rel="noreferrer">
          github.com/jukrapopk/shardlight
        </a>
        <span>·</span>
        <a href="https://www.npmjs.com/package/shardlight" target="_blank" rel="noreferrer">
          npm
        </a>
      </footer>
    </div>
  );
}
