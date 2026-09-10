"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (a: number, b: number, value: number) => {
  const t = clamp((value - a) / Math.max(0.0001, b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const pulse = (value: number, center: number, radius: number) => Math.max(0, 1 - Math.abs(value - center) / radius);

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  const gradient = ctx.createRadialGradient(96, 96, 0, 96, 96, 96);
  gradient.addColorStop(0, "rgba(239,249,240,.95)");
  gradient.addColorStop(0.12, "rgba(162,211,199,.58)");
  gradient.addColorStop(0.38, "rgba(105,166,153,.18)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 192, 192);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function SpecimenLayer() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 760px)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !isMobile,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      });
    } catch {
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 0.9 : 1.15));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 50);
    camera.position.set(0, 0, 8.2);
    scene.add(camera);

    scene.add(new THREE.HemisphereLight(0xbfd4cf, 0x020404, 1.05));
    const key = new THREE.DirectionalLight(0xf1f5ec, 4.2);
    key.position.set(4.5, 5, 6);
    scene.add(key);
    const cold = new THREE.PointLight(0x80b6aa, 20, 17, 2.1);
    cold.position.set(-3.5, 1.5, 4);
    scene.add(cold);
    const warm = new THREE.PointLight(0xb08a5b, 10, 14, 2.2);
    warm.position.set(3.2, -1.5, 2.5);
    scene.add(warm);

    const root = new THREE.Group();
    scene.add(root);

    const metalColor = new THREE.Color(0x43514e);
    const measureColor = new THREE.Color(0x83a29a);
    const launchColor = new THREE.Color(0xb18b5d);

    const coreGeometry = new THREE.IcosahedronGeometry(isMobile ? 1.15 : 1.42, isMobile ? 2 : 3);
    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: metalColor.clone(),
      roughness: 0.18,
      metalness: 0.82,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
      transparent: true,
      opacity: 0.78,
      emissive: new THREE.Color(0x182e2a),
      emissiveIntensity: 0.22,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    root.add(core);

    const wireMaterial = new THREE.LineBasicMaterial({
      color: 0xdcebe4,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coreWireGeometry = new THREE.EdgesGeometry(coreGeometry, 12);
    const coreWire = new THREE.LineSegments(coreWireGeometry, wireMaterial);
    coreWire.scale.setScalar(1.025);
    root.add(coreWire);

    const cageMaterials: THREE.MeshBasicMaterial[] = [];
    const cageRings: THREE.Mesh[] = [];
    [2.1, 2.45, 2.82].forEach((radius, index) => {
      const material = new THREE.MeshBasicMaterial({
        color: index === 2 ? 0xb08b60 : 0xbcd1ca,
        transparent: true,
        opacity: index === 2 ? 0.16 : 0.21,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, index === 0 ? 0.025 : 0.018, 8, 96), material);
      ring.rotation.set(Math.PI / 2 + index * 0.28, index * 0.46, index * 0.7);
      root.add(ring);
      cageMaterials.push(material);
      cageRings.push(ring);
    });

    const finCount = isMobile ? 10 : 18;
    const finGeometry = new THREE.BoxGeometry(0.09, 0.75, 0.14);
    const finMaterial = new THREE.MeshStandardMaterial({
      color: 0x53625e,
      metalness: 0.78,
      roughness: 0.28,
      transparent: true,
      opacity: 0.74,
    });
    const fins = new THREE.InstancedMesh(finGeometry, finMaterial, finCount);
    root.add(fins);
    const finDummy = new THREE.Object3D();

    let seed = 888;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const shardCount = isMobile ? 11 : 20;
    const shardGeometry = new THREE.TetrahedronGeometry(isMobile ? 0.26 : 0.34, 0);
    const shardMaterial = new THREE.MeshStandardMaterial({
      color: 0x6f837d,
      metalness: 0.72,
      roughness: 0.24,
      transparent: true,
      opacity: 0.72,
    });
    const shards = new THREE.InstancedMesh(shardGeometry, shardMaterial, shardCount);
    root.add(shards);
    const shardDummy = new THREE.Object3D();
    const shardTargets: THREE.Vector3[] = [];
    const shardExploded: THREE.Vector3[] = [];
    const shardRotations: THREE.Euler[] = [];
    const shardScales: number[] = [];
    for (let i = 0; i < shardCount; i += 1) {
      const phi = Math.acos(2 * rand() - 1);
      const theta = rand() * Math.PI * 2;
      const radius = 1.58 + rand() * 0.72;
      const target = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * radius,
        Math.cos(phi) * radius,
        Math.sin(phi) * Math.sin(theta) * radius,
      );
      shardTargets.push(target);
      shardExploded.push(target.clone().multiplyScalar(2.4 + rand() * 1.6).add(new THREE.Vector3((rand() - 0.5) * 1.2, (rand() - 0.5) * 1.1, (rand() - 0.5) * 2.2)));
      shardRotations.push(new THREE.Euler(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI));
      shardScales.push(0.65 + rand() * 0.8);
    }

    const pointCount = isMobile ? 180 : 430;
    const pointPositions = new Float32Array(pointCount * 3);
    for (let i = 0; i < pointCount; i += 1) {
      const phi = Math.acos(2 * rand() - 1);
      const theta = rand() * Math.PI * 2;
      const radius = 1.2 + rand() * 2.2;
      pointPositions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      pointPositions[i * 3 + 1] = Math.cos(phi) * radius;
      pointPositions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    }
    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));
    const pointMaterial = new THREE.PointsMaterial({
      color: 0xcfe5dc,
      size: isMobile ? 0.018 : 0.026,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dataCloud = new THREE.Points(pointGeometry, pointMaterial);
    root.add(dataCloud);

    const scanMaterials: THREE.MeshBasicMaterial[] = [];
    const scanRings: THREE.Mesh[] = [];
    [1.95, 2.5, 3.08].forEach((radius, index) => {
      const material = new THREE.MeshBasicMaterial({
        color: index === 1 ? 0xdcece5 : 0x75aa9f,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018 + index * 0.006, 6, 96), material);
      ring.rotation.x = Math.PI / 2;
      root.add(ring);
      scanMaterials.push(material);
      scanRings.push(ring);
    });

    const glowTexture = makeGlowTexture();
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.scale.set(5.5, 5.5, 1);
    glow.position.z = -0.7;
    root.add(glow);

    const trailCount = isMobile ? 26 : 54;
    const trailPositions = new Float32Array(trailCount * 6);
    for (let i = 0; i < trailCount; i += 1) {
      const theta = rand() * Math.PI * 2;
      const radius = 0.8 + rand() * 2.7;
      const x = Math.cos(theta) * radius;
      const y = Math.sin(theta) * radius;
      const z = (rand() - 0.5) * 2;
      const offset = i * 6;
      trailPositions[offset] = x;
      trailPositions[offset + 1] = y;
      trailPositions[offset + 2] = z;
      trailPositions[offset + 3] = x * 1.15;
      trailPositions[offset + 4] = y * 1.15;
      trailPositions[offset + 5] = z - (1.4 + rand() * 2.6);
    }
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
    const trailMaterial = new THREE.LineBasicMaterial({
      color: 0xe9d1ad,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const trails = new THREE.LineSegments(trailGeometry, trailMaterial);
    root.add(trails);

    let targetProgress = 0;
    let progress = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let mouseX = 0;
    let mouseY = 0;
    let raf = 0;
    let running = !document.hidden;
    let active = true;
    const clock = new THREE.Clock();

    const readScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      targetProgress = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      active = targetProgress < 0.78;
      mount.style.opacity = active ? "1" : "0";
    };

    const onPointerMove = (event: PointerEvent) => {
      targetMouseX = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      targetMouseY = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
    };

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = Math.max(0.1, width / Math.max(1, height));
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const render = () => {
      if (!running) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const smoothing = reducedMotion ? 1 : 1 - Math.pow(0.0008, dt);
      progress += (targetProgress - progress) * smoothing;
      mouseX += (targetMouseX - mouseX) * Math.min(1, dt * 3.5);
      mouseY += (targetMouseY - mouseY) * Math.min(1, dt * 3.5);

      if (!active && progress > 0.775) {
        raf = requestAnimationFrame(render);
        return;
      }

      const hatch = smoothstep(0.12, 0.28, progress);
      const hatchImpact = pulse(progress, 0.235, 0.085);
      const build = smoothstep(0.27, 0.43, progress);
      const measure = smoothstep(0.41, 0.56, progress);
      const ship = smoothstep(0.56, 0.72, progress);
      const fade = 1 - smoothstep(0.69, 0.765, progress);
      const origin = 1 - smoothstep(0.13, 0.3, progress);

      const time = performance.now() * 0.001;
      root.visible = fade > 0.002;
      root.position.x = lerp(isMobile ? 0.55 : 1.55, 0, hatch) + Math.sin(progress * Math.PI * 3.2) * 0.28 - ship * 0.45;
      root.position.y = 0.2 + Math.sin(time * 0.44) * 0.08 - measure * 0.18;
      root.position.z = -hatch * 0.35 - ship * 3.2;
      root.rotation.x = -0.08 + measure * 0.18 + Math.sin(time * 0.22) * 0.035;
      root.rotation.y = time * (0.11 + build * 0.16) + hatch * 0.35;
      root.rotation.z = -0.1 + Math.sin(time * 0.31) * 0.05 + ship * 0.26;
      const rootScale = (isMobile ? 0.82 : 1) * (1.06 + origin * 0.18 + hatchImpact * 0.1 - ship * 0.2);
      root.scale.setScalar(rootScale * fade);

      camera.position.x = mouseX * 0.18;
      camera.position.y = -mouseY * 0.13;
      camera.lookAt(mouseX * -0.05, mouseY * 0.04, 0);

      core.rotation.x = time * 0.11 + build * 0.6;
      core.rotation.y = -time * 0.16 + measure * 0.9;
      coreMaterial.color.copy(metalColor).lerp(measureColor, measure).lerp(launchColor, ship * 0.55);
      coreMaterial.opacity = (0.82 - measure * 0.46 + ship * 0.2) * fade;
      coreMaterial.metalness = 0.84 - measure * 0.54;
      coreMaterial.roughness = 0.18 + measure * 0.17;
      coreMaterial.emissiveIntensity = 0.18 + hatchImpact * 0.48 + measure * 0.34 + ship * 0.6;
      wireMaterial.opacity = (0.12 + measure * 0.72 + ship * 0.12) * fade;
      coreWire.rotation.copy(core.rotation);

      cageRings.forEach((ring, index) => {
        ring.rotation.z += (index % 2 === 0 ? 1 : -1) * dt * (0.14 + hatch * 0.55 + ship * 1.15);
        ring.rotation.y += dt * (0.05 + index * 0.02);
        const openScale = 1 + hatch * (0.08 + index * 0.08) + ship * (0.22 + index * 0.1);
        ring.scale.setScalar(openScale);
        cageMaterials[index].opacity = (0.18 + hatchImpact * 0.26 - measure * 0.05 + ship * 0.12) * fade;
      });

      for (let i = 0; i < finCount; i += 1) {
        const angle = (i / finCount) * Math.PI * 2 + time * 0.045;
        const radius = 3.05 + hatch * 0.42 + ship * 1.3;
        finDummy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, Math.sin(angle * 2) * 0.22);
        finDummy.rotation.set(0, 0, angle);
        finDummy.scale.set(1, 0.7 + hatch * 0.55, 1);
        finDummy.updateMatrix();
        fins.setMatrixAt(i, finDummy.matrix);
      }
      fins.instanceMatrix.needsUpdate = true;
      finMaterial.opacity = (0.54 + hatchImpact * 0.32 - measure * 0.18) * fade;

      for (let i = 0; i < shardCount; i += 1) {
        const target = shardTargets[i];
        const exploded = shardExploded[i];
        const assemble = build;
        const shipFactor = ship * (1.5 + (i % 4) * 0.18);
        shardDummy.position.set(
          lerp(exploded.x, target.x, assemble) + target.x * shipFactor,
          lerp(exploded.y, target.y, assemble) + target.y * shipFactor,
          lerp(exploded.z, target.z, assemble) + target.z * shipFactor - ship * (1.2 + (i % 3) * 0.55),
        );
        const baseRotation = shardRotations[i];
        shardDummy.rotation.set(
          baseRotation.x + time * 0.08 + ship * i * 0.12,
          baseRotation.y - time * 0.06 + build * 0.8,
          baseRotation.z + time * 0.04 + ship * 0.5,
        );
        const scale = shardScales[i] * (0.72 + assemble * 0.34) * (1 - ship * 0.2);
        shardDummy.scale.setScalar(scale);
        shardDummy.updateMatrix();
        shards.setMatrixAt(i, shardDummy.matrix);
      }
      shards.instanceMatrix.needsUpdate = true;
      shardMaterial.opacity = (0.28 + build * 0.52 - measure * 0.2 + ship * 0.15) * fade;
      shardMaterial.color.copy(measureColor).lerp(launchColor, ship * 0.7);

      dataCloud.rotation.y = -time * 0.08;
      dataCloud.rotation.z = time * 0.05;
      pointMaterial.opacity = pulse(measure, 0.55, 0.55) * 0.62 * (1 - ship * 0.7) * fade;
      pointMaterial.size = (isMobile ? 0.018 : 0.026) + measure * 0.012;

      scanRings.forEach((ring, index) => {
        const phase = clamp(measure * 1.28 - index * 0.12, 0, 1);
        ring.position.y = lerp(3.3, -3.3, phase);
        ring.rotation.z = time * (index % 2 === 0 ? 0.16 : -0.12);
        ring.scale.setScalar(0.92 + Math.sin(time * 0.9 + index) * 0.035);
        scanMaterials[index].opacity = pulse(phase, 0.5, 0.5) * 0.62 * (1 - ship) * fade;
      });

      glowMaterial.opacity = (0.08 + hatchImpact * 0.36 + measure * 0.22 + ship * 0.38) * fade;
      glow.scale.setScalar(5 + hatchImpact * 2.5 + measure * 1.2 + ship * 2.8);
      trailMaterial.opacity = ship * 0.48 * fade;
      trails.scale.z = 1 + ship * 2.8;
      trails.position.z = -ship * 0.8;

      cold.intensity = 12 + hatchImpact * 19 + measure * 12;
      warm.intensity = 6 + ship * 30;

      renderer.render(scene, camera);
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

    resize();
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

      coreGeometry.dispose();
      coreMaterial.dispose();
      coreWireGeometry.dispose();
      wireMaterial.dispose();
      cageRings.forEach((ring) => ring.geometry.dispose());
      cageMaterials.forEach((material) => material.dispose());
      finGeometry.dispose();
      finMaterial.dispose();
      shardGeometry.dispose();
      shardMaterial.dispose();
      pointGeometry.dispose();
      pointMaterial.dispose();
      scanRings.forEach((ring) => ring.geometry.dispose());
      scanMaterials.forEach((material) => material.dispose());
      glowTexture.dispose();
      glowMaterial.dispose();
      trailGeometry.dispose();
      trailMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        overflow: "hidden",
        opacity: 1,
        transition: "opacity 180ms linear",
      }}
    />
  );
}
