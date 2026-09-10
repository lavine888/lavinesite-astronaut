import * as THREE from "three";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const smoothstep = (a: number, b: number, value: number) => {
  const t = clamp((value - a) / Math.max(0.0001, b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function makeArcPlate(inner: number, outer: number, start: number, length: number, depth: number) {
  const end = start + length;
  const shape = new THREE.Shape();
  shape.moveTo(Math.cos(start) * outer, Math.sin(start) * outer);
  shape.absarc(0, 0, outer, start, end, false);
  shape.lineTo(Math.cos(end) * inner, Math.sin(end) * inner);
  shape.absarc(0, 0, inner, end, start, true);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  geometry.computeVertexNormals();
  return geometry;
}

const GLASS_SHADER = {
  uniforms: {
    uTime: { value: 0 },
    uMeasure: { value: 0 },
    uShip: { value: 0 },
    uOpacity: { value: 0 },
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    varying vec3 vLocalPosition;

    void main() {
      vLocalPosition = position;
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorldPosition = world.xyz;
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uMeasure;
    uniform float uShip;
    uniform float uOpacity;

    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    varying vec3 vLocalPosition;

    void main() {
      vec3 V = normalize(cameraPosition - vWorldPosition);
      float facing = clamp(dot(normalize(vWorldNormal), V), 0.0, 1.0);
      float fresnel = pow(1.0 - facing, 2.45);

      float scanY = mix(2.35, -2.35, clamp(uMeasure, 0.0, 1.0));
      float scan = exp(-abs(vLocalPosition.y - scanY) * 11.5) * smoothstep(0.02, 0.3, uMeasure);
      float veins = pow(0.5 + 0.5 * sin(vLocalPosition.y * 8.0 + vLocalPosition.x * 5.0 - uTime * 0.6), 10.0);

      vec3 ink = vec3(0.035, 0.055, 0.055);
      vec3 cold = vec3(0.44, 0.69, 0.64);
      vec3 warm = vec3(0.63, 0.48, 0.31);
      vec3 color = mix(ink, cold, fresnel * 0.92 + scan * 0.34);
      color = mix(color, warm, uShip * (0.18 + fresnel * 0.28));
      color += cold * scan * 1.1;
      color += cold * veins * 0.035 * uMeasure;

      float alpha = uOpacity * (0.055 + fresnel * 0.39 + scan * 0.22 + veins * 0.025 * uMeasure);
      gl_FragColor = vec4(color, alpha);
    }
  `,
};

export function createEarlyCinematicRig(world: THREE.Group, hatch: THREE.Group, isMobile: boolean) {
  // 00 — Monumental architectural wipe. Large custom arc plates replace generic torus geometry.
  const sweep = new THREE.Group();
  world.add(sweep);

  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x202927,
    roughness: 0.23,
    metalness: 0.93,
    emissive: 0x030706,
    emissiveIntensity: 0.32,
  });
  const bronzeMetal = new THREE.MeshStandardMaterial({
    color: 0x40372b,
    roughness: 0.27,
    metalness: 0.88,
    emissive: 0x0c0804,
    emissiveIntensity: 0.18,
  });
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0xc8d8d1,
    transparent: true,
    opacity: 0.21,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const plateSpecs: Array<[number, number, number, number, number, THREE.Material]> = [
    [4.75, 6.55, -1.12, 1.34, 0.18, darkMetal],
    [3.82, 4.48, 0.42, 1.02, 0.12, bronzeMetal],
    [6.82, 7.25, -2.0, 0.92, 0.1, darkMetal],
  ];
  const sweepPlates: THREE.Mesh[] = [];
  plateSpecs.forEach(([inner, outer, start, length, depth, material], index) => {
    const geometry = makeArcPlate(inner, outer, start, length, depth);
    const plate = new THREE.Mesh(geometry, material);
    plate.rotation.set(0.24 - index * 0.05, 0.38 + index * 0.11, -0.16 + index * 0.23);
    sweep.add(plate);
    sweepPlates.push(plate);

    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 24), edgeMaterial.clone());
    edge.rotation.copy(plate.rotation);
    sweep.add(edge);
  });

  const sweepSpine = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.16, 7.4, 4, 10),
    darkMetal,
  );
  sweepSpine.rotation.set(0.16, 0.34, Math.PI / 2 - 0.22);
  sweepSpine.position.set(-0.9, 0.4, -0.24);
  sweep.add(sweepSpine);

  const sweepAccent = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.028, 6.6, 3, 8),
    new THREE.MeshBasicMaterial({
      color: 0xb9d3c9,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  sweepAccent.rotation.copy(sweepSpine.rotation);
  sweepAccent.position.set(-0.68, 0.62, 0.02);
  sweep.add(sweepAccent);
  sweep.position.set(-5.3, 0.25, 7.7);

  const sweepLight = new THREE.PointLight(0x8eb6ac, 8, 18, 2.2);
  sweepLight.position.set(-1.8, 2.2, 2.4);
  sweep.add(sweepLight);

  // 01 — Sequential hatch latches, polished and understated.
  const latchGeometry = new THREE.CapsuleGeometry(0.075, 0.5, 4, 8);
  const latchMaterial = new THREE.MeshStandardMaterial({
    color: 0x7d8c87,
    roughness: 0.22,
    metalness: 0.92,
    emissive: 0x29413a,
    emissiveIntensity: 0.16,
  });
  const latchMesh = new THREE.InstancedMesh(latchGeometry, latchMaterial, 8);
  latchMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  hatch.add(latchMesh);
  const latchDummy = new THREE.Object3D();

  const lockHaloMaterial = new THREE.MeshBasicMaterial({
    color: 0xd5e2dc,
    transparent: true,
    opacity: 0.055,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const lockHalo = new THREE.Mesh(new THREE.TorusGeometry(4.58, 0.025, 6, 96), lockHaloMaterial);
  hatch.add(lockHalo);

  // 02 — A designed data specimen: glass skin, warm nucleus, restrained orbital system.
  const dataRig = new THREE.Group();
  dataRig.position.set(-0.45, 0.12, -15.65);
  world.add(dataRig);

  const shellGeometry = new THREE.SphereGeometry(isMobile ? 1.72 : 1.95, isMobile ? 24 : 34, isMobile ? 16 : 22);
  shellGeometry.scale(1.05, 1.26, 0.86);
  const shellMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(GLASS_SHADER.uniforms),
    vertexShader: GLASS_SHADER.vertexShader,
    fragmentShader: GLASS_SHADER.fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const shell = new THREE.Mesh(shellGeometry, shellMaterial);
  dataRig.add(shell);

  const innerShellMaterial = new THREE.MeshBasicMaterial({
    color: 0x78958e,
    transparent: true,
    opacity: 0,
    wireframe: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const innerShell = new THREE.Mesh(shellGeometry.clone(), innerShellMaterial);
  innerShell.scale.setScalar(0.82);
  dataRig.add(innerShell);

  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0x8f7350,
    emissive: 0x6c4d2f,
    emissiveIntensity: 0.55,
    roughness: 0.22,
    metalness: 0.72,
  });
  const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.63, 0), coreMaterial);
  core.rotation.set(0.25, 0.5, -0.1);
  dataRig.add(core);

  const coreHaloMaterial = new THREE.MeshBasicMaterial({
    color: 0xd0aa76,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const coreHalo = new THREE.Mesh(new THREE.SphereGeometry(0.9, 18, 12), coreHaloMaterial);
  dataRig.add(coreHalo);

  const orbitMaterial = new THREE.MeshBasicMaterial({
    color: 0xb5cbc4,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const orbits: THREE.Mesh[] = [];
  [2.35, 2.62, 2.86].forEach((radius, index) => {
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 5, 64), orbitMaterial.clone());
    orbit.rotation.set(
      Math.PI / 2 + index * 0.31,
      0.24 + index * 0.42,
      0.18 - index * 0.27,
    );
    dataRig.add(orbit);
    orbits.push(orbit);
  });

  const scanRingMaterial = new THREE.MeshBasicMaterial({
    color: 0xe0f2eb,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const scanRing = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.026, 5, 72), scanRingMaterial);
  scanRing.rotation.x = Math.PI / 2;
  dataRig.add(scanRing);

  const fragmentCount = isMobile ? 9 : 15;
  const fragmentGeometry = new THREE.TetrahedronGeometry(0.17, 0);
  const fragmentMaterial = new THREE.MeshStandardMaterial({
    color: 0x9caea8,
    roughness: 0.24,
    metalness: 0.8,
    emissive: 0x0b1210,
    emissiveIntensity: 0.2,
  });
  const fragments = new THREE.InstancedMesh(fragmentGeometry, fragmentMaterial, fragmentCount);
  fragments.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  dataRig.add(fragments);
  const fragmentDummy = new THREE.Object3D();
  const fragmentSeeds = Array.from({ length: fragmentCount }, (_, i) => ({
    angle: (i / fragmentCount) * Math.PI * 2 + (i % 3) * 0.31,
    height: ((i % 5) - 2) * 0.42,
    depth: ((i % 4) - 1.5) * 0.18,
    spread: 0.3 + (i % 4) * 0.18,
  }));

  const pointCount = isMobile ? 90 : 180;
  const pointPositions = new Float32Array(pointCount * 3);
  for (let i = 0; i < pointCount; i += 1) {
    const r = 0.35 + Math.random() * 1.7;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pointPositions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    pointPositions[i * 3 + 1] = Math.cos(phi) * r * 1.2;
    pointPositions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r * 0.86;
  }
  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));
  const pointMaterial = new THREE.PointsMaterial({
    color: 0xd9ebe4,
    size: isMobile ? 0.022 : 0.029,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dataPoints = new THREE.Points(pointGeometry, pointMaterial);
  dataRig.add(dataPoints);

  const coldLight = new THREE.PointLight(0x8fbdb2, 0, 10, 2.1);
  coldLight.position.set(1.8, 1.7, 2.2);
  dataRig.add(coldLight);
  const warmLight = new THREE.PointLight(0xb1875a, 0, 7, 2.1);
  warmLight.position.set(-1.1, -0.7, 1.4);
  dataRig.add(warmLight);

  const update = (progress: number, time: number) => {
    // Monumental wipe: the object starts partially off-screen and crosses the camera as one coherent sculpture.
    const sweepIn = smoothstep(0.0, 0.07, progress);
    const sweepOut = smoothstep(0.075, 0.17, progress);
    sweep.visible = progress < 0.19;
    sweep.position.x = lerp(-5.3, -0.4, sweepIn) + sweepOut * 6.2;
    sweep.position.y = 0.25 - sweepIn * 0.7 + sweepOut * 0.95;
    sweep.position.z = 7.7 - sweepIn * 2.4 + sweepOut * 0.65;
    sweep.rotation.y = -0.12 + sweepIn * 0.22 + sweepOut * 0.08;
    sweep.rotation.z = -0.08 + sweepIn * 0.11 + sweepOut * 0.08;
    sweepPlates.forEach((plate, index) => {
      plate.rotation.z += (index % 2 === 0 ? 1 : -1) * 0.0007;
    });
    sweepLight.intensity = (1 - sweepOut) * (4.5 + sweepIn * 5.5);

    // Hatch unlock sequence stays subtle until the final latch releases.
    const unlockMaster = smoothstep(0.055, 0.17, progress);
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const local = clamp(unlockMaster * 1.55 - i * 0.075, 0, 1);
      const eased = local * local * (3 - 2 * local);
      const radius = 4.57 + eased * 0.32;
      latchDummy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.09 + eased * 0.13);
      latchDummy.rotation.set(0, 0, angle - eased * 0.46);
      latchDummy.scale.set(1, 1 - eased * 0.22, 1);
      latchDummy.updateMatrix();
      latchMesh.setMatrixAt(i, latchDummy.matrix);
    }
    latchMesh.instanceMatrix.needsUpdate = true;
    latchMaterial.emissiveIntensity = 0.12 + unlockMaster * 0.8;
    lockHalo.rotation.z = -time * (0.025 + unlockMaster * 0.09);
    lockHaloMaterial.opacity = 0.035 + unlockMaster * 0.19;

    // BUILD → MEASURE → SHIP as one designed object instead of three unrelated effects.
    const appear = smoothstep(0.245, 0.33, progress);
    const build = smoothstep(0.27, 0.36, progress);
    const measure = smoothstep(0.37, 0.50, progress);
    const ship = smoothstep(0.515, 0.665, progress);
    const fade = 1 - smoothstep(0.68, 0.76, progress);
    const visibility = appear * fade;
    dataRig.visible = progress > 0.215 && progress < 0.775;

    dataRig.rotation.y = -0.28 + time * 0.065 + measure * 0.36;
    dataRig.rotation.x = -0.05 + Math.sin(time * 0.31) * 0.022;
    dataRig.position.x = -0.45 + measure * 0.42 + ship * 0.82;
    dataRig.position.y = 0.12 + Math.sin(time * 0.48) * 0.055 + ship * 0.24;
    dataRig.scale.setScalar((0.74 + appear * 0.28) * (1 - ship * 0.055));

    shellMaterial.uniforms.uTime.value = time;
    shellMaterial.uniforms.uMeasure.value = measure;
    shellMaterial.uniforms.uShip.value = ship;
    shellMaterial.uniforms.uOpacity.value = visibility;

    innerShellMaterial.opacity = visibility * (0.018 + measure * 0.15 - ship * 0.07);
    innerShell.rotation.y = -time * (0.035 + measure * 0.08);
    pointMaterial.opacity = visibility * (measure * 0.4 + ship * 0.08);
    dataPoints.rotation.y = -time * (0.045 + measure * 0.11);

    const scanTravel = clamp((measure - 0.03) / 0.94, 0, 1);
    scanRing.position.y = lerp(2.25, -2.25, scanTravel);
    scanRing.scale.setScalar(0.68 + Math.sin(scanTravel * Math.PI) * 0.36);
    scanRingMaterial.opacity = visibility * Math.sin(scanTravel * Math.PI) * 0.58;

    core.rotation.x = 0.25 + time * 0.14;
    core.rotation.y = 0.5 + time * 0.22;
    core.scale.setScalar(0.74 + appear * 0.22 + ship * 0.08);
    coreMaterial.emissiveIntensity = 0.42 + appear * 0.45 + measure * 0.35 + ship * 1.25;
    coreHalo.scale.setScalar(0.9 + Math.sin(time * 0.8) * 0.025 + ship * 0.12);
    coreHaloMaterial.opacity = visibility * (0.045 + measure * 0.06 + ship * 0.11);

    orbits.forEach((orbit, index) => {
      orbit.rotation.z += (index % 2 === 0 ? 1 : -1) * (0.0008 + measure * 0.0025 + ship * 0.004);
      (orbit.material as THREE.MeshBasicMaterial).opacity = visibility * (0.055 + build * 0.05 + measure * 0.055 + ship * 0.035);
    });

    coldLight.intensity = visibility * (0.7 + measure * 3.2 + ship * 1.6);
    warmLight.intensity = visibility * (0.45 + ship * 4.0);

    fragmentSeeds.forEach((seed, i) => {
      const angle = seed.angle + time * 0.035;
      const preRadius = 4.2 + seed.spread;
      const assembledRadius = 2.38 + seed.spread * 0.18;
      const radius = lerp(preRadius, assembledRadius, build) + ship * (2.3 + seed.spread * 1.3);
      const y = lerp(seed.height * 1.9, seed.height, build) + ship * (i % 2 === 0 ? 0.7 : -0.55);
      const z = Math.sin(angle) * lerp(1.7, 0.72, build) + seed.depth + ship * ((i % 3) - 1) * 0.65;
      fragmentDummy.position.set(
        Math.cos(angle) * radius + ship * 1.25,
        y,
        z,
      );
      fragmentDummy.rotation.set(angle * 0.24 + measure * 0.42, 0.2 + angle, angle * 0.7 + ship * 1.1);
      const scale = visibility * (0.72 + build * 0.28);
      fragmentDummy.scale.set(scale, scale * (1 + ship * 1.0), scale * 0.85);
      fragmentDummy.updateMatrix();
      fragments.setMatrixAt(i, fragmentDummy.matrix);
    });
    fragments.instanceMatrix.needsUpdate = true;
  };

  return { update };
}
