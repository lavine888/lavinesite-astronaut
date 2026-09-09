"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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

    renderer.setClearColor(0x020304, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.45));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020304, 0.035);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
    camera.position.set(0, 0, 12);
    scene.add(camera);

    const ambient = new THREE.HemisphereLight(0xcbd7d3, 0x050709, 1.15);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xeef4e4, 2.2);
    key.position.set(5, 6, 6);
    scene.add(key);

    const rim = new THREE.PointLight(0x93aeb0, 13, 24, 2.2);
    rim.position.set(-4, 1, -4);
    scene.add(rim);

    const world = new THREE.Group();
    scene.add(world);

    // Tunnel / hatch language: low-cost geometry, many coherent frames.
    const ringGeometry = new THREE.TorusGeometry(4.25, 0.055, 8, 96);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xb7c4c1,
      transparent: true,
      opacity: 0.19,
      depthWrite: false,
    });
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 18; i += 1) {
      const ring = new THREE.Mesh(ringGeometry, ringMaterial.clone());
      ring.position.z = 5 - i * 2.85;
      ring.rotation.z = (i % 2 ? 1 : -1) * 0.035 * i;
      const s = 1 + Math.sin(i * 0.82) * 0.035;
      ring.scale.setScalar(s);
      world.add(ring);
      rings.push(ring);
    }

    // Radial hatch ribs using a single instanced mesh.
    const ribGeometry = new THREE.BoxGeometry(0.1, 0.62, 0.11);
    const ribMaterial = new THREE.MeshStandardMaterial({
      color: 0x6e7977,
      roughness: 0.46,
      metalness: 0.78,
      transparent: true,
      opacity: 0.38,
    });
    const ribCount = 18 * 12;
    const ribs = new THREE.InstancedMesh(ribGeometry, ribMaterial, ribCount);
    const dummy = new THREE.Object3D();
    let ribIndex = 0;
    for (let r = 0; r < 18; r += 1) {
      const z = 5 - r * 2.85;
      for (let j = 0; j < 12; j += 1) {
        const a = (j / 12) * Math.PI * 2;
        dummy.position.set(Math.cos(a) * 4.25, Math.sin(a) * 4.25, z);
        dummy.rotation.set(0, 0, a - Math.PI / 2);
        dummy.updateMatrix();
        ribs.setMatrixAt(ribIndex, dummy.matrix);
        ribIndex += 1;
      }
    }
    ribs.instanceMatrix.needsUpdate = true;
    world.add(ribs);

    // Fine stars / dust in one draw call.
    const starCount = isMobile ? 520 : 1150;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const radius = 3.2 + Math.random() * 10;
      const angle = Math.random() * Math.PI * 2;
      starPositions[i * 3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 3;
      starPositions[i * 3 + 1] = Math.sin(angle) * radius + (Math.random() - 0.5) * 3;
      starPositions[i * 3 + 2] = 10 - Math.random() * 68;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xdce7df,
      size: isMobile ? 0.016 : 0.022,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    world.add(stars);

    // Four project artifacts. Abstract enough to stay ours, but staged as actual objects.
    const artifactGroup = new THREE.Group();
    world.add(artifactGroup);
    const artifactZ = [-12, -21, -30, -39];
    const artifactObjects: THREE.Group[] = [];

    artifactZ.forEach((z, index) => {
      const g = new THREE.Group();
      const coreGeometry = index % 2 === 0
        ? new THREE.IcosahedronGeometry(1.15, 1)
        : new THREE.OctahedronGeometry(1.25, 1);
      const coreMaterial = new THREE.MeshStandardMaterial({
        color: index % 2 === 0 ? 0x9fb2ae : 0x71817f,
        roughness: 0.18,
        metalness: 0.72,
        transparent: true,
        opacity: 0.55,
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      g.add(core);

      const wire = new THREE.LineSegments(
        new THREE.EdgesGeometry(coreGeometry),
        new THREE.LineBasicMaterial({ color: 0xe6ece4, transparent: true, opacity: 0.45 }),
      );
      wire.scale.setScalar(1.035);
      g.add(wire);

      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(1.85, 0.025, 6, 72),
        new THREE.MeshBasicMaterial({ color: 0xc8d2cf, transparent: true, opacity: 0.24 }),
      );
      halo.rotation.x = Math.PI / 2;
      g.add(halo);

      g.position.set(index % 2 === 0 ? 1.6 : -1.65, index % 3 === 0 ? 0.55 : -0.35, z);
      artifactGroup.add(g);
      artifactObjects.push(g);
    });

    // Far portal acts as the archive gateway.
    const gateway = new THREE.Group();
    const gatewayRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.3, 0.085, 10, 120),
      new THREE.MeshBasicMaterial({ color: 0xe6eee4, transparent: true, opacity: 0.72 }),
    );
    gateway.add(gatewayRing);
    const gatewayInner = new THREE.Mesh(
      new THREE.RingGeometry(2.45, 3.05, 96),
      new THREE.MeshBasicMaterial({
        color: 0x879998,
        transparent: true,
        opacity: 0.075,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    gateway.add(gatewayInner);
    gateway.position.z = -48;
    world.add(gateway);

    let width = 0;
    let height = 0;
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = Math.max(0.1, width / Math.max(1, height));
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
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
      mouseX += (targetMouseX - mouseX) * Math.min(1, dt * 3.8);
      mouseY += (targetMouseY - mouseY) * Math.min(1, dt * 3.8);

      const travel = 60;
      const z = lerp(12, -48, progress);
      camera.position.z = z;
      camera.position.x = Math.sin(progress * Math.PI * 2.15) * 0.52 + mouseX * 0.26;
      camera.position.y = Math.cos(progress * Math.PI * 1.45) * 0.23 - mouseY * 0.2;
      camera.rotation.z = Math.sin(progress * Math.PI * 3) * 0.012;
      camera.lookAt(camera.position.x * 0.15, camera.position.y * 0.12, z - 8.5);

      const time = performance.now() * 0.001;
      rings.forEach((ring, i) => {
        ring.rotation.z += (i % 2 === 0 ? 1 : -1) * dt * 0.025;
        const distance = Math.abs(camera.position.z - ring.position.z);
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.07 + Math.max(0, 1 - distance / 11) * 0.28;
      });

      stars.rotation.z = time * 0.006;
      stars.position.z = progress * travel * 0.05;

      artifactObjects.forEach((obj, i) => {
        obj.rotation.x = time * (0.09 + i * 0.018) + i;
        obj.rotation.y = time * (0.14 + i * 0.02) - i * 0.4;
        const distance = Math.abs(camera.position.z - artifactZ[i]);
        const scale = 0.82 + Math.max(0, 1 - distance / 8) * 0.38;
        obj.scale.setScalar(scale);
      });

      gateway.rotation.z = time * 0.035;
      const gatewayDistance = Math.abs(camera.position.z + 48);
      (gatewayRing.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.max(0, 1 - gatewayDistance / 12) * 0.55;

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

      ringGeometry.dispose();
      ribGeometry.dispose();
      ribMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      artifactObjects.forEach((g) => {
        g.traverse((obj) => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
            obj.geometry?.dispose();
            const material = obj.material;
            if (Array.isArray(material)) material.forEach((m) => m.dispose());
            else material?.dispose();
          }
        });
      });
      gateway.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const material = obj.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material.dispose();
        }
      });
      rings.forEach((ring) => (ring.material as THREE.Material).dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="webgl-world" aria-hidden="true" />;
}
