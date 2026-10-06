import { Canvas } from '@react-three/fiber';
import { createRoot, type Root } from 'react-dom/client';
import * as THREE from 'three';
import { ShardLight } from 'shardlight/react';
import { ShardLightMesh } from 'shardlight/r3f';
import { createShardLight, type ShardLightController } from 'shardlight/three';
import type { Harness, RenderOptions } from './types.js';

const stage = document.getElementById('stage') as HTMLDivElement;

let reactRoot: Root | null = null;
let controller: ShardLightController | null = null;
let renderer: THREE.WebGLRenderer | null = null;

/** World edge of the plane; the camera frames exactly this much. */
const WORLD = 2;

function afterFrames(frames = 3): Promise<void> {
  return new Promise((resolve) => {
    let count = 0;
    const step = () => {
      count += 1;
      if (count >= frames) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function setStageSize(size: number): void {
  stage.style.width = `${size}px`;
  stage.style.height = `${size}px`;
}

function resolvePreset(preset: string | null | undefined): string | null | undefined {
  return preset === undefined ? 'star' : preset;
}

function dispose(): void {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
  if (controller) {
    controller.dispose();
    controller = null;
  }
  if (renderer) {
    renderer.dispose();
    renderer.domElement.remove();
    renderer = null;
  }
  stage.innerHTML = '';
}

async function renderDOM(options: RenderOptions): Promise<void> {
  const size = options.size ?? 256;
  setStageSize(size);
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      void afterFrames().then(resolve);
    };
    reactRoot = createRoot(stage);
    reactRoot.render(
      <ShardLight
        preset={resolvePreset(options.preset)}
        size={size}
        resolution={options.resolution ?? size}
        onReady={finish}
      />,
    );
  });
}

async function renderThree(options: RenderOptions): Promise<void> {
  const pixels = options.size ?? 256;
  setStageSize(pixels);

  renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(pixels, pixels, false);
  renderer.setClearColor(0x000000, 1);
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    -WORLD / 2,
    WORLD / 2,
    WORLD / 2,
    -WORLD / 2,
    0.01,
    100,
  );
  camera.position.z = 1;

  controller = createShardLight({
    preset: options.preset ?? undefined,
    size: WORLD,
    resolution: options.resolution ?? pixels,
    autoUpdate: false,
  });
  scene.add(controller.object);

  await controller.ready;
  renderer.render(scene, camera);
  renderer.render(scene, camera);
  await afterFrames();
}

async function renderR3F(options: RenderOptions): Promise<void> {
  const pixels = options.size ?? 256;
  setStageSize(pixels);
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      void afterFrames().then(resolve);
    };
    reactRoot = createRoot(stage);
    reactRoot.render(
      <Canvas
        orthographic
        dpr={1}
        style={{ width: pixels, height: pixels, display: 'block' }}
        camera={{ position: [0, 0, 1], zoom: pixels / WORLD, near: 0.01, far: 100 }}
        gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x000000, 1);
          scene.background = new THREE.Color(0, 0, 0);
        }}
      >
        <ShardLightMesh
          preset={options.preset ?? undefined}
          size={WORLD}
          resolution={options.resolution ?? pixels}
          onReady={finish}
        />
      </Canvas>,
    );
  });
}

const harness: Harness = {
  async render(options) {
    dispose();
    if (options.target === 'dom') return renderDOM(options);
    if (options.target === 'three') return renderThree(options);
    return renderR3F(options);
  },
  dispose,
};

window.__harness = harness;
