"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { createEarlyCinematicRig } from "./early-cinematic-rig";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (a: number, b: number, value: number) => {
  const t = clamp((value - a) / Math.max(0.0001, b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const pulse = (value: number, center: number, radius: number) =>
  Math.max(0, 1 - Math.abs(value - center) / radius);

const RGB_SHIFT_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.0 },
    angle: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float amount;
    uniform float angle;
    varying vec2 vUv;
    void main() {
      vec2 offset = amount * vec2(cos(angle), sin(angle));
      vec4 cr = texture2D(tDiffuse, vUv + offset);
      vec4 cg = texture2D(tDiffuse, vUv);
      vec4 cb = texture2D(tDiffuse, vUv - offset);
      gl_FragColor = vec4(cr.r, cg.g, cb.b, cg.a);
    }
  `,
};

const PORTAL_SHADER = {
  uniforms: {
    time: { value: 0 },
    intensity: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float intensity;
    varying vec2 vUv;

    float ring(float r, float center, float width) {
      return smoothstep(width, 0.0, abs(r - center));
    }

    void main() {
      vec2 p = vUv - 0.5;
      p.x *= 1.02;
      float r = length(p);
      float a = atan(p.y, p.x);
      float swirl = sin(a * 9.0 - time * 1.55 + r * 26.0) * 0.5 + 0.5;
      float bands = ring(r, 0.31 + sin(time * 0.42) * 0.012, 0.055)
                  + ring(r, 0.20 + cos(time * 0.5) * 0.01, 0.035) * 0.55;
      float core = smoothstep(0.46, 0.03, r) * (0.18 + swirl * 0.42);
      float spokes = pow(max(0.0, sin(a * 14.0 + time * 0.8)), 8.0) * smoothstep(0.46, 0.1, r);
      float alpha = (bands * 0.78 + core * 0.52 + spokes * 0.18) * intensity;
      vec3 cold = vec3(0.49, 0.72, 0.70);
      vec3 warm = vec3(0.69, 0.53, 0.34);
      vec3 color = mix(cold, warm, clamp(swirl * 0.35 + bands * 0.25, 0.0, 1.0));
      gl_FragColor = vec4(color * (0.55 + bands * 1.8 + spokes), alpha);
    }
  `,
};

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(240,248,235,.95)");
  gradient.addColorStop(0.14, "rgba(183,219,207,.52)");
  gradient.addColorStop(0.42, "rgba(116,167,157,.16)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function SceneCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 760px)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isMobile,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      });
    } catch {
      mount.dataset.webgl = "failed";
      return;
    }

    renderer.setClearColor(0x010203, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.86;
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010203);
    scene.fog = new THREE.FogExp2(0x020405, 0.0255);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 140);
    camera.position.set(0, 0, 12);
    scene.add(camera);

    const ambient = new THREE.HemisphereLight(0xc5d4cf, 0x030506, 0.64);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xeaf1e8, 2.25);
    key.position.set(5, 7, 7);
    scene.add(key);

    const coldRim = new THREE.PointLight(0x8eaaa7, 12.5, 33, 2.1);
    coldRim.position.set(-4, 1, -8);
    scene.add(coldRim);

    const goldRim = new THREE.PointLight(0x92744c, 6.5, 26, 2.2);
    goldRim.position.set(4, -1.5, -27);
    scene.add(goldRim);

    const world = new THREE.Group();
    scene.add(world);

    const glowTexture = makeGlowTexture();
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const farStarCount = isMobile ? 420 : 920;
    const farPositions = new Float32Array(farStarCount * 3);
    for (let i = 0; i < farStarCount; i += 1) {
      const spread = 9 + Math.random() * 17;
      farPositions[i * 3] = (Math.random() - 0.5) * spread;
      farPositions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.72;
      farPositions[i * 3 + 2] = 16 - Math.random() * 78;
    }
    const farGeometry = new THREE.BufferGeometry();
    farGeometry.setAttribute("position", new THREE.BufferAttribute(farPositions, 3));
    const farMaterial = new THREE.PointsMaterial({
      color: 0x90aaa3,
      size: isMobile ? 0.014 : 0.019,
      transparent: true,
      opacity: 0.31,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const farStars = new THREE.Points(farGeometry, farMaterial);
    world.add(farStars);

    const nearCount = isMobile ? 90 : 220;
    const nearPositions = new Float32Array(nearCount * 3);
    for (let i = 0; i < nearCount; i += 1) {
      nearPositions[i * 3] = (Math.random() - 0.5) * 13;
      nearPositions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      nearPositions[i * 3 + 2] = 11 - Math.random() * 66;
    }
    const nearGeometry = new THREE.BufferGeometry();
    nearGeometry.setAttribute("position", new THREE.BufferAttribute(nearPositions, 3));
    const nearMaterial = new THREE.PointsMaterial({
      color: 0xdce9df,
      size: isMobile ? 0.026 : 0.041,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const nearDust = new THREE.Points(nearGeometry, nearMaterial);
    world.add(nearDust);

    const streakCount = isMobile ? 28 : 58;
    const streakPositions = new Float32Array(streakCount * 6);
    for (let i = 0; i < streakCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.3 + Math.random() * 5.5;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = 7 - Math.random() * 56;
      const o = i * 6;
      streakPositions[o] = x;
      streakPositions[o + 1] = y;
      streakPositions[o + 2] = z;
      streakPositions[o + 3] = x * 1.02;
      streakPositions[o + 4] = y * 1.02;
      streakPositions[o + 5] = z - (0.8 + Math.random() * 2.8);
    }
    const streakGeometry = new THREE.BufferGeometry();
    streakGeometry.setAttribute("position", new THREE.BufferAttribute(streakPositions, 3));
    const streakMaterial = new THREE.LineBasicMaterial({
      color: 0xdceae2,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const streaks = new THREE.LineSegments(streakGeometry, streakMaterial);
    world.add(streaks);

    const hatch = new THREE.Group();
    hatch.position.z = 3.2;
    world.add(hatch);

    const outerRingMaterial = new THREE.MeshStandardMaterial({
      color: 0x56615f,
      roughness: 0.31,
      metalness: 0.9,
    });
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(4.45, 0.18, 10, 96), outerRingMaterial);
    hatch.add(outerRing);

    const ringLayers: THREE.Mesh[] = [];
    [4.72, 4.16, 3.82].forEach((radius, index) => {
      const layer = new THREE.Mesh(
        new THREE.TorusGeometry(radius, index === 0 ? 0.045 : 0.024, 6, 96),
        new THREE.MeshBasicMaterial({
          color: index === 2 ? 0xb5966d : 0xb8c6c1,
          transparent: true,
          opacity: index === 2 ? 0.14 : 0.18,
          depthWrite: false,
        }),
      );
      layer.rotation.z = index * 0.18;
      hatch.add(layer);
      ringLayers.push(layer);
    });

    const innerGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xdde8df,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    const innerGlow = new THREE.Mesh(new THREE.TorusGeometry(3.65, 0.045, 6, 96), innerGlowMaterial);
    hatch.add(innerGlow);

    const hatchFlare = new THREE.Sprite(glowMaterial.clone());
    hatchFlare.scale.set(7.8, 7.8, 1);
    hatchFlare.position.z = -0.28;
    (hatchFlare.material as THREE.SpriteMaterial).opacity = 0.06;
    hatch.add(hatchFlare);

    const tickGeometry = new THREE.BoxGeometry(0.07, 0.48, 0.08);
    const tickMaterial = new THREE.MeshBasicMaterial({ color: 0xb9c5c0, transparent: true, opacity: 0.28 });
    const hatchTicks = new THREE.InstancedMesh(tickGeometry, tickMaterial, 24);
    const tickDummy = new THREE.Object3D();
    for (let i = 0; i < 24; i += 1) {
      const a = (i / 24) * Math.PI * 2;
      tickDummy.position.set(Math.cos(a) * 4.05, Math.sin(a) * 4.05, 0.03);
      tickDummy.rotation.set(0, 0, a);
      tickDummy.updateMatrix();
      hatchTicks.setMatrixAt(i, tickDummy.matrix);
    }
    hatchTicks.instanceMatrix.needsUpdate = true;
    hatch.add(hatchTicks);

    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0.18, -0.92);
    bladeShape.lineTo(4.05, -1.38);
    bladeShape.lineTo(4.05, 0.78);
    bladeShape.lineTo(0.18, 0.34);
    bladeShape.closePath();
    const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.12,
      bevelEnabled: false,
      steps: 1,
    });
    bladeGeometry.translate(0, 0, -0.06);

    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0x222a2a,
      roughness: 0.34,
      metalness: 0.9,
      side: THREE.DoubleSide,
    });
    const bladeEdgeMaterial = new THREE.LineBasicMaterial({
      color: 0xb7c5c0,
      transparent: true,
      opacity: 0.24,
    });
    const bladeEdges = new THREE.EdgesGeometry(bladeGeometry, 18);
    const blades: Array<{ group: THREE.Group; angle: number }> = [];
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const group = new THREE.Group();
      group.add(
        new THREE.Mesh(bladeGeometry, bladeMaterial),
        new THREE.LineSegments(bladeEdges, bladeEdgeMaterial),
      );
      group.rotation.z = angle;
      hatch.add(group);
      blades.push({ group, angle });
    }

    const hatchBeamMaterial = new THREE.MeshBasicMaterial({
      color: 0x9cbab5,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const hatchBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 3.8, 14, 24, 1, true),
      hatchBeamMaterial,
    );
    hatchBeam.rotation.x = Math.PI / 2;
    hatchBeam.position.z = -6.5;
    hatch.add(hatchBeam);

    const earlyRig = createEarlyCinematicRig(world, hatch, isMobile);

    const hall = new THREE.Group();
    world.add(hall);

    const floorGrid = new THREE.GridHelper(74, 48, 0x6f817d, 0x26302f);
    floorGrid.position.set(0, -3.1, -25);
    const floorMaterials = Array.isArray(floorGrid.material) ? floorGrid.material : [floorGrid.material];
    floorMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.15;
      material.depthWrite = false;
    });
    hall.add(floorGrid);

    const frameMaterial = new THREE.LineBasicMaterial({
      color: 0x8fa19c,
      transparent: true,
      opacity: 0.12,
    });
    const frameGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(10.8, 6.8, 0.08));
    const hallFrames: THREE.LineSegments[] = [];
    for (let i = 0; i < 9; i += 1) {
      const frame = new THREE.LineSegments(frameGeometry, frameMaterial);
      frame.position.set(Math.sin(i * 0.62) * 0.72, Math.cos(i * 0.47) * 0.22, -7.2 - i * 4.1);
      frame.rotation.z = Math.sin(i * 0.7) * 0.026;
      hall.add(frame);
      hallFrames.push(frame);
    }

    const monolithGeometry = new THREE.BoxGeometry(0.76, 7.6, 1.45);
    const monolithMaterial = new THREE.MeshStandardMaterial({
      color: 0x17201f,
      roughness: 0.68,
      metalness: 0.5,
    });
    const monoliths = new THREE.InstancedMesh(monolithGeometry, monolithMaterial, 12);
    const monoDummy = new THREE.Object3D();
    for (let i = 0; i < 6; i += 1) {
      [-1, 1].forEach((side, sideIndex) => {
        const index = i * 2 + sideIndex;
        monoDummy.position.set(side * (5.25 + (i % 2) * 0.55), Math.sin(i) * 0.3, -10.5 - i * 5.1);
        monoDummy.rotation.set(0, side * (0.09 + (i % 3) * 0.035), 0);
        monoDummy.updateMatrix();
        monoliths.setMatrixAt(index, monoDummy.matrix);
      });
    }
    monoliths.instanceMatrix.needsUpdate = true;
    hall.add(monoliths);

    const beamMaterial = new THREE.MeshBasicMaterial({
      color: 0x8da9a4,
      transparent: true,
      opacity: 0.025,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const hallBeams: THREE.Mesh[] = [];
    const beamGeometry = new THREE.ConeGeometry(3.2, 15, 18, 1, true);
    [[-4.2, 3.8, -13, 0.34], [4.5, 4.1, -25, -0.35], [-3.4, 3.6, -37, 0.25]].forEach((spec) => {
      const beam = new THREE.Mesh(beamGeometry, beamMaterial.clone());
      beam.position.set(spec[0], spec[1], spec[2]);
      beam.rotation.set(0.16, 0, spec[3]);
      hall.add(beam);
      hallBeams.push(beam);
    });

    const artifactGroup = new THREE.Group();
    world.add(artifactGroup);
    const artifactZ = [-25.5, -29.8, -34.1, -38.2];
    const artifactObjects: THREE.Group[] = [];
    const artifactLights: THREE.PointLight[] = [];
    const artifactGeometries: THREE.BufferGeometry[] = [
      new THREE.IcosahedronGeometry(1.12, 1),
      new THREE.TorusKnotGeometry(0.78, 0.22, 64, 8, 2, 3),
      new THREE.DodecahedronGeometry(1.08, 0),
      new THREE.OctahedronGeometry(1.2, 1),
    ];

    artifactZ.forEach((z, index) => {
      const g = new THREE.Group();
      const coreMaterial = new THREE.MeshPhysicalMaterial({
        color: index === 2 ? 0x8e7655 : 0x849894,
        roughness: 0.18,
        metalness: 0.78,
        clearcoat: 0.82,
        clearcoatRoughness: 0.16,
        transparent: true,
        opacity: 0.7,
      });
      const core = new THREE.Mesh(artifactGeometries[index], coreMaterial);
      g.add(core);

      const wire = new THREE.LineSegments(
        new THREE.EdgesGeometry(artifactGeometries[index], 18),
        new THREE.LineBasicMaterial({ color: 0xe3ebe4, transparent: true, opacity: 0.38 }),
      );
      wire.scale.setScalar(1.04);
      g.add(wire);

      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(1.8, 0.025, 6, 56),
        new THREE.MeshBasicMaterial({ color: 0xc8d5d0, transparent: true, opacity: 0.23 }),
      );
      halo.rotation.x = Math.PI / 2;
      g.add(halo);

      const flare = new THREE.Sprite(glowMaterial.clone());
      flare.position.set(0, 0, -0.6);
      flare.scale.set(3.2, 3.2, 1);
      (flare.material as THREE.SpriteMaterial).opacity = 0.07;
      g.add(flare);

      const light = new THREE.PointLight(index === 2 ? 0xb08b5d : 0x85b3aa, 1.2, 8.5, 2.1);
      light.position.set(0, 0.4, 0.6);
      g.add(light);
      artifactLights.push(light);

      g.position.set(index % 2 === 0 ? 2.45 : -2.35, index % 3 === 0 ? 0.55 : -0.25, z);
      g.rotation.z = index % 2 === 0 ? 0.08 : -0.08;
      artifactGroup.add(g);
      artifactObjects.push(g);
    });

    const starCount = isMobile ? 520 : 1180;
    const originalPositions = new Float32Array(starCount * 3);
    const portalTargets = new Float32Array(starCount * 3);
    const workingPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const radius = 3.1 + Math.random() * 9.5;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 2.2;
      const y = Math.sin(angle) * radius + (Math.random() - 0.5) * 2.2;
      const z = 10 - Math.random() * 66;
      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;
      workingPositions[i * 3] = x;
      workingPositions[i * 3 + 1] = y;
      workingPositions[i * 3 + 2] = z;

      const portalAngle = Math.random() * Math.PI * 2;
      const portalRadius = 2.5 + Math.random() * 1.0;
      portalTargets[i * 3] = Math.cos(portalAngle) * portalRadius + (Math.random() - 0.5) * 0.28;
      portalTargets[i * 3 + 1] = Math.sin(portalAngle) * portalRadius + (Math.random() - 0.5) * 0.28;
      portalTargets[i * 3 + 2] = -48 + (Math.random() - 0.5) * 1.3;
    }

    const starGeometry = new THREE.BufferGeometry();
    const starAttribute = new THREE.BufferAttribute(workingPositions, 3);
    starGeometry.setAttribute("position", starAttribute);
    const starMaterial = new THREE.PointsMaterial({
      color: 0xd9e7df,
      size: isMobile ? 0.019 : 0.028,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    world.add(stars);

    const gateway = new THREE.Group();
    const gatewayRings: THREE.Mesh[] = [];
    [3.55, 3.18, 2.9, 2.62].forEach((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, index === 0 ? 0.075 : 0.03, 8, 112),
        new THREE.MeshBasicMaterial({
          color: index === 2 ? 0xb49368 : 0xe4eee6,
          transparent: true,
          opacity: index === 0 ? 0.46 : 0.2,
          depthWrite: false,
        }),
      );
      ring.rotation.z = index * 0.34;
      gateway.add(ring);
      gatewayRings.push(ring);
    });

    const portalMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(PORTAL_SHADER.uniforms),
      vertexShader: PORTAL_SHADER.vertexShader,
      fragmentShader: PORTAL_SHADER.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const portalDisc = new THREE.Mesh(new THREE.CircleGeometry(2.58, 80), portalMaterial);
    portalDisc.position.z = 0.02;
    gateway.add(portalDisc);

    const gatewayFlare = new THREE.Sprite(glowMaterial.clone());
    gatewayFlare.scale.set(8.8, 8.8, 1);
    gatewayFlare.position.z = -0.1;
    (gatewayFlare.material as THREE.SpriteMaterial).opacity = 0;
    gateway.add(gatewayFlare);

    const gatewayShardGeometry = new THREE.BoxGeometry(0.08, 0.52, 0.08);
    const gatewayShardMaterial = new THREE.MeshBasicMaterial({
      color: 0xdfeae4,
      transparent: true,
      opacity: 0.42,
    });
    const gatewayShards = new THREE.InstancedMesh(gatewayShardGeometry, gatewayShardMaterial, 24);
    const shardDummy = new THREE.Object3D();
    for (let i = 0; i < 24; i += 1) {
      const angle = (i / 24) * Math.PI * 2;
      const radius = 3.9 + (i % 3) * 0.25;
      shardDummy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      shardDummy.rotation.set(0, 0, angle);
      shardDummy.updateMatrix();
      gatewayShards.setMatrixAt(i, shardDummy.matrix);
    }
    gatewayShards.instanceMatrix.needsUpdate = true;
    gateway.add(gatewayShards);
    gateway.position.z = -48;
    world.add(gateway);

    const cameraPath = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 0, 12),
        new THREE.Vector3(-0.2, 0.05, 7.5),
        new THREE.Vector3(0.12, 0.08, 3.65),
        new THREE.Vector3(0.42, 0.2, -4.8),
        new THREE.Vector3(1.55, 0.72, -12.3),
        new THREE.Vector3(-1.7, 0.12, -20.2),
        new THREE.Vector3(2.35, -0.35, -29.6),
        new THREE.Vector3(-1.8, 0.58, -38.2),
        new THREE.Vector3(0.15, 0.1, -46.2),
        new THREE.Vector3(0, 0, -47.25),
      ],
      false,
      "catmullrom",
      0.43,
    );

    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    let rgbPass: ShaderPass | null = null;
    if (!isMobile && !reducedMotion) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.25, 0.54, 0.7);
      composer.addPass(bloomPass);
      rgbPass = new ShaderPass(RGB_SHIFT_SHADER);
      composer.addPass(rgbPass);
    }

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = Math.max(0.1, width / Math.max(1, height));
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      composer?.setSize(width, height);
    };
    resize();

    let targetProgress = 0;
    let progress = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let mouseX = 0;
    let mouseY = 0;
    let raf = 0;
    let running = !document.hidden;
    const clock = new THREE.Clock();
    const cameraPoint = new THREE.Vector3();
    const lookPoint = new THREE.Vector3();

    const readScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      targetProgress = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    };

    const onPointerMove = (event: PointerEvent) => {
      targetMouseX = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      targetMouseY = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
    };

    const render = () => {
      if (!running) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const smoothing = reducedMotion ? 1 : 1 - Math.pow(0.0008, dt);
      progress += (targetProgress - progress) * smoothing;
      mouseX += (targetMouseX - mouseX) * Math.min(1, dt * 3.5);
      mouseY += (targetMouseY - mouseY) * Math.min(1, dt * 3.5);

      const hatchOpen = smoothstep(0.08, 0.225, progress);
      const hatchCross = pulse(progress, 0.235, 0.075);
      const logicPhase = smoothstep(0.28, 0.52, progress);
      const artifactPhase = smoothstep(0.47, 0.72, progress);
      const portalMorph = smoothstep(0.79, 0.975, progress);
      const portalPulse = pulse(progress, 0.91, 0.12);
      const hatchHold = smoothstep(0.135, 0.17, progress) * (1 - smoothstep(0.19, 0.225, progress));
      const logicFocus = smoothstep(0.32, 0.39, progress) * (1 - smoothstep(0.53, 0.63, progress));
      const scanPulse = pulse(progress, 0.445, 0.085) * logicFocus;
      const openingBias = pulse(progress, 0.085, 0.085);

      const pathProgress = clamp(
        progress + hatchCross * 0.019 - hatchHold * 0.007 - logicFocus * 0.012,
        0,
        1,
      );
      cameraPath.getPointAt(pathProgress, cameraPoint);
      cameraPath.getPointAt(Math.min(1, pathProgress + 0.035), lookPoint);
      camera.position.copy(cameraPoint);
      camera.position.x += openingBias * 0.16;
      camera.position.x += mouseX * 0.19 * (1 - portalMorph * 0.82);
      camera.position.y -= mouseY * 0.14 * (1 - portalMorph * 0.82);
      const directedLookX = lerp(lookPoint.x, -0.34, logicFocus * 0.42);
      const directedLookY = lerp(lookPoint.y, 0.08, logicFocus * 0.34);
      camera.lookAt(directedLookX, directedLookY, lookPoint.z - 1.25);
      camera.rotation.z += Math.sin(progress * Math.PI * 4.4) * 0.007 + hatchCross * 0.014 - logicFocus * 0.005;
      const targetFov = 48 - logicFocus * 2.7 + hatchCross * 13 + portalPulse * 5.5;
      if (Math.abs(camera.fov - targetFov) > 0.02) {
        camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 7);
        camera.updateProjectionMatrix();
      }

      const earlyExposure = 0.84 + hatchOpen * 0.025 + hatchCross * 0.1 + logicFocus * 0.045 + artifactPhase * 0.055;
      renderer.toneMappingExposure = lerp(earlyExposure, 0.94, smoothstep(0.7, 0.8, progress));

      const time = performance.now() * 0.001;
      earlyRig.update(progress, time);

      farStars.rotation.z = time * 0.0025;
      nearDust.rotation.z = -time * 0.0055;
      nearDust.position.x = mouseX * -0.12;
      nearDust.position.y = mouseY * 0.09;
      nearMaterial.opacity = 0.14 + logicPhase * 0.07 + portalMorph * 0.08;
      streakMaterial.opacity = hatchCross * 0.4 + portalPulse * 0.27;
      streaks.position.z = hatchCross * -1.8 + portalPulse * -1.1;

      blades.forEach(({ group, angle }, index) => {
        group.rotation.z = angle + hatchOpen * (0.43 + (index % 2) * 0.025);
        const radial = hatchOpen * 2.55;
        group.position.x = Math.cos(angle + 0.2) * radial;
        group.position.y = Math.sin(angle + 0.2) * radial;
      });
      outerRing.rotation.z = time * 0.025;
      hatchTicks.rotation.z = -time * 0.036;
      ringLayers.forEach((ring, index) => {
        ring.rotation.z += (index % 2 === 0 ? 1 : -1) * dt * (0.016 + index * 0.009);
        const material = ring.material as THREE.MeshBasicMaterial;
        material.opacity = 0.1 + hatchOpen * 0.1 + hatchCross * 0.12 + index * 0.018;
      });
      innerGlowMaterial.opacity = 0.08 + hatchOpen * 0.36 + hatchCross * 0.2;
      hatchBeamMaterial.opacity = hatchOpen * 0.045 + hatchCross * 0.1;
      hatchBeam.scale.setScalar(0.92 + hatchCross * 0.24);
      (hatchFlare.material as THREE.SpriteMaterial).opacity = 0.04 + hatchOpen * 0.08 + hatchCross * 0.32;
      hatchFlare.scale.setScalar(7.6 + hatchCross * 2.4);

      hallFrames.forEach((frame, index) => {
        frame.rotation.z += Math.sin(time * 0.18 + index) * dt * 0.0015;
      });
      hallBeams.forEach((beam, index) => {
        const material = beam.material as THREE.MeshBasicMaterial;
        material.opacity = 0.012 + Math.sin(time * 0.34 + index) * 0.005 + artifactPhase * 0.014;
      });

      artifactObjects.forEach((obj, index) => {
        obj.rotation.x = time * (0.075 + index * 0.014) + index * 0.7;
        obj.rotation.y = time * (0.12 + index * 0.018) - index * 0.34;
        const distance = Math.abs(camera.position.z - artifactZ[index]);
        const focus = Math.max(0, 1 - distance / 8.5);
        const scale = 0.78 + focus * 0.45;
        obj.scale.setScalar(scale);
        artifactLights[index].intensity = 0.35 + focus * 5.0;
      });

      if (portalMorph > 0.001) {
        for (let i = 0; i < starCount * 3; i += 1) {
          workingPositions[i] = lerp(originalPositions[i], portalTargets[i], portalMorph);
        }
        starAttribute.needsUpdate = true;
      }
      stars.rotation.z = time * (0.006 + portalMorph * 0.09);
      starMaterial.size = (isMobile ? 0.019 : 0.028) + portalMorph * 0.014;
      starMaterial.opacity = 0.42 + portalMorph * 0.32;

      gateway.rotation.z = time * (0.025 + portalMorph * 0.09);
      gateway.scale.setScalar(0.9 + portalMorph * 0.14 + portalPulse * 0.055);
      gatewayRings.forEach((ring, index) => {
        ring.rotation.z += (index % 2 === 0 ? 1 : -1) * dt * (0.018 + portalMorph * 0.075);
        const material = ring.material as THREE.MeshBasicMaterial;
        material.opacity = 0.12 + portalMorph * (index === 0 ? 0.72 : 0.38) + portalPulse * 0.16;
      });
      portalMaterial.uniforms.time.value = time;
      portalMaterial.uniforms.intensity.value = portalMorph * (0.6 + portalPulse * 0.85);
      (gatewayFlare.material as THREE.SpriteMaterial).opacity = portalMorph * 0.12 + portalPulse * 0.32;
      gatewayFlare.scale.setScalar(8.5 + portalPulse * 3.2);
      gatewayShards.rotation.z = -time * (0.04 + portalMorph * 0.12);
      gatewayShardMaterial.opacity = 0.14 + portalMorph * 0.42;

      if (bloomPass && rgbPass && composer) {
        bloomPass.strength = 0.16 + hatchCross * 0.92 + scanPulse * 0.24 + artifactPhase * 0.06 + portalPulse * 0.78;
        bloomPass.radius = 0.37 + hatchCross * 0.17 + scanPulse * 0.04 + portalPulse * 0.08;
        bloomPass.threshold = 0.69 - hatchCross * 0.18 - scanPulse * 0.045 - portalPulse * 0.12;
        rgbPass.uniforms.amount.value = 0.0002 + hatchCross * 0.0048 + scanPulse * 0.00065 + portalPulse * 0.003;
        rgbPass.uniforms.angle.value = time * 0.35;
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

      raf = requestAnimationFrame(render);
    };

    const onVisibility = () => {
      running = !document.hidden;
      if (running) {
        clock.getDelta();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(raf);
      }
    };

    readScroll();
    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);

      world.traverse((child) => {
        if (
          child instanceof THREE.Mesh ||
          child instanceof THREE.LineSegments ||
          child instanceof THREE.Points ||
          child instanceof THREE.Sprite ||
          child instanceof THREE.InstancedMesh
        ) {
          child.geometry?.dispose?.();
          const material = child.material as THREE.Material | THREE.Material[];
          const materials = Array.isArray(material) ? material : [material];
          materials.forEach((item) => {
            const map = (item as THREE.MeshBasicMaterial).map;
            map?.dispose();
            item.dispose();
          });
        }
      });
      glowTexture.dispose();
      composer?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="webgl-world" aria-hidden="true" />;
}
