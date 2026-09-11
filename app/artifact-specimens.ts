import * as THREE from "three";

const GOLD = 0x8f7045;
const OLD_GOLD = 0xb38b56;
const PALE_GOLD = 0xd0b27c;
const GUNMETAL = 0x1a1b19;
const SILVER = 0xa9aaa1;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const smoothstep = (a: number, b: number, value: number) => {
  const t = clamp((value - a) / Math.max(0.0001, b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function metal(color = GUNMETAL, roughness = 0.3, metalness = 0.88) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function glow(color = OLD_GOLD, opacity = 0.22) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function addArchiveFrame(group: THREE.Group, radius = 1.72) {
  const frame = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.025, 5, 64),
    glow(GOLD, 0.16),
  );
  frame.rotation.x = Math.PI / 2;
  frame.rotation.z = 0.16;
  group.add(frame);

  const frame2 = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.78, 0.014, 5, 52, Math.PI * 1.45),
    glow(SILVER, 0.11),
  );
  frame2.rotation.set(Math.PI / 2 + 0.42, 0.34, -0.38);
  group.add(frame2);
}

function cylinderBetween(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) {
  const direction = new THREE.Vector3().subVectors(b, a);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function makeWozai() {
  const g = new THREE.Group();
  const body = metal(0x27231b, 0.24, 0.9);
  const gold = metal(0x6f5633, 0.22, 0.92);
  const line = glow(PALE_GOLD, 0.45);

  const left = new THREE.Mesh(new THREE.IcosahedronGeometry(0.58, 1), body);
  const right = new THREE.Mesh(new THREE.IcosahedronGeometry(0.58, 1), gold);
  left.position.set(-0.72, 0.08, 0);
  right.position.set(0.72, -0.08, 0.08);
  left.scale.set(0.84, 1.08, 0.9);
  right.scale.set(0.84, 1.08, 0.9);
  g.add(left, right);

  const a = new THREE.Vector3(-0.24, 0.08, 0.02);
  const b = new THREE.Vector3(0.24, -0.05, 0.06);
  g.add(cylinderBetween(a, b, 0.018, line));

  const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), glow(PALE_GOLD, 0.62));
  g.add(pulse);
  addArchiveFrame(g, 1.62);
  return { group: g, movers: [left, right, pulse] };
}

function makeAgentJam() {
  const g = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.OctahedronGeometry(0.47, 0), metal(0x695133, 0.2, 0.92));
  g.add(hub);
  const movers: THREE.Object3D[] = [hub];
  const nodes = [
    new THREE.Vector3(1.05, 0.24, 0.1),
    new THREE.Vector3(0.35, 0.96, -0.12),
    new THREE.Vector3(-0.82, 0.67, 0.18),
    new THREE.Vector3(-1.05, -0.32, -0.05),
    new THREE.Vector3(0.28, -1.0, 0.14),
  ];
  const nodeMat = metal(0x333029, 0.32, 0.82);
  const connectorMat = glow(OLD_GOLD, 0.31);
  nodes.forEach((p, index) => {
    const node = new THREE.Mesh(new THREE.DodecahedronGeometry(index === 0 ? 0.22 : 0.17, 0), nodeMat);
    node.position.copy(p);
    g.add(node);
    g.add(cylinderBetween(new THREE.Vector3(), p.clone().multiplyScalar(0.88), 0.012, connectorMat.clone()));
    movers.push(node);
  });
  addArchiveFrame(g, 1.72);
  return { group: g, movers };
}

function makePandaAI() {
  const g = new THREE.Group();
  const movers: THREE.Object3D[] = [];
  const heights = [0.55, 0.92, 0.68, 1.35, 1.04, 1.58];
  const barMat = metal(0x2a2822, 0.26, 0.88);
  const signalMat = metal(0x745936, 0.2, 0.92);
  heights.forEach((height, index) => {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, height, 0.28),
      index === 3 || index === 5 ? signalMat : barMat,
    );
    bar.position.set((index - 2.5) * 0.34, -0.72 + height * 0.5, (index % 2) * 0.08 - 0.04);
    g.add(bar);
    movers.push(bar);
  });
  const baseline = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.035, 0.42), glow(GOLD, 0.25));
  baseline.position.y = -0.73;
  g.add(baseline);
  const marker = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), glow(PALE_GOLD, 0.72));
  marker.position.set(0.5, 0.72, 0.15);
  g.add(marker);
  movers.push(marker);
  addArchiveFrame(g, 1.75);
  return { group: g, movers };
}

function makeLiveLink() {
  const g = new THREE.Group();
  const movers: THREE.Object3D[] = [];
  const points = [
    new THREE.Vector3(-1.0, 0.55, 0.1),
    new THREE.Vector3(-0.25, 0.92, -0.2),
    new THREE.Vector3(0.8, 0.62, 0.16),
    new THREE.Vector3(1.0, -0.36, -0.1),
    new THREE.Vector3(0.08, -0.88, 0.2),
    new THREE.Vector3(-0.9, -0.42, -0.12),
    new THREE.Vector3(0.05, 0.02, 0.05),
  ];
  const nodeMat = metal(0x4a4030, 0.26, 0.9);
  const linkMat = glow(OLD_GOLD, 0.25);
  points.forEach((p, index) => {
    const node = new THREE.Mesh(new THREE.SphereGeometry(index === 6 ? 0.2 : 0.13, 12, 8), nodeMat);
    node.position.copy(p);
    g.add(node);
    movers.push(node);
  });
  const links: Array<[number, number]> = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,6],[2,6],[4,6]];
  links.forEach(([a, b]) => g.add(cylinderBetween(points[a], points[b], 0.009, linkMat.clone())));
  addArchiveFrame(g, 1.72);
  return { group: g, movers };
}

export function createArtifactSpecimens(world: THREE.Group) {
  const artifactZ = [-25.5, -29.8, -34.1, -38.2];
  const factories = [makeWozai, makeAgentJam, makePandaAI, makeLiveLink];
  const artifactObjects: THREE.Group[] = [];
  const artifactLights: THREE.PointLight[] = [];
  const movers: THREE.Object3D[][] = [];
  const homePositions: THREE.Vector3[] = [];
  const birthPositions: THREE.Vector3[] = [];

  factories.forEach((factory, index) => {
    const specimen = factory();
    const g = specimen.group;
    const home = new THREE.Vector3(
      index % 2 === 0 ? 2.42 : -2.35,
      index % 3 === 0 ? 0.52 : -0.22,
      artifactZ[index],
    );
    const birth = new THREE.Vector3(
      0.5 + (index - 1.5) * 0.12,
      0.02 + ((index % 2) * 2 - 1) * 0.09,
      -19.1 - index * 0.28,
    );
    g.position.copy(birth);
    g.rotation.z = index % 2 === 0 ? 0.06 : -0.06;
    g.scale.setScalar(0.001);

    const light = new THREE.PointLight(index === 0 ? 0xb99a67 : 0x9b7747, 0, 8.2, 2.2);
    light.position.set(index % 2 === 0 ? 1.25 : -1.2, 1.1, 1.2);
    g.add(light);

    world.add(g);
    artifactObjects.push(g);
    artifactLights.push(light);
    movers.push(specimen.movers);
    homePositions.push(home);
    birthPositions.push(birth);
  });

  const update = (
    time: number,
    cameraZ: number,
    mouseX: number,
    mouseY: number,
    focusedIndex: number,
    storyProgress?: number,
  ) => {
    const morph = storyProgress === undefined
      ? smoothstep(18.5, 31.5, -cameraZ)
      : smoothstep(0.535, 0.705, storyProgress);
    const handoffPulse = Math.sin(morph * Math.PI);
    const visible = storyProgress === undefined
      ? -cameraZ > 17 && -cameraZ < 45.5
      : storyProgress > 0.5 && storyProgress < 0.865;

    artifactObjects.forEach((obj, index) => {
      obj.visible = visible;

      const home = homePositions[index];
      const birth = birthPositions[index];
      const side = index % 2 === 0 ? 1 : -1;
      obj.position.set(
        lerp(birth.x, home.x, morph) + side * handoffPulse * (0.28 + index * 0.055),
        lerp(birth.y, home.y, morph) + handoffPulse * ((index % 3) - 1) * 0.22,
        lerp(birth.z, home.z, morph) - handoffPulse * (0.34 + index * 0.12),
      );

      const distance = Math.abs(cameraZ - artifactZ[index]);
      const cameraFocus = Math.max(0, 1 - distance / 8.4);
      const hoverFocus = focusedIndex === index ? 1 : 0;

      obj.rotation.x =
        index * 0.12 +
        Math.sin(time * (0.32 + index * 0.04)) * 0.045 +
        hoverFocus * mouseY * 0.08 +
        (1 - morph) * side * 0.34;
      obj.rotation.y =
        time * (0.055 + index * 0.011) -
        index * 0.28 +
        hoverFocus * mouseX * 0.16 +
        (1 - morph) * (index - 1.5) * 0.42;
      obj.rotation.z = side * (0.06 + (1 - morph) * 0.22);

      const settledScale = 0.76 + cameraFocus * 0.38 + hoverFocus * 0.16;
      const birthScale = 0.08 + morph * 0.92;
      const handoffScale = 1 + handoffPulse * 0.1;
      obj.scale.setScalar(settledScale * birthScale * handoffScale);
      artifactLights[index].intensity =
        morph * (0.35 + cameraFocus * 3.6 + hoverFocus * 3.2 + handoffPulse * 1.4);

      movers[index].forEach((mover, moverIndex) => {
        mover.rotation.y += (0.0012 + handoffPulse * 0.0018) * (moverIndex % 2 === 0 ? 1 : -1);
        mover.rotation.x += handoffPulse * 0.0007 * (index % 2 === 0 ? 1 : -1);
      });
    });
  };

  return { artifactZ, artifactObjects, artifactLights, update };
}
