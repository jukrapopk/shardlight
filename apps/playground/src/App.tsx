import { Canvas } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ShardLight } from 'shardlight/react';
import { ShardLightMesh } from 'shardlight/r3f';
import { createShardLight } from 'shardlight/three';

const PRESETS = ['star', 'sun', 'anamorphic', 'sparkle'] as const;
type Preset = (typeof PRESETS)[number];

const BOX = 320;

interface LightProps {
  preset: Preset;
  color: string;
  spin: boolean;
  flicker: boolean;
}

/** Plain three.js: an orthographic camera framing a 2-unit plane. */
function ThreeView({ preset, color, spin, flicker }: LightProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(BOX, BOX, false);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
    camera.position.z = 1;

    const effects = [
      ...(spin ? [{ type: 'spin' as const }] : []),
      ...(flicker ? [{ type: 'flicker' as const }] : []),
    ];
    const light = createShardLight({ preset, color, size: 2, resolution: 512, effects });
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
  }, [preset, color, spin, flicker]);

  return <div className="light-box" ref={hostRef} />;
}

function codeSnippet({ preset, color, spin, flicker }: LightProps): string {
  const props = [
    `preset="${preset}"`,
    color.toUpperCase() !== '#FFF4E0' ? `color="${color}"` : null,
    spin ? 'spin' : null,
    flicker ? 'flicker' : null,
  ]
    .filter(Boolean)
    .join(' ');
  return `<ShardLight ${props} />`;
}

export function App() {
  const [preset, setPreset] = useState<Preset>('star');
  const [color, setColor] = useState('#FFF4E0');
  const [spin, setSpin] = useState(false);
  const [flicker, setFlicker] = useState(false);

  const light: LightProps = { preset, color, spin, flicker };

  return (
    <div className="app">
      <header>
        <h1>shardlight playground</h1>
        <p>One light, three targets. Change the controls and compare.</p>
      </header>

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
          <input type="checkbox" checked={spin} onChange={(e) => setSpin(e.target.checked)} /> spin
        </label>
        <label className="check">
          <input type="checkbox" checked={flicker} onChange={(e) => setFlicker(e.target.checked)} />{' '}
          flicker
        </label>
      </div>

      <div className="grid">
        <section>
          <h2>React (DOM)</h2>
          <div className="light-box">
            <ShardLight preset={preset} color={color} size={BOX} spin={spin} flicker={flicker} />
          </div>
        </section>

        <section>
          <h2>three.js</h2>
          <ThreeView {...light} />
        </section>

        <section>
          <h2>React Three Fiber</h2>
          <div className="light-box">
            <Canvas
              orthographic
              dpr={[1, 2]}
              camera={{ position: [0, 0, 1], zoom: BOX / 2 }}
              gl={{ antialias: true, alpha: true }}
              style={{ width: BOX, height: BOX }}
            >
              <ShardLightMesh
                preset={preset}
                color={color}
                size={2}
                spin={spin}
                flicker={flicker}
              />
            </Canvas>
          </div>
        </section>
      </div>

      <pre className="code">{codeSnippet(light)}</pre>
    </div>
  );
}
