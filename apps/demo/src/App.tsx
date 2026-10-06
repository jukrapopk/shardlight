import { Canvas } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getPreset } from 'shardlight';
import { ShardLight, Shard } from 'shardlight/react';
import { ShardLightMesh } from 'shardlight/r3f';
import { createShardLight } from 'shardlight/three';

const PRESETS = ['star', 'sun', 'sparkle', 'starburst', 'ember'] as const;

const BOX = 260;
const PRESET = 'star';

const CODE = {
  dom: `import { ShardLight } from 'shardlight/react';

<ShardLight preset="star" size={320} />`,
  three: `import { createShardLight } from 'shardlight/three';

const light = createShardLight({ preset: 'star', size: 0.6 });
scene.add(light.object);`,
  r3f: `import { ShardLightMesh } from 'shardlight/r3f';

<ShardLightMesh preset="star" size={0.4} />`,
  spin: `import { ShardLight, Shard } from 'shardlight/react';

<ShardLight preset="star" size={320}>
  <Shard id="beam" spin={0.08} />
</ShardLight>`,
  hover: `import { ShardLight, Shard } from 'shardlight/react';

<ShardLight preset="sun" size={320}>
  <Shard id="hotspot" hover={{ scale: 1.7, opacity: 1.35 }} />
  <Shard id="ring" hover={{ opacity: 2.5 }} />
</ShardLight>`,
  hoverSpin: `import { ShardLight, Shard } from 'shardlight/react';

<ShardLight preset="starburst" size={320}>
  <Shard id="rays" hover={{ spin: 0.3 }} />
</ShardLight>`,
  flicker: `import { ShardLight } from 'shardlight/react';

<ShardLight preset="ember" size={320} flicker={{ amount: 0.35 }} />`,
  custom: `import { ShardLight, Shard } from 'shardlight/react';

<ShardLight
  color="#9BE8FF"
  effects={[
    { type: 'spin', channels: ['rays'], speed: 0.05 },
    { type: 'spin', channels: ['cross'], speed: -0.07 },
    { type: 'flicker', channels: ['dust'], amount: 0.35 },
  ]}
>
  <Shard id="glow"  kind="blob"     channel="body"  strength={0.35} size={0.95} falloff={3} softness={5} />
  <Shard id="core"  kind="blob"     channel="body"  strength={1} size={0.14} hardness={0.45} falloff={2.2} hover={{ scale: 1.3, opacity: 1.35 }} />
  <Shard id="rays"  kind="fan"      channel="rays"  strength={0.7} size={1} count={6} width={4} taper={1} falloff={1.8} softness={1.5} />
  <Shard id="cross" kind="fan"      channel="cross" angle={30} strength={0.45} size={0.72} count={6} width={2} taper={1} falloff={2} softness={1} />
  <Shard id="ring"  kind="halo"     channel="rays"  strength={0.12} size={0.62} width={0.05} falloff={2} softness={1.5} />
  <Shard id="dust"  kind="clusters" channel="dust"  clusters={4} perCluster={5} spread={40} inner={0.4} strength={0.25} size={0.5} width={2} taper={1} falloff={2} softness={1} />
</ShardLight>`,
  collapse: `import { ShardLight } from 'shardlight/react';

<ShardLight preset="star" size={320} collapse />`,
};

const SHARD_BASE_KEYS = new Set([
  'id',
  'kind',
  'channel',
  'blend',
  'color',
  'seed',
  'visible',
  'spin',
  'hover',
]);

/** The two ways to get a preset: by name, or as the shards it is built from. */
function presetSnippets(name: string): { preset: string; shards: string } {
  const preset = `import { ShardLight } from 'shardlight/react';\n\n<ShardLight preset="${name}" size={320} />`;
  const config = getPreset(name);
  if (!config) return { preset, shards: '' };

  const attrs: string[] = [];
  if (config.color.toUpperCase() !== '#FFFFFF') attrs.push(`color="${config.color}"`);
  if (config.rotation) attrs.push(`rotation={${config.rotation}}`);
  const head = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';

  const lines = config.shards.map((shard) => {
    const parts = [`id="${shard.id}"`, `kind="${shard.kind}"`];
    if (shard.channel) parts.push(`channel="${shard.channel}"`);
    for (const [key, value] of Object.entries(shard as unknown as Record<string, unknown>)) {
      if (SHARD_BASE_KEYS.has(key)) continue;
      parts.push(typeof value === 'string' ? `${key}="${value}"` : `${key}={${value}}`);
    }
    return `  <Shard ${parts.join(' ')} />`;
  });

  const shards = `import { ShardLight, Shard } from 'shardlight/react';\n\n<ShardLight${head}>\n${lines.join('\n')}\n</ShardLight>`;
  return { preset, shards };
}

/** Plain three.js: an orthographic camera framing a 2-unit plane. */
function ThreeView() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(BOX, BOX);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
    camera.position.z = 1;

    const light = createShardLight({
      preset: PRESET,
      size: 2,
      resolution: 512,
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
  }, []);

  return <div className="light-box" ref={hostRef} />;
}

export function App() {
  const [composePreset, setComposePreset] = useState<string>('star');
  const compose = presetSnippets(composePreset);

  return (
    <div className="page">
      {/* Hero */}
      <header className="hero">
        <div className="hero-light">
          <ShardLight preset="star" size={300} />
        </div>
        <h1>shardlight</h1>
        <p className="lede">
          Lens flares for React, three.js and React Three Fiber.
          <br />
          Build a light once and it looks the same everywhere.
        </p>
        <div className="hero-actions">
          <a className="button primary" href="#quick-start">
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

      {/* Quick start: the same light in each target, with its code */}
      <section className="section" id="quick-start">
        <h2>Quick start</h2>
        <p className="sub">
          <code className="install">npm install shardlight</code>
        </p>
        <div className="examples">
          <figure>
            <h3>React (DOM)</h3>
            <div className="light-box">
              <ShardLight preset={PRESET} size={BOX} />
            </div>
            <pre>{CODE.dom}</pre>
          </figure>

          <figure>
            <h3>three.js</h3>
            <ThreeView />
            <pre>{CODE.three}</pre>
          </figure>

          <figure>
            <h3>React Three Fiber</h3>
            <div className="light-box">
              <Canvas
                orthographic
                dpr={[1, 2]}
                camera={{ position: [0, 0, 1], zoom: BOX / 2 }}
                gl={{ antialias: true, alpha: true }}
                style={{ width: BOX, height: BOX }}
              >
                <ShardLightMesh preset={PRESET} size={2} />
              </Canvas>
            </div>
            <pre>{CODE.r3f}</pre>
          </figure>
        </div>
      </section>

      {/* Presets */}
      <section className="section">
        <h2>Presets</h2>
        <p className="sub">Five built-in looks. Use one by name.</p>
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

      {/* Compose: a preset on the left, a fully custom light on the right */}
      <section className="section" id="compose">
        <h2>Compose it yourself</h2>
        <p className="sub">Every preset is just shards.</p>
        <div className="compose-compare">
          <div className="compose-col">
            <div className="compose-head">
              <h3>Preset</h3>
              <select
                className="preset-select"
                aria-label="Choose a preset"
                value={composePreset}
                onChange={(event) => setComposePreset(event.target.value)}
              >
                {PRESETS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="light-box">
              <ShardLight preset={composePreset} size={BOX} />
            </div>
            <div className="compose-code">
              <pre>{compose.preset}</pre>
              <div className="or">or</div>
              <pre>{compose.shards}</pre>
            </div>
          </div>

          <div className="compose-col">
            <div className="compose-head">
              <h3>Custom</h3>
            </div>
            <div className="light-box hoverable">
              <ShardLight
                color="#9BE8FF"
                effects={[
                  { type: 'spin', channels: ['rays'], speed: 0.05 },
                  { type: 'spin', channels: ['cross'], speed: -0.07 },
                  { type: 'flicker', channels: ['dust'], amount: 0.35 },
                ]}
              >
                <Shard
                  id="glow"
                  kind="blob"
                  channel="body"
                  strength={0.35}
                  size={0.95}
                  falloff={3}
                  softness={5}
                />
                <Shard
                  id="core"
                  kind="blob"
                  channel="body"
                  strength={1}
                  size={0.14}
                  hardness={0.45}
                  falloff={2.2}
                  hover={{ scale: 1.3, opacity: 1.35 }}
                />
                <Shard
                  id="rays"
                  kind="fan"
                  channel="rays"
                  strength={0.7}
                  size={1}
                  count={6}
                  width={4}
                  taper={1}
                  falloff={1.8}
                  softness={1.5}
                />
                <Shard
                  id="cross"
                  kind="fan"
                  channel="cross"
                  angle={30}
                  strength={0.45}
                  size={0.72}
                  count={6}
                  width={2}
                  taper={1}
                  falloff={2}
                  softness={1}
                />
                <Shard
                  id="ring"
                  kind="halo"
                  channel="rays"
                  strength={0.12}
                  size={0.62}
                  width={0.05}
                  falloff={2}
                  softness={1.5}
                />
                <Shard
                  id="dust"
                  kind="clusters"
                  channel="dust"
                  clusters={4}
                  perCluster={5}
                  spread={40}
                  inner={0.4}
                  strength={0.25}
                  size={0.5}
                  width={2}
                  taper={1}
                  falloff={2}
                  softness={1}
                />
              </ShardLight>
            </div>
            <div className="compose-code">
              <pre>{CODE.custom}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* Effects: per-shard motion you can add over any preset */}
      <section className="section" id="effects">
        <h2>Effects</h2>
        <p className="sub">
          Bring any preset to life with <code>flicker</code>, <code>spin</code>, <code>hover</code>,
          or <code>collapse</code>.
        </p>
        <div className="examples effects-grid">
          <figure>
            <h3>Flicker</h3>
            <div className="light-box">
              <ShardLight preset="ember" size={BOX} flicker={{ amount: 0.35 }} />
            </div>
            <pre>{CODE.flicker}</pre>
          </figure>

          <figure>
            <h3>Spin</h3>
            <div className="light-box">
              <ShardLight preset="star" size={BOX}>
                <Shard id="beam" spin={0.08} />
              </ShardLight>
            </div>
            <pre>{CODE.spin}</pre>
          </figure>

          <figure>
            <h3>Hover</h3>
            <div className="light-box">
              <ShardLight preset="sun" size={BOX} className="hoverable">
                <Shard id="hotspot" hover={{ scale: 1.7, opacity: 1.35 }} />
                <Shard id="ring" hover={{ opacity: 2.5 }} />
              </ShardLight>
            </div>
            <pre>{CODE.hover}</pre>
          </figure>

          <figure>
            <h3>Spin on hover</h3>
            <div className="light-box">
              <ShardLight preset="starburst" size={BOX} className="hoverable">
                <Shard id="rays" hover={{ spin: 0.3 }} />
              </ShardLight>
            </div>
            <pre>{CODE.hoverSpin}</pre>
          </figure>

          <figure>
            <h3>Collapse</h3>
            <div className="light-box">
              <ShardLight preset="star" size={BOX} className="hoverable" collapse />
            </div>
            <pre>{CODE.collapse}</pre>
          </figure>
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
