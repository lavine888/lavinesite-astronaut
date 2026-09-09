"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

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

function makeLabelTexture(title: string, detail: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(238,244,238,.94)";
  ctx.font = "700 112px Arial, sans-serif";
  ctx.letterSpacing = "-4px";
  ctx.fillText(title, 20, 126);
  ctx.fillStyle = "rgba(210,224,216,.54)";
  ctx.font = "28px monospace";
  ctx.letterSpacing = "2px";
  ctx.fillText(detail.toUpperCase(), 24, 190);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function makeLabelPlane(title: string, detail: string, width = 5.8, height = 1.45) {
  const texture = makeLabelTexture(title, detail);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.76,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.userData.texture = texture;
  return mesh;
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.4));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010203);
    scene.fog = new THREE.FogExp2(0x020405, 0.027);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 130);
    camera.position.set(0, 0, 12);
    scene.add(camera);

    const ambient = new THREE.HemisphereLight(0xc5d4cf, 0x030506, 0.88);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xeaf1e8, 2.4);
    key.position.set(5, 7, 7);
    scene.add(key);

    const coldRim = new THREE.PointLight(0x8eaaa7, 16, 30, 2.1);
    coldRim.position.set(-4, 1, -8);
    scene.add(coldRim);

    const goldRim = new THREE.PointLight(0x92744c, 7, 22, 2.2);
    goldRim.position.set(4, -1.5, -27);
    scene.add(goldRim);

    const world = new THREE.Group();
    scene.add(world);

    // --- 01 / THE HATCH ------------------------------------------------------
    const hatch = new THREE.Group();
    hatch.position.z = 3.2;
    world.add(hatch);

    const outerRingMaterial = new THREE.MeshStandardMaterial({
      color: 0x56615f,
      roughness: 0.34,
      metalness: 0.88,
    });
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(4.45, 0.18, 12, 120), outerRingMaterial);
    hatch.add(outerRing);

    const innerGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xdde8df,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    const innerGlow = new THREE.Mesh(new THREE.TorusGeometry(3.65, 0.045, 8, 120), innerGlowMaterial);
    hatch.add(innerGlow);

    const hatchTicks = new THREE.Group();
    const tickGeometry = new THREE.BoxGeometry(0.07, 0.48, 0.08);
    const tickMaterial = new THREE.MeshBasicMaterial({ color: 0xb9c5c0, transparent: true, opacity: 0.28 });
    for (let i = 0; i < 24; i += 1) {
      const tick = new THREE.Mesh(tickGeometry, tickMaterial);
      const a = (i / 24) * Math.PI * 2;
      tick.position.set(Math.cos(a) * 4.05, Math.sin(a) * 4.05, 0.03);
      tick.rotation.z = a;
      hatchTicks.add(tick);
    }
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
      roughness: 0.36,
      metalness: 0.88,
      side: THREE.DoubleSide,
    });
    const bladeEdgeMaterial = new THREE.LineBasicMaterial({
      color: 0xaebbb7,
      transparent: true,
      opacity: 0.22,
    });
    const bladeEdges = new THREE.EdgesGeometry(bladeGeometry, 18);
    const blades: Array<{ group: THREE.Group; angle: number }> = [];

    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(bladeGeometry, bladeMaterial);
      const edge = new THREE.LineSegments(bladeEdges, bladeEdgeMaterial);
      group.add(mesh, edge);
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
      new THREE.CylinderGeometry(0.55, 3.6, 13, 32, 1, true),
      hatchBeamMaterial,
    );
    hatchBeam.rotation.x = Math.PI / 2;
    hatchBeam.position.z = -6.2;
    hatch.add(hatchBeam);

    // --- 02 / ARCHIVE HALL ---------------------------------------------------
    const hall = new THREE.Group();
    world.add(hall);

    const floorGrid = new THREE.GridHelper(70, 56, 0x6f817d, 0x26302f);
    floorGrid.position.set(0, -3.1, -25);
    const floorMaterials = Array.isArray(floorGrid.material) ? floorGrid.material : [floorGrid.material];
    floorMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.2;
      material.depthWrite = false;
    });
    hall.add(floorGrid);

    const frameMaterial = new THREE.LineBasicMaterial({
      color: 0x8fa19c,
      transparent: true,
      opacity: 0.15,
    });
    const frameGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(10.5, 6.5, 0.08));
    for (let i = 0; i < 11; i += 1) {
      const frame = new THREE.LineSegments(frameGeometry, frameMaterial);
      frame.position.set(Math.sin(i * 0.62) * 0.7, Math.cos(i * 0.47) * 0.22, -7 - i * 3.7);
      frame.rotation.z = Math.sin(i * 0.7) * 0.025;
      hall.add(frame);
    }

    const identityLabels = [
      { title: "BUILD", detail: "turn ambiguity into a working system", position: [2.4, 0.85, -12.5] },
      { title: "MEASURE", detail: "replace confidence with evidence", position: [-2.15, -0.25, -17.2] },
      { title: "SHIP", detail: "keep the loop moving in reality", position: [2.05, 0.15, -21.7] },
    ] as const;
    const labelPlanes: THREE.Mesh[] = [];
    identityLabels.forEach((item, index) => {
      const label = makeLabelPlane(item.title, item.detail, 5.7, 1.42);
      label.position.set(...item.position);
      label.rotation.y = index % 2 === 0 ? -0.24 : 0.24;
      hall.add(label);
      labelPlanes.push(label);
    });

    // Low-cost volumetric atmosphere: translucent light cones, not postprocessed fog volumes.
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: 0x8da9a4,
      transparent: true,
      opacity: 0.035,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const beamGeometry = new THREE.ConeGeometry(3.2, 15, 24, 1, true);
    const hallBeams: THREE.Mesh[] = [];
    [
      [-4.2, 3.8, -13, 0.34],
      [4.5, 4.1, -24, -0.35],
      [-3.4, 3.6, -35, 0.25],
    ].forEach(([x, y, z, rz]) => {
      const beam = new THREE.Mesh(beamGeometry, beamMaterial.clone());
      beam.position.set(x, y, z);
      beam.rotation.z = rz;
      beam.rotation.x = 0.16;
      hall.add(beam);
      hallBeams.push(beam);
    });

    // --- 03 / ARTIFACTS ------------------------------------------------------
    const artifactGroup = new THREE.Group();
    world.add(artifactGroup);
    const artifactZ = [-25.5, -29.8, -34.1, -38.2];
    const artifactObjects: THREE.Group[] = [];
    const artifactGeometries: THREE.BufferGeometry[] = [
      new THREE.IcosahedronGeometry(1.12, 2),
      new THREE.TorusKnotGeometry(0.78, 0.22, 84, 10, 2, 3),
      new THREE.DodecahedronGeometry(1.08, 1),
      new THREE.OctahedronGeometry(1.2, 2),
    ];

    artifactZ.forEach((z, index) => {
      const g = new THREE.Group();
      const coreMaterial = new THREE.MeshPhysicalMaterial({
        color: index === 2 ? 0x8e7655 : 0x849894,
        roughness: 0.2,
        metalness: 0.76,
        clearcoat: 0.7,
        clearcoatRoughness: 0.18,
        transparent: true,
        opacity: 0.68,
      });
      const core = new THREE.Mesh(artifactGeometries[index], coreMaterial);
      g.add(core);

      const wire = new THREE.LineSegments(
        new THREE.EdgesGeometry(artifactGeometries[index], 18),
        new THREE.LineBasicMaterial({ color: 0xe3ebe4, transparent: true, opacity: 0.38 }),
      );
      wire.scale.setScalar(1.04);
      g.add(wire);

      const haloA = new THREE.Mesh(
        new THREE.TorusGeometry(1.8, 0.025, 6, 72),
        new THREE.MeshBasicMaterial({ color: 0xc8d5d0, transparent: true, opacity: 0.25 }),
      );
      haloA.rotation.x = Math.PI / 2;
      g.add(haloA);

      const haloB = haloA.clone();
      haloB.rotation.set(Math.PI / 2, 0.7, 0.3);
      haloB.scale.setScalar(0.77);
      g.add(haloB);

      const label = makeLabelPlane(`A-0${index + 1}`, ["HUMAN AI", "AI COLLAB", "SIGNALS", "AI NETWORK"][index], 2.7, 0.66);
      label.position.set(0, -2.15, 0.2);
      label.material = (label.material as THREE.MeshBasicMaterial).clone();
      (label.material as THREE.MeshBasicMaterial).opacity = 0.45;
      g.add(label);

      g.position.set(index % 2 === 0 ? 2.45 : -2.35, index % 3 === 0 ? 0.55 : -0.25, z);
      g.rotation.z = index % 2 === 0 ? 0.08 : -0.08;
      artifactGroup.add(g);
      artifactObjects.push(g);
    });

    // --- 04 / PARTICLES + GATEWAY -------------------------------------------
    const starCount = isMobile ? 560 : 1250;
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
      size: isMobile ? 0.018 : 0.026,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    world.add(stars);

    const gateway = new THREE.Group();
    const gatewayRings: THREE.Mesh[] = [];
    [3.35, 2.95, 2.55].forEach((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, index === 0 ? 0.075 : 0.035, 8, 128),
        new THREE.MeshBasicMaterial({
          color: index === 1 ? 0xb49368 : 0xe4eee6,
          transparent: true,
          opacity: index === 0 ? 0.5 : 0.22,
          depthWrite: false,
        }),
      );
      ring.rotation.z = index * 0.34;
      gateway.add(ring);
      gatewayRings.push(ring);
    });
    const gatewayDisc = new THREE.Mesh(
      new THREE.CircleGeometry(2.42, 96),
      new THREE.MeshBasicMaterial({
        color: 0x78938d,
        transparent: true,
        opacity: 0.035,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    gateway.add(gatewayDisc);
    gateway.position.z = -48;
    world.add(gateway);

    // Camera is one continuous shot, but its path deliberately changes direction.
    const cameraPath = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 0, 12),
        new THREE.Vector3(0.05, 0.05, 7.1),
        new THREE.Vector3(0.12, 0.08, 3.65),
        new THREE.Vector3(0.35, 0.18, -4.5),
        new THREE.Vector3(1.35, 0.65, -12.2),
        new THREE.Vector3(-1.65, 0.15, -20.5),
        new THREE.Vector3(2.05, -0.3, -29.8),
        new THREE.Vector3(-1.5, 0.48, -38.5),
        new THREE.Vector3(0, 0, -47.2),
      ],
      false,
      "catmullrom",
      0.45,
    );

    // Desktop-only lightweight post stack. Mobile stays on the direct renderer.
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    let rgbPass: ShaderPass | null = null;
    if (!isMobile && !reducedMotion) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.25, 0.55, 0.72);
      composer.addPass(bloomPass);
      rgbPass = new ShaderPass(RGB_SHIFT_SHADER);
      composer.addPass(rgbPass);
    }

    let width = 0;
    let height = 0;
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
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
      const artifactPhase = smoothstep(0.47, 0.72, progress);
      const portalMorph = smoothstep(0.79, 0.975, progress);
      const portalPulse = pulse(progress, 0.91, 0.12);

      const pathProgress = clamp(progress + hatchCross * 0.018, 0, 1);
      cameraPath.getPointAt(pathProgress, cameraPoint);
      cameraPath.getPointAt(Math.min(1, pathProgress + 0.035), lookPoint);
      camera.position.copy(cameraPoint);
      camera.position.x += mouseX * 0.2 * (1 - portalMorph * 0.8);
      camera.position.y -= mouseY * 0.15 * (1 - portalMorph * 0.8);
      camera.lookAt(lookPoint.x, lookPoint.y, lookPoint.z - 1.2);
      camera.rotation.z += Math.sin(progress * Math.PI * 4.2) * 0.009 + hatchCross * 0.012;
      const targetFov = 48 + hatchCross * 12 + portalPulse * 4;
      if (Math.abs(camera.fov - targetFov) > 0.02) {
        camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 7);
        camera.updateProjectionMatrix();
      }

      const time = performance.now() * 0.001;
      blades.forEach(({ group, angle }, index) => {
        group.rotation.z = angle + hatchOpen * (0.43 + (index % 2) * 0.025);
        const radial = hatchOpen * 2.55;
        group.position.x = Math.cos(angle + 0.2) * radial;
        group.position.y = Math.sin(angle + 0.2) * radial;
      });
      outerRing.rotation.z = time * 0.025;
      hatchTicks.rotation.z = -time * 0.035;
      innerGlowMaterial.opacity = 0.08 + hatchOpen * 0.36 + hatchCross * 0.18;
      hatchBeamMaterial.opacity = hatchOpen * 0.045 + hatchCross * 0.085;
      hatchBeam.scale.setScalar(0.92 + hatchCross * 0.2);

      labelPlanes.forEach((label, index) => {
        label.rotation.y += Math.sin(time * 0.3 + index) * dt * 0.004;
        const material = label.material as THREE.MeshBasicMaterial;
        material.opacity = 0.35 + Math.max(0, 1 - Math.abs(camera.position.z - label.position.z) / 9) * 0.5;
      });
      hallBeams.forEach((beam, index) => {
        const material = beam.material as THREE.MeshBasicMaterial;
        material.opacity = 0.018 + Math.sin(time * 0.34 + index) * 0.006 + artifactPhase * 0.012;
      });

      artifactObjects.forEach((obj, index) => {
        obj.rotation.x = time * (0.075 + index * 0.014) + index * 0.7;
        obj.rotation.y = time * (0.12 + index * 0.018) - index * 0.34;
        const distance = Math.abs(camera.position.z - artifactZ[index]);
        const focus = Math.max(0, 1 - distance / 8.5);
        const scale = 0.78 + focus * 0.43;
        obj.scale.setScalar(scale);
        obj.position.x += Math.sin(time * 0.25 + index) * dt * 0.012;
      });

      if (portalMorph > 0.001) {
        for (let i = 0; i < starCount * 3; i += 1) {
          workingPositions[i] = lerp(originalPositions[i], portalTargets[i], portalMorph);
        }
        starAttribute.needsUpdate = true;
      }
      stars.rotation.z = time * (0.006 + portalMorph * 0.08);
      starMaterial.size = (isMobile ? 0.018 : 0.026) + portalMorph * 0.012;
      starMaterial.opacity = 0.4 + portalMorph * 0.28;

      gateway.rotation.z = time * (0.025 + portalMorph * 0.08);
      gateway.scale.setScalar(0.92 + portalMorph * 0.12 + portalPulse * 0.035);
      gatewayRings.forEach((ring, index) => {
        ring.rotation.z += (index % 2 === 0 ? 1 : -1) * dt * (0.018 + portalMorph * 0.06);
        const material = ring.material as THREE.MeshBasicMaterial;
        material.opacity = 0.16 + portalMorph * (index === 0 ? 0.65 : 0.34) + portalPulse * 0.12;
      });
      (gatewayDisc.material as THREE.MeshBasicMaterial).opacity = 0.02 + portalMorph * 0.1 + portalPulse * 0.04;

      if (bloomPass && rgbPass && composer) {
        bloomPass.strength = 0.18 + hatchCross * 0.95 + portalPulse * 0.65;
        bloomPass.radius = 0.38 + hatchCross * 0.2;
        bloomPass.threshold = 0.68 - hatchCross * 0.18 - portalPulse * 0.1;
        rgbPass.uniforms.amount.value = 0.0003 + hatchCross * 0.005 + portalPulse * 0.0024;
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

      const disposeObject = (object: THREE.Object3D) => {
        object.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments || child instanceof THREE.Points) {
            child.geometry?.dispose();
            const material = child.material as THREE.Material | THREE.Material[];
            const materials = Array.isArray(material) ? material : [material];
            materials.forEach((item) => {
              const map = (item as THREE.MeshBasicMaterial).map;
              map?.dispose();
              item.dispose();
            });
          }
        });
      };
      disposeObject(world);
      tickGeometry.dispose();
      bladeEdges.dispose();
      frameGeometry.dispose();
      beamGeometry.dispose();
      artifactGeometries.forEach((geometry) => geometry.dispose());
      composer?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="webgl-world" aria-hidden="true" />;
}
