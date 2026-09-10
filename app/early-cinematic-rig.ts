import * as THREE from "three";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const smoothstep = (a: number, b: number, value: number) => {
  const t = clamp((value - a) / Math.max(0.0001, b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const pulse = (value: number, center: number, radius: number) => Math.max(0, 1 - Math.abs(value - center) / radius);

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

function makeShardGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.34);
  shape.lineTo(0.12, 0.02);
  shape.lineTo(0.025, 0.34);
  shape.lineTo(-0.095, 0.08);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.05,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: 0.009,
    bevelSize: 0.009,
    bevelSegments: 1,
  });
  geometry.translate(0, 0, -0.025);
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
      float fresnel = pow(1.0 - facing, 2.7);

      float scanY = mix(2.3, -2.3, clamp(uMeasure, 0.0, 1.0));
      float scan = exp(-abs(vLocalPosition.y - scanY) * 13.0) * smoothstep(0.02, 0.28, uMeasure);
      float latitude = 0.5 + 0.5 * sin(vLocalPosition.y * 7.0 - uTime * 0.42);
      float longitude = 0.5 + 0.5 * sin(atan(vLocalPosition.z, vLocalPosition.x) * 6.0 + uTime * 0.18);
      float caustic = pow(latitude * longitude, 7.0) * uMeasure;
      float topFade = smoothstep(-2.4, 1.8, vLocalPosition.y);

      vec3 ink = vec3(0.025, 0.042, 0.043);
      vec3 cold = vec3(0.43, 0.68, 0.64);
      vec3 pale = vec3(0.72, 0.84, 0.80);
      vec3 warm = vec3(0.64, 0.47, 0.29);
      vec3 color = mix(ink, cold, fresnel * 0.84);
      color = mix(color, pale, fresnel * fresnel * 0.18 + scan * 0.22);
      color = mix(color, warm, uShip * (0.14 + fresnel * 0.30));
      color += cold * scan * 1.15;
      color += pale * caustic * 0.07;
      color += cold * topFade * 0.018;

      float alpha = uOpacity * (0.038 + fresnel * 0.39 + scan * 0.20 + caustic * 0.035);
      gl_FragColor = vec4(color, alpha);
    }
  `,
};

const ENERGY_DISC_SHADER = {
  uniforms: {
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uWarm: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uIntensity;
    uniform float uWarm;
    varying vec2 vUv;

    void main() {
      vec2 p = (vUv - 0.5) * 2.0;
      float r = length(p);
      float a = atan(p.y, p.x);
      float mask = 1.0 - smoothstep(0.88, 1.0, r);
      float ringA = exp(-abs(r - 0.61) * 19.0);
      float ringB = exp(-abs(r - 0.39) * 25.0) * 0.42;
      float core = (1.0 - smoothstep(0.05, 0.72, r)) * 0.22;
      float rays = pow(max(0.0, sin(a * 12.0 + uTime * 0.48)), 18.0) * (1.0 - smoothstep(0.22, 0.9, r)) * 0.2;
      float slit = exp(-abs(p.y - sin(uTime * 0.55) * 0.08) * 22.0) * 0.07;
      vec3 cold = vec3(0.49, 0.75, 0.70);
      vec3 warm = vec3(0.74, 0.53, 0.31);
      vec3 color = mix(cold, warm, clamp(uWarm, 0.0, 1.0));
      float alpha = (ringA * 0.56 + ringB + core + rays + slit) * mask * uIntensity;
      gl_FragColor = vec4(color * (0.74 + ringA * 0.82 + rays), alpha);
    }
  `,
};

export function createEarlyCinematicRig(world: THREE.Group, hatch: THREE.Group, isMobile: boolean) {
  // 00 — Monumental architectural wipe: oversized and partially outside frame.
  const sweep = new THREE.Group();
  world.add(sweep);

  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x151c1b,
    roughness: 0.18,
    metalness: 0.96,
    emissive: 0x020504,
    emissiveIntensity: 0.2,
  });
  const bronzeMetal = new THREE.MeshStandardMaterial({
    color: 0x4d3c29,
    roughness: 0.22,
    metalness: 0.92,
    emissive: 0x100a04,
    emissiveIntensity: 0.18,
  });
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0xc9d9d2,
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const plateSpecs: Array<[number, number, number, number, number, THREE.Material]> = [
    [4.7, 6.9, -1.2, 1.32, 0.22, darkMetal],
    [3.66, 4.46, 0.31, 0.9, 0.12, bronzeMetal],
    [6.96, 7.5, -2.08, 0.88, 0.1, darkMetal],
    [7.62, 9.1, -2.86, 0.52, 0.18, darkMetal],
  ];
  const sweepPlates: THREE.Mesh[] = [];
  plateSpecs.forEach(([inner, outer, start, length, depth, material], index) => {
    const geometry = makeArcPlate(inner, outer, start, length, depth);
    const plate = new THREE.Mesh(geometry, material);
    plate.rotation.set(0.2 - index * 0.035, 0.36 + index * 0.09, -0.18 + index * 0.19);
    sweep.add(plate);
    sweepPlates.push(plate);

    if (index < 3) {
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 25), edgeMaterial.clone());
      edge.rotation.copy(plate.rotation);
      sweep.add(edge);
    }
  });

  const sweepSpine = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 7.9, 4, 10), darkMetal);
  sweepSpine.rotation.set(0.14, 0.31, Math.PI / 2 - 0.2);
  sweepSpine.position.set(-0.95, 0.35, -0.22);
  sweep.add(sweepSpine);

  const coldSeamMaterial = new THREE.MeshBasicMaterial({
    color: 0xc5ded5,
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sweepAccent = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 6.9, 3, 8), coldSeamMaterial);
  sweepAccent.rotation.copy(sweepSpine.rotation);
  sweepAccent.position.set(-0.68, 0.58, 0.035);
  sweep.add(sweepAccent);

  const warmAccentMaterial = new THREE.MeshBasicMaterial({
    color: 0xc99a61,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const warmAccent = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 2.4, 3, 8), warmAccentMaterial);
  warmAccent.rotation.set(0.13, 0.35, -0.72);
  warmAccent.position.set(2.35, -1.5, 0.05);
  sweep.add(warmAccent);

  sweep.position.set(-6.55, 0.78, 8.15);
  sweep.rotation.x = -0.06;
  sweep.scale.setScalar(1.28);

  const sweepLight = new THREE.PointLight(0x8eb6ac, 7, 17, 2.2);
  sweepLight.position.set(-1.6, 2.35, 2.2);
  sweep.add(sweepLight);

  const openingTarget = new THREE.Object3D();
  openingTarget.position.set(0, 0.15, 3.1);
  world.add(openingTarget);
  const openingSpot = new THREE.SpotLight(0xd8e6e1, 0, 34, Math.PI * 0.16, 0.72, 2.0);
  openingSpot.position.set(-4.8, 5.4, 12.5);
  openingSpot.target = openingTarget;
  world.add(openingSpot);

  const logicTarget = new THREE.Object3D();
  logicTarget.position.set(-0.35, 0.1, -15.5);
  world.add(logicTarget);
  const logicSpot = new THREE.SpotLight(0xb89366, 0, 24, Math.PI * 0.19, 0.76, 2.0);
  logicSpot.position.set(4.8, 4.4, -10.3);
  logicSpot.target = logicTarget;
  world.add(logicSpot);

  // 01 — Hatch unlock wave plus one concentrated energy event behind the iris.
  const latchGeometry = new THREE.CapsuleGeometry(0.07, 0.5, 4, 8);
  const latchMaterial = new THREE.MeshStandardMaterial({
    color: 0x66746f,
    roughness: 0.2,
    metalness: 0.94,
    emissive: 0x223630,
    emissiveIntensity: 0.13,
  });
  const latchMesh = new THREE.InstancedMesh(latchGeometry, latchMaterial, 8);
  latchMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  hatch.add(latchMesh);
  const latchDummy = new THREE.Object3D();
  const latchColor = new THREE.Color();
  const latchCold = new THREE.Color(0x53605c);
  const latchHot = new THREE.Color(0xc6ded6);
  for (let i = 0; i < 8; i += 1) latchMesh.setColorAt(i, latchCold);
  if (latchMesh.instanceColor) latchMesh.instanceColor.needsUpdate = true;

  const lockHaloMaterial = new THREE.MeshBasicMaterial({
    color: 0xd7e5df,
    transparent: true,
    opacity: 0.045,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const lockHalo = new THREE.Mesh(new THREE.TorusGeometry(4.58, 0.022, 6, 96), lockHaloMaterial);
  hatch.add(lockHalo);

  const confirmHaloMaterial = new THREE.MeshBasicMaterial({
    color: 0xc49a68,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const confirmHalo = new THREE.Mesh(new THREE.TorusGeometry(4.38, 0.018, 6, 96), confirmHaloMaterial);
  hatch.add(confirmHalo);

  const hatchEnergyMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(ENERGY_DISC_SHADER.uniforms),
    vertexShader: ENERGY_DISC_SHADER.vertexShader,
    fragmentShader: ENERGY_DISC_SHADER.fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const hatchEnergy = new THREE.Mesh(new THREE.CircleGeometry(3.72, 64), hatchEnergyMaterial);
  hatchEnergy.position.z = -0.34;
  hatch.add(hatchEnergy);

  const shockMaterial = new THREE.MeshBasicMaterial({
    color: 0xe5f1ec,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const hatchShock = new THREE.Mesh(new THREE.TorusGeometry(3.72, 0.035, 6, 96), shockMaterial);
  hatchShock.position.z = 0.16;
  hatch.add(hatchShock);

  // 02 — Designed data specimen with a brief eclipse frame at scan peak.
  const dataRig = new THREE.Group();
  dataRig.position.set(-0.52, 0.05, -15.65);
  dataRig.rotation.z = -0.065;
  world.add(dataRig);

  const profile = [
    new THREE.Vector2(0.22, -2.18),
    new THREE.Vector2(0.68, -1.83),
    new THREE.Vector2(1.18, -1.18),
    new THREE.Vector2(1.52, -0.38),
    new THREE.Vector2(1.58, 0.38),
    new THREE.Vector2(1.31, 1.14),
    new THREE.Vector2(0.78, 1.8),
    new THREE.Vector2(0.27, 2.15),
  ];
  const shellGeometry = new THREE.LatheGeometry(profile, isMobile ? 24 : 34);
  shellGeometry.scale(1.04, 1.0, 0.87);
  shellGeometry.computeVertexNormals();

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

  const eclipseMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(ENERGY_DISC_SHADER.uniforms),
    vertexShader: ENERGY_DISC_SHADER.vertexShader,
    fragmentShader: ENERGY_DISC_SHADER.fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const eclipse = new THREE.Mesh(new THREE.CircleGeometry(3.72, 64), eclipseMaterial);
  eclipse.position.z = -0.72;
  eclipse.scale.set(1.08, 1.08, 1);
  dataRig.add(eclipse);

  const innerShellMaterial = new THREE.MeshBasicMaterial({
    color: 0x76958d,
    transparent: true,
    opacity: 0,
    wireframe: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const innerShell = new THREE.Mesh(shellGeometry.clone(), innerShellMaterial);
  innerShell.scale.setScalar(0.81);
  dataRig.add(innerShell);

  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0x8e704b,
    emissive: 0x704c2c,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.74,
  });
  const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 0), coreMaterial);
  core.rotation.set(0.25, 0.5, -0.1);
  dataRig.add(core);

  const coreHaloMaterial = new THREE.MeshBasicMaterial({
    color: 0xd1aa77,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const coreHalo = new THREE.Mesh(new THREE.SphereGeometry(0.88, 16, 10), coreHaloMaterial);
  dataRig.add(coreHalo);

  const orbitMaterial = new THREE.MeshBasicMaterial({
    color: 0xb9cec7,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const orbits: THREE.Mesh[] = [];
  [
    { radius: 2.42, arc: Math.PI * 1.52, rotation: [Math.PI / 2 + 0.18, 0.32, 0.08] as const },
    { radius: 2.76, arc: Math.PI * 1.18, rotation: [Math.PI / 2 + 0.64, 0.92, -0.48] as const },
  ].forEach((spec) => {
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(spec.radius, 0.017, 5, 58, spec.arc), orbitMaterial.clone());
    orbit.rotation.set(spec.rotation[0], spec.rotation[1], spec.rotation[2]);
    dataRig.add(orbit);
    orbits.push(orbit);
  });

  const scanRingMaterial = new THREE.MeshBasicMaterial({
    color: 0xe3f3ed,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const scanRing = new THREE.Mesh(new THREE.TorusGeometry(2.22, 0.024, 5, 68), scanRingMaterial);
  scanRing.rotation.x = Math.PI / 2;
  dataRig.add(scanRing);

  const pedestalMaterial = new THREE.MeshBasicMaterial({
    color: 0x8fb5aa,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const pedestal = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.95, 64), pedestalMaterial);
  pedestal.rotation.x = -Math.PI / 2;
  pedestal.position.y = -2.47;
  dataRig.add(pedestal);

  const fragmentCount = isMobile ? 8 : 13;
  const fragmentGeometry = makeShardGeometry();
  const fragmentMaterial = new THREE.MeshStandardMaterial({
    color: 0x9faea9,
    roughness: 0.22,
    metalness: 0.82,
    emissive: 0x0a1110,
    emissiveIntensity: 0.16,
  });
  const fragments = new THREE.InstancedMesh(fragmentGeometry, fragmentMaterial, fragmentCount);
  fragments.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  dataRig.add(fragments);
  const fragmentDummy = new THREE.Object3D();
  const fragmentSeeds = Array.from({ length: fragmentCount }, (_, i) => ({
    angle: (i / fragmentCount) * Math.PI * 2 + (i % 3) * 0.37,
    height: ((i % 5) - 2) * 0.44,
    depth: ((i % 4) - 1.5) * 0.18,
    spread: 0.28 + (i % 4) * 0.19,
  }));

  const pointCount = isMobile ? 72 : 145;
  const pointPositions = new Float32Array(pointCount * 3);
  for (let i = 0; i < pointCount; i += 1) {
    const r = 0.35 + Math.random() * 1.65;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pointPositions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    pointPositions[i * 3 + 1] = Math.cos(phi) * r * 1.18;
    pointPositions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r * 0.84;
  }
  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));
  const pointMaterial = new THREE.PointsMaterial({
    color: 0xdaece5,
    size: isMobile ? 0.021 : 0.027,
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
    // Opening hero frame: larger than the viewport, then a clean lateral wipe.
    const sweepReveal = smoothstep(0.0, 0.052, progress);
    const sweepTravel = smoothstep(0.052, 0.105, progress);
    const sweepOut = smoothstep(0.105, 0.178, progress);
    sweep.visible = progress < 0.195;
    sweep.position.x = lerp(-6.55, -2.35, sweepReveal) + sweepTravel * 1.42 + sweepOut * 6.85;
    sweep.position.y = 0.78 - sweepReveal * 0.42 - sweepTravel * 0.2 + sweepOut * 0.85;
    sweep.position.z = 8.15 - sweepReveal * 1.48 - sweepTravel * 0.76 + sweepOut * 0.48;
    sweep.rotation.y = -0.16 + sweepReveal * 0.1 + sweepTravel * 0.1 + sweepOut * 0.065;
    sweep.rotation.z = -0.08 + sweepReveal * 0.03 + sweepTravel * 0.065 + sweepOut * 0.065;
    sweep.scale.setScalar(1.28 + sweepReveal * 0.06 - sweepOut * 0.035);
    sweepPlates.forEach((plate, index) => {
      plate.rotation.z += (index % 2 === 0 ? 1 : -1) * 0.00038;
    });
    sweepLight.intensity = (1 - sweepOut) * (3.1 + sweepReveal * 6.0);
    coldSeamMaterial.opacity = (1 - sweepOut) * (0.14 + sweepTravel * 0.22);
    warmAccentMaterial.opacity = (1 - sweepOut) * (0.1 + sweepReveal * 0.22);
    openingSpot.intensity = (1 - smoothstep(0.17, 0.25, progress)) * (4.0 + sweepReveal * 3.6);

    // Hatch: restrained unlock, then a single energy convergence + shock ring.
    const unlockMaster = smoothstep(0.055, 0.17, progress);
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const local = clamp(unlockMaster * 1.58 - i * 0.078, 0, 1);
      const eased = local * local * (3 - 2 * local);
      const radius = 4.57 + eased * 0.32;
      latchDummy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.09 + eased * 0.13);
      latchDummy.rotation.set(0, 0, angle - eased * 0.46);
      latchDummy.scale.set(1, 1 - eased * 0.22, 1);
      latchDummy.updateMatrix();
      latchMesh.setMatrixAt(i, latchDummy.matrix);
      latchColor.copy(latchCold).lerp(latchHot, eased * 0.92);
      latchMesh.setColorAt(i, latchColor);
    }
    latchMesh.instanceMatrix.needsUpdate = true;
    if (latchMesh.instanceColor) latchMesh.instanceColor.needsUpdate = true;
    latchMaterial.emissiveIntensity = 0.1 + unlockMaster * 0.72;
    lockHalo.rotation.z = -time * (0.022 + unlockMaster * 0.08);
    lockHaloMaterial.opacity = 0.028 + unlockMaster * 0.16;

    const confirm = pulse(progress, 0.176, 0.032);
    const hatchBurst = pulse(progress, 0.207, 0.052);
    confirmHalo.rotation.z = time * 0.12;
    confirmHaloMaterial.opacity = confirm * 0.36;
    confirmHalo.scale.setScalar(0.985 + confirm * 0.035);
    hatchEnergyMaterial.uniforms.uTime.value = time;
    hatchEnergyMaterial.uniforms.uIntensity.value = confirm * 0.26 + hatchBurst * 0.92;
    hatchEnergyMaterial.uniforms.uWarm.value = confirm * 0.42;
    hatchEnergy.rotation.z = -time * 0.035;
    shockMaterial.opacity = hatchBurst * 0.48;
    hatchShock.scale.setScalar(0.72 + hatchBurst * 0.56);
    hatchShock.rotation.z = time * 0.08;

    // BUILD → MEASURE → SHIP with one decisive eclipse frame at scan peak.
    const appear = smoothstep(0.245, 0.33, progress);
    const build = smoothstep(0.27, 0.36, progress);
    const measure = smoothstep(0.37, 0.50, progress);
    const ship = smoothstep(0.515, 0.665, progress);
    const fade = 1 - smoothstep(0.68, 0.76, progress);
    const visibility = appear * fade;
    const scanHero = pulse(progress, 0.447, 0.075) * visibility;
    dataRig.visible = progress > 0.215 && progress < 0.775;

    dataRig.rotation.y = -0.34 + time * 0.045 + measure * 0.27;
    dataRig.rotation.x = -0.04 + Math.sin(time * 0.25) * 0.015;
    dataRig.position.x = -0.52 + measure * 0.3 + ship * 0.76;
    dataRig.position.y = 0.05 + Math.sin(time * 0.38) * 0.038 + ship * 0.2;
    dataRig.scale.setScalar((0.76 + appear * 0.26 + scanHero * 0.035) * (1 - ship * 0.05));

    shellMaterial.uniforms.uTime.value = time;
    shellMaterial.uniforms.uMeasure.value = measure;
    shellMaterial.uniforms.uShip.value = ship;
    shellMaterial.uniforms.uOpacity.value = visibility * (1 - scanHero * 0.16);

    eclipseMaterial.uniforms.uTime.value = time;
    eclipseMaterial.uniforms.uIntensity.value = scanHero * 0.78;
    eclipseMaterial.uniforms.uWarm.value = 0.08 + ship * 0.28;
    eclipse.rotation.z = time * 0.022;
    eclipse.scale.setScalar(1.03 + scanHero * 0.1);

    innerShellMaterial.opacity = visibility * (0.012 + measure * 0.13 - ship * 0.06 + scanHero * 0.075);
    innerShell.rotation.y = -time * (0.03 + measure * 0.07);
    pointMaterial.opacity = visibility * (measure * 0.28 + ship * 0.06 + scanHero * 0.18);
    dataPoints.rotation.y = -time * (0.04 + measure * 0.1);

    const scanTravel = clamp((measure - 0.03) / 0.94, 0, 1);
    scanRing.position.y = lerp(2.2, -2.2, scanTravel);
    scanRing.scale.setScalar(0.66 + Math.sin(scanTravel * Math.PI) * 0.34 + scanHero * 0.05);
    scanRingMaterial.opacity = visibility * Math.sin(scanTravel * Math.PI) * 0.42 + scanHero * 0.18;

    core.rotation.x = 0.25 + time * 0.1;
    core.rotation.y = 0.5 + time * 0.16;
    core.scale.setScalar(0.73 + appear * 0.21 + ship * 0.07 + scanHero * 0.18);
    coreMaterial.emissiveIntensity = 0.38 + appear * 0.4 + measure * 0.3 + ship * 1.2 + scanHero * 1.15;
    coreHalo.scale.setScalar(0.9 + Math.sin(time * 0.68) * 0.02 + ship * 0.1 + scanHero * 0.13);
    coreHaloMaterial.opacity = visibility * (0.035 + measure * 0.052 + ship * 0.09) + scanHero * 0.18;

    orbits.forEach((orbit, index) => {
      orbit.rotation.z += (index % 2 === 0 ? 1 : -1) * (0.00055 + measure * 0.0016 + ship * 0.003);
      (orbit.material as THREE.MeshBasicMaterial).opacity = visibility * (0.035 + build * 0.035 + measure * 0.042 + ship * 0.025) + scanHero * 0.04;
    });

    pedestalMaterial.opacity = visibility * (0.014 + measure * 0.035 + ship * 0.016) + scanHero * 0.075;
    pedestal.scale.setScalar(0.96 + scanHero * 0.11);
    pedestal.rotation.z = time * 0.022;
    coldLight.intensity = visibility * (0.5 + measure * 2.4 + ship * 1.1) + scanHero * 4.2;
    warmLight.intensity = visibility * (0.32 + ship * 3.6) + scanHero * 1.4;
    logicSpot.intensity = visibility * (1.2 + measure * 2.7 + ship * 1.8) + scanHero * 4.4;

    fragmentSeeds.forEach((seed, i) => {
      const angle = seed.angle + time * 0.026;
      const preRadius = 4.15 + seed.spread;
      const assembledRadius = 2.34 + seed.spread * 0.16;
      const radius = lerp(preRadius, assembledRadius, build) + ship * (2.18 + seed.spread * 1.22) + scanHero * 0.06;
      const y = lerp(seed.height * 1.82, seed.height, build) + ship * (i % 2 === 0 ? 0.64 : -0.5);
      const z = Math.sin(angle) * lerp(1.62, 0.68, build) + seed.depth + ship * ((i % 3) - 1) * 0.6;
      fragmentDummy.position.set(Math.cos(angle) * radius + ship * 1.18, y, z);
      fragmentDummy.rotation.set(angle * 0.2 + measure * 0.34, 0.16 + angle, angle * 0.62 + ship * 1.0);
      const scale = visibility * (0.7 + build * 0.28) * (1 + scanHero * 0.08);
      fragmentDummy.scale.set(scale, scale * (1 + ship * 0.9), scale * 0.8);
      fragmentDummy.updateMatrix();
      fragments.setMatrixAt(i, fragmentDummy.matrix);
    });
    fragments.instanceMatrix.needsUpdate = true;
  };

  return { update };
}
