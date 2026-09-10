import * as THREE from "three";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const smoothstep = (a: number, b: number, value: number) => {
  const t = clamp((value - a) / Math.max(0.0001, b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function createEarlyCinematicRig(world: THREE.Group, hatch: THREE.Group, isMobile: boolean) {
  // 00 — A single monumental foreground structure. It is deliberately sparse:
  // a few large shapes create stronger depth than dozens of HUD decorations.
  const sweep = new THREE.Group();
  world.add(sweep);

  const sweepMetal = new THREE.MeshStandardMaterial({
    color: 0x151d1c,
    roughness: 0.3,
    metalness: 0.92,
  });
  const sweepEdge = new THREE.MeshBasicMaterial({
    color: 0xa7bbb5,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });

  const sweepArcs: THREE.Mesh[] = [];
  [7.4, 6.65, 5.9].forEach((radius, index) => {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(radius, index === 0 ? 0.24 : 0.09, 8, 80, Math.PI * (0.52 + index * 0.07)),
      index === 0 ? sweepMetal : sweepEdge,
    );
    arc.rotation.set(0.18 + index * 0.07, 0.52 - index * 0.16, -1.72 + index * 0.5);
    sweep.add(arc);
    sweepArcs.push(arc);
  });

  const beamGeometry = new THREE.BoxGeometry(8.6, 0.32, 0.62);
  const beamA = new THREE.Mesh(beamGeometry, sweepMetal);
  beamA.position.set(-1.4, 3.55, -0.5);
  beamA.rotation.z = -0.18;
  sweep.add(beamA);
  const beamB = beamA.clone();
  beamB.position.set(2.1, -3.2, -1.05);
  beamB.rotation.z = 0.24;
  sweep.add(beamB);
  sweep.position.set(-4.8, 0.4, 7.3);
  sweep.rotation.set(0.08, -0.18, -0.05);

  // 01 — Sequential mechanical latches sit on the existing hatch, so the
  // unlock event belongs to the same physical object instead of a UI overlay.
  const latchGeometry = new THREE.BoxGeometry(0.18, 0.8, 0.18);
  const latchMaterial = new THREE.MeshStandardMaterial({
    color: 0x6c7975,
    roughness: 0.28,
    metalness: 0.88,
    emissive: 0x263531,
    emissiveIntensity: 0.25,
  });
  const latchMesh = new THREE.InstancedMesh(latchGeometry, latchMaterial, 8);
  latchMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  hatch.add(latchMesh);
  const latchDummy = new THREE.Object3D();

  const lockHaloMaterial = new THREE.MeshBasicMaterial({
    color: 0xc3d1cc,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
  });
  const lockHalo = new THREE.Mesh(new THREE.TorusGeometry(4.56, 0.035, 6, 96), lockHaloMaterial);
  hatch.add(lockHalo);

  // 02 — One polished data object replaces the previous idea of many small
  // objects. It changes material state as BUILD → MEASURE → SHIP progresses.
  const dataRig = new THREE.Group();
  dataRig.position.set(-0.55, 0.15, -15.6);
  world.add(dataRig);

  const shellGeometry = new THREE.IcosahedronGeometry(isMobile ? 1.72 : 2.05, 2);
  const shellMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x819892,
    roughness: 0.12,
    metalness: 0.38,
    clearcoat: 0.95,
    clearcoatRoughness: 0.08,
    transparent: true,
    opacity: 0.5,
  });
  const shell = new THREE.Mesh(shellGeometry, shellMaterial);
  dataRig.add(shell);

  const wireMaterial = new THREE.LineBasicMaterial({
    color: 0xd9e5df,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
  });
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(shellGeometry, 14), wireMaterial);
  wire.scale.setScalar(1.018);
  dataRig.add(wire);

  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0xb1956d,
    emissive: 0x6e5638,
    emissiveIntensity: 0.9,
    roughness: 0.25,
    metalness: 0.6,
  });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 1), coreMaterial);
  dataRig.add(core);

  const orbitMaterial = new THREE.MeshBasicMaterial({
    color: 0xa8c1ba,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.65, 0.035, 6, 72), orbitMaterial);
  orbit.rotation.set(Math.PI / 2, 0.28, 0.2);
  dataRig.add(orbit);

  const scannerMaterial = new THREE.MeshBasicMaterial({
    color: 0xd9eee6,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const scanner = new THREE.Mesh(new THREE.PlaneGeometry(5.7, 0.055), scannerMaterial);
  scanner.rotation.x = -0.12;
  scanner.position.z = 0.1;
  dataRig.add(scanner);

  const fragmentCount = isMobile ? 10 : 18;
  const fragmentGeometry = new THREE.BoxGeometry(0.085, 0.55, 0.07);
  const fragmentMaterial = new THREE.MeshStandardMaterial({
    color: 0x9aaca6,
    roughness: 0.25,
    metalness: 0.78,
  });
  const fragments = new THREE.InstancedMesh(fragmentGeometry, fragmentMaterial, fragmentCount);
  fragments.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  dataRig.add(fragments);
  const fragmentDummy = new THREE.Object3D();

  const pointCount = isMobile ? 110 : 240;
  const pointPositions = new Float32Array(pointCount * 3);
  for (let i = 0; i < pointCount; i += 1) {
    const r = 0.25 + Math.random() * 1.85;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pointPositions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    pointPositions[i * 3 + 1] = Math.cos(phi) * r;
    pointPositions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
  }
  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));
  const pointMaterial = new THREE.PointsMaterial({
    color: 0xd8e9e2,
    size: isMobile ? 0.025 : 0.035,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dataPoints = new THREE.Points(pointGeometry, pointMaterial);
  dataRig.add(dataPoints);

  const dataLight = new THREE.PointLight(0x91b8ae, 0, 11, 2);
  dataLight.position.set(0.5, 1.1, 1.8);
  dataRig.add(dataLight);

  const update = (progress: number, time: number) => {
    // Monumental foreground wipe: the camera appears to pass a huge machine.
    const sweepIn = smoothstep(0.0, 0.075, progress);
    const sweepOut = smoothstep(0.085, 0.18, progress);
    sweep.visible = progress < 0.205;
    sweep.position.x = lerp(-4.8, 1.4, sweepIn) + sweepOut * 5.2;
    sweep.position.y = 0.4 - sweepIn * 0.7 + sweepOut * 1.2;
    sweep.position.z = 7.3 - sweepIn * 2.2 + sweepOut * 0.4;
    sweep.rotation.z = -0.05 + sweepIn * 0.17 + sweepOut * 0.13;
    sweep.rotation.y = -0.18 + sweepIn * 0.22;
    sweepArcs.forEach((arc, index) => {
      arc.rotation.z += (index % 2 === 0 ? 1 : -1) * 0.0016;
    });

    // Eight latches unlock in sequence before the iris blades open.
    const unlockMaster = smoothstep(0.055, 0.17, progress);
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const local = clamp(unlockMaster * 1.55 - i * 0.075, 0, 1);
      const eased = local * local * (3 - 2 * local);
      const radius = 4.56 + eased * 0.34;
      latchDummy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.1 + eased * 0.12);
      latchDummy.rotation.set(0, 0, angle - eased * 0.48);
      latchDummy.scale.set(1, 1 - eased * 0.28, 1);
      latchDummy.updateMatrix();
      latchMesh.setMatrixAt(i, latchDummy.matrix);
    }
    latchMesh.instanceMatrix.needsUpdate = true;
    latchMaterial.emissiveIntensity = 0.2 + unlockMaster * 0.95;
    lockHalo.rotation.z = -time * (0.04 + unlockMaster * 0.11);
    lockHaloMaterial.opacity = 0.06 + unlockMaster * 0.24;

    // Data sculpture is only present while the camera is in the logic hall.
    const appear = smoothstep(0.245, 0.335, progress);
    const measure = smoothstep(0.35, 0.50, progress);
    const ship = smoothstep(0.51, 0.67, progress);
    const fade = 1 - smoothstep(0.68, 0.76, progress);
    dataRig.visible = progress > 0.215 && progress < 0.775;
    const visibility = appear * fade;

    dataRig.rotation.y = time * 0.1 + measure * 0.42;
    dataRig.rotation.x = -0.08 + Math.sin(time * 0.35) * 0.035;
    dataRig.position.x = -0.55 + measure * 0.65 + ship * 1.0;
    dataRig.position.y = 0.15 + Math.sin(time * 0.55) * 0.08 + ship * 0.32;
    dataRig.scale.setScalar((0.72 + appear * 0.32) * (1 - ship * 0.08));

    shellMaterial.opacity = visibility * (0.52 - measure * 0.30 + ship * 0.2);
    shellMaterial.roughness = 0.12 + measure * 0.38 - ship * 0.18;
    shellMaterial.metalness = 0.38 - measure * 0.22 + ship * 0.32;
    wireMaterial.opacity = visibility * (0.08 + measure * 0.64 - ship * 0.28);
    pointMaterial.opacity = visibility * (measure * 0.64 + ship * 0.16);
    pointMaterial.size = (isMobile ? 0.025 : 0.035) + measure * 0.012;
    dataPoints.rotation.y = -time * (0.08 + measure * 0.18);

    const scanTravel = clamp((measure - 0.05) / 0.9, 0, 1);
    scanner.position.y = lerp(2.7, -2.7, scanTravel);
    scannerMaterial.opacity = visibility * Math.sin(scanTravel * Math.PI) * 0.72;
    scanner.scale.x = 0.7 + Math.sin(scanTravel * Math.PI) * 0.42;

    core.rotation.x = time * 0.26;
    core.rotation.y = time * 0.38;
    core.scale.setScalar(0.72 + appear * 0.30 + ship * 0.13);
    coreMaterial.emissiveIntensity = 0.5 + appear * 0.6 + ship * 1.6;
    orbit.rotation.z = time * (0.05 + measure * 0.15 + ship * 0.22);
    orbitMaterial.opacity = visibility * (0.12 + measure * 0.2 + ship * 0.16);
    dataLight.intensity = visibility * (1.5 + measure * 3.4 + ship * 4.8);

    for (let i = 0; i < fragmentCount; i += 1) {
      const angle = (i / fragmentCount) * Math.PI * 2 + time * 0.07;
      const layer = (i % 3) - 1;
      const assembledRadius = 2.35 + layer * 0.18;
      const releaseRadius = assembledRadius + ship * (2.4 + (i % 4) * 0.32);
      const y = Math.sin(angle * 1.7) * (0.62 + measure * 0.22) + layer * 0.38 + ship * (i % 2 === 0 ? 0.8 : -0.6);
      fragmentDummy.position.set(
        Math.cos(angle) * releaseRadius + ship * 1.6,
        y,
        Math.sin(angle) * (0.45 + measure * 0.8) + ship * ((i % 3) - 1) * 0.8,
      );
      fragmentDummy.rotation.set(angle * 0.32 + measure * 0.6, 0.25 + angle, angle + ship * 1.3);
      const s = visibility * (0.65 + appear * 0.35);
      fragmentDummy.scale.set(s, s * (1 + ship * 1.4), s);
      fragmentDummy.updateMatrix();
      fragments.setMatrixAt(i, fragmentDummy.matrix);
    }
    fragments.instanceMatrix.needsUpdate = true;
  };

  return { update };
}
