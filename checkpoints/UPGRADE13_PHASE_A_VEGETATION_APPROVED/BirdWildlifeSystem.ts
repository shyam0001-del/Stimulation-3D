import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { EnvironmentalWind } from './EnvironmentalWind';

export type PigeonLifecycleState =
  | 'FLYING'
  | 'APPROACHING_BRANCH'
  | 'LANDING'
  | 'PERCHED'
  | 'TAKING_OFF';

export type EagleLifecycleState =
  | 'SOARING'
  | 'DEPARTING'
  | 'ROOSTED_OFF_CAMPUS'
  | 'ARRIVING';

export interface WildlifeSolarState {
  solarElevationDeg: number;
  minutesSinceMidnight: number;
  sunriseMinutes: number;
  sunsetMinutes: number;
  simulatedEpochMs?: number;
  isTimeJump?: boolean;
}

export interface PigeonAnimatedMetrics {
  normScale: number;
  glidingWingspanMeters: number;
  glidingLengthMeters: number;
  standingBodyLengthMeters: number;
  standingFeetLocalY: number;
  flappingSpanRangeMeters: [number, number];
  triangles: number;
  meshes: number;
}

export interface PigeonAgent {
  id: number;
  name: string;
  zoneTag: string;
  pivot: THREE.Group;
  model: THREE.Group;
  mixer: THREE.AnimationMixer;
  flapAction: THREE.AnimationAction;
  glideAction: THREE.AnimationAction;
  landingAction: THREE.AnimationAction;
  idleAction: THREE.AnimationAction;
  takeoffAction: THREE.AnimationAction;
  activeAction: THREE.AnimationAction;

  routeIndex: number;
  flockGroupId: number;
  canPerch: boolean;

  lifecycle: PigeonLifecycleState;
  flightSubState: 'FLAP_BURST' | 'GLIDE';
  subStateTimer: number;
  perchCooldown: number;
  lifecycleTimer: number;
  lifecycleDuration: number;

  position: THREE.Vector3;
  velocity: THREE.Vector3;
  heading: THREE.Vector3;
  splineProgress: number;
  speed: number;
  currentYaw: number;
  currentPitch: number;
  currentBank: number;
  wingspanMeters: number;
  bodyLengthMeters: number;

  // Branch landing / perching state
  targetPerch: TreePerchSpot | null;
  landingStartPos: THREE.Vector3;
  landingStartYaw: number;
  perchedLookYaw: number;
  perchLookTimer: number;
  takeoffDir: THREE.Vector3;

  // Distance LOD accumulator
  lodAccumDt: number;
  lodFrameOffset: number;
  visible: boolean;

  // Phase E: Circadian solar-elevation thresholds (staggered per bird)
  wakeElevationDeg: number;
  roostElevationDeg: number;
  wakeDelayTimer: number;
  wasShouldRoost: boolean;
  isNightRoostReturn: boolean;
}

export interface EagleAgent {
  id: number;
  name: string;
  pivot: THREE.Group;
  model: THREE.Group;
  mixer: THREE.AnimationMixer;
  action: THREE.AnimationAction;
  position: THREE.Vector3;
  heading: THREE.Vector3;
  splineProgress: number;
  speed: number;
  lifecycle: EagleLifecycleState;
  flightSubState: 'FLAP_BURST' | 'SOARING_GLIDE';
  subStateTimer: number;
  currentYaw: number;
  currentPitch: number;
  currentBank: number;
  wingspanMeters: number;
  lodAccumDt: number;
  visible: boolean;
  wakeElevationDeg: number;
  roostElevationDeg: number;
  wasActive: boolean;
}

interface ObstacleBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

interface TreeObstacle {
  x: number;
  z: number;
  variant: 1 | 2;
  scale: number;
  rotationY: number;
  canopyRadius: number;
  topY: number;
}

export interface TreePerchSpot {
  id: number;
  treeX: number;
  treeZ: number;
  treeScale: number;
  treeRotationY: number;
  localPosition: THREE.Vector3;
  basePosition: THREE.Vector3;
  position: THREE.Vector3;
  outwardYaw: number;
  zoneTag: string;
  claimedBy: number | null;
}

/**
 * BirdWildlifeSystem — Upgrade 10B (Living Campus with up to 10 Realistic Birds)
 *
 * Composition (10 birds total):
 *  - 9 realistic Rock Pigeons (animated_bird_pigeon.glb, 710 tris each) sharing GPU
 *    geometry, texture, and material, distributed across campus zones in small flocks
 *    and solitary flights with full branch landing / perching / idle / takeoff lifecycle.
 *  - 1 realistic soaring Eagle (animated_eagle.glb, 3,858 tris) at high thermal altitude
 *    (~27-38 m) spanning Main Entrance, CVR Park, CSE, Main Block, and PG Block.
 *
 * Evaluated & Rejected:
 *  - animated_parrot.glb omitted due to stylized cartoon proportions, 39,340 tris x 3
 *    (118k tris) & 713 bones x 3 CPU footprint; slots replaced cleanly by +3 pigeons.
 *  - phoenix_bird.glb remains permanently disabled.
 */
export class BirdWildlifeSystem {
  private scene: THREE.Scene;
  private loader: GLTFLoader;
  public isLoaded = false;
  private time = 0;
  private frameIndex = 0;
  private targetPopulation: 0 | 6 | 10 = 10;
  private solarState: WildlifeSolarState = {
    solarElevationDeg: 25,
    minutesSinceMidnight: 720,
    sunriseMinutes: 385,
    sunsetMinutes: 1059,
  };
  private readonly eagleSanctuaryPos = new THREE.Vector3(315, 58, 255);

  public pigeons: PigeonAgent[] = [];
  public eagles: EagleAgent[] = [];
  private patrolRoutes: { curve: THREE.CatmullRomCurve3; length: number; zoneTag: string }[] = [];
  private eagleRoute!: { curve: THREE.CatmullRomCurve3; length: number };
  private perchSpots: TreePerchSpot[] = [];

  private animatedMetrics: PigeonAnimatedMetrics | null = null;
  private standingFeetLocalY = -0.14;
  private pigeonNormScale = 0.14177;
  private sharedPigeonMaterials: THREE.Material[] = [];
  private sharedPigeonGeometries: THREE.BufferGeometry[] = [];
  private sharedEagleMaterials: THREE.Material[] = [];
  private sharedEagleGeometries: THREE.BufferGeometry[] = [];

  // CPU animation processing cost telemetry (ms)
  private lastUpdateCpuMs = 0;
  private totalUpdateCpuMs = 0;
  private updateSamplesCount = 0;

  // Campus buildings, entrance structures & parked bus bay to avoid
  private readonly buildingObstacles: ObstacleBox[] = [
    // Main Entrance Gate portal + 3D lettering + pillars
    { minX: 16.5, maxX: 33.5, minY: 0, maxY: 9.2, minZ: -173.4, maxZ: -170.6 },
    // Sandstone Emblem Monument + Security Cabin + Bus Exit Gate
    { minX: -8.2, maxX: 16.8, minY: 0, maxY: 7.6, minZ: -175.6, maxZ: -170.2 },
    // Main Block + East Portico
    { minX: -35.0, maxX: 11.0, minY: 0, maxY: 17.8, minZ: -104.0, maxZ: -46.0 },
    { minX: 10.0, maxX: 19.0, minY: 0, maxY: 10.2, minZ: -86.0, maxZ: -64.0 },
    // PG Block & First Year Block
    { minX: -87.0, maxX: -43.0, minY: 0, maxY: 17.4, minZ: -104.0, maxZ: -46.0 },
    { minX: -87.0, maxX: -43.0, minY: 0, maxY: 17.4, minZ: -33.5, maxZ: 13.5 },
    // Central Library & Student Service Block
    { minX: -34.0, maxX: 10.0, minY: 0, maxY: 13.4, minZ: -35.0, maxZ: -11.5 },
    { minX: -27.0, maxX: 11.0, minY: 0, maxY: 10.0, minZ: -3.5, maxZ: 17.5 },
    // CSE Building
    { minX: 33.0, maxX: 119.0, minY: 0, maxY: 17.4, minZ: -33.0, maxZ: -13.5 },
    // High-Tension Steel Lattice Tower
    { minX: 133.0, maxX: 151.0, minY: 0, maxY: 37.5, minZ: -171.0, maxZ: -153.0 },
    // 60 Parked College Buses in North Bus Bay (up to ~3.4m tall)
    { minX: 35.0, maxX: 118.0, minY: 0, maxY: 4.5, minZ: -164.0, maxZ: -119.0 },
  ];

  // Exact hero tree placements from CVRCampusMap.ts build12MSpineTrees()
  private readonly heroTrees: TreeObstacle[] = [
    // Entrance Gate Backdrop Canopy
    ...([
      [25.0, -169.5, 1, 1.30, 0.80], [25.0, -163.0, 2, 1.25, 2.50], [17.0, -170.0, 2, 1.32, 1.40],
      [17.0, -163.5, 1, 1.26, 3.80], [17.0, -157.0, 2, 1.20, 0.90], [12.5, -169.5, 1, 1.35, 4.10],
      [8.5, -169.0, 2, 1.28, 2.20], [33.0, -170.0, 1, 1.32, 5.20], [33.0, -163.5, 2, 1.26, 1.90],
      [33.0, -157.0, 1, 1.20, 4.30], [38.0, -169.5, 2, 1.32, 3.10],
    ] as [number, number, 1 | 2, number, number][]).map(([x, z, v, s, r]) => ({
      x, z, variant: v, scale: s, rotationY: r, canopyRadius: 3.1 * s, topY: 9.1 * s,
    })),
    // 12M Spine Avenue Divider & Flank Trees (including CVR Park perimeter)
    ...([
      [25.0, -166.0, 1, 1.06, 0.40], [25.0, -158.0, 2, 1.08, 2.10], [25.0, -150.0, 1, 1.05, 3.40],
      [25.0, -128.0, 1, 1.07, 4.80], [25.0, -120.0, 2, 1.00, 1.20], [25.0, -110.0, 1, 1.15, 3.14],
      [25.0, -100.0, 1, 1.06, 1.70], [25.0, -94.0, 2, 0.98, 3.90], [25.0, -88.0, 1, 1.07, 0.30],
      [25.0, -82.0, 1, 1.05, 2.90], [25.0, -76.0, 2, 1.00, 5.10], [25.0, -70.0, 1, 1.06, 1.80],
      [25.0, -64.0, 1, 1.07, 4.00], [25.0, -58.0, 2, 0.99, 0.60], [25.0, -52.0, 1, 1.05, 2.80],
      [25.0, -46.0, 1, 1.04, 5.00],
      [17.0, -152.0, 1, 1.06, 1.10], [17.0, -144.0, 1, 1.05, 3.30], [17.0, -136.0, 2, 0.99, 5.50],
      [17.0, -128.0, 1, 1.07, 1.80], [17.0, -120.0, 1, 1.05, 4.00],
      [17.4, -100.0, 1, 1.05, 2.40], [17.4, -92.0, 1, 1.06, 4.60], [17.4, -84.0, 2, 0.99, 0.90],
      [17.4, -76.0, 1, 1.05, 3.10], [17.4, -68.0, 1, 1.07, 5.30], [17.4, -60.0, 2, 1.00, 1.50],
      [17.4, -52.0, 1, 1.06, 3.70], [17.4, -46.0, 1, 1.04, 5.90],
      [32.6, -154.0, 1, 1.06, 4.20], [32.6, -148.0, 1, 1.04, 0.40],
      [32.6, -128.0, 2, 0.99, 2.60], [32.6, -120.0, 1, 1.05, 4.80],
      [32.6, -100.0, 1, 1.05, 5.40], [32.6, -92.0, 1, 1.06, 1.60], [32.6, -84.0, 2, 0.98, 3.80],
      [32.6, -76.0, 1, 1.05, 6.00], [32.6, -68.0, 1, 1.07, 1.90], [32.6, -60.0, 2, 1.00, 0.30],
      [32.6, -52.0, 1, 1.06, 2.50], [32.6, -46.0, 1, 1.04, 4.70],
    ] as [number, number, 1 | 2, number, number][]).map(([x, z, v, s, r]) => ({
      x, z, variant: v, scale: s, rotationY: r, canopyRadius: 2.9 * s, topY: 9.0 * s,
    })),
  ];

  // Exposed upper-outer tree vertices measured directly from tree_variant_1.glb & tree_variant_2.glb
  private readonly tree1LocalPerches: [number, number, number][] = [
    [2.153, 5.983, -0.508],
    [0.213, 5.712, 1.150],
    [-1.637, 5.037, 0.774],
    [0.263, 7.491, 1.011],
  ];
  private readonly tree2LocalPerches: [number, number, number][] = [
    [1.489, 4.368, 0.492],
    [0.998, 6.284, -0.733],
    [-0.977, 5.538, 1.256],
    [0.008, 5.596, 2.185],
  ];

  // Reusable scratch vectors (zero per-frame heap churn)
  private readonly tmpTarget = new THREE.Vector3();
  private readonly tmpAhead = new THREE.Vector3();
  private readonly tmpSteer = new THREE.Vector3();
  private readonly tmpDesiredDir = new THREE.Vector3();
  private readonly tmpVec = new THREE.Vector3();
  private readonly tmpCamPos = new THREE.Vector3();

  constructor(scene: THREE.Scene, initialSolarState?: WildlifeSolarState) {
    this.scene = scene;
    if (initialSolarState) {
      this.solarState = { ...initialSolarState };
    }
    this.loader = new GLTFLoader();
    this.buildFlightRoutes();
    this.buildTreePerchSpots();
    this.initWildlife();
  }

  private buildFlightRoutes(): void {
    const makeRoute = (pts: [number, number, number][], zoneTag: string) => {
      const curve = new THREE.CatmullRomCurve3(
        pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
        true,
        'catmullrom',
        0.5
      );
      return { curve, length: curve.getLength(), zoneTag };
    };

    // Route 0: Main Entrance Gate <-> 12M Spine Avenue (Flock of 3)
    this.patrolRoutes.push(
      makeRoute(
        [
          [24.0, 11.4, -196.0],
          [29.0, 13.6, -173.0],
          [40.0, 11.5, -158.0],
          [26.5, 13.8, -142.0],
          [24.5, 13.8, -108.0],
          [22.5, 13.4, -74.0],
          [19.5, 13.2, -112.0],
          [18.5, 13.4, -154.0],
          [18.0, 12.6, -180.0],
        ],
        'Entrance & 12M Avenue'
      )
    );

    // Route 1: Bus Parking Ground & East Lawn Low Flyby (Pair of 2)
    this.patrolRoutes.push(
      makeRoute(
        [
          [42.0, 9.8, -172.0],
          [68.0, 7.6, -158.0],
          [94.0, 8.2, -138.0],
          [74.0, 7.2, -114.0],
          [46.0, 7.8, -124.0],
          [38.5, 9.6, -148.0],
        ],
        'Bus Bay & East Forecourt'
      )
    );

    // Route 2: CVR Park Lawn & Main Block Portico Sweep (Pair of 2)
    this.patrolRoutes.push(
      makeRoute(
        [
          [52.0, 7.8, -98.0],
          [86.0, 8.6, -86.0],
          [98.0, 9.4, -56.0],
          [66.0, 7.4, -48.0],
          [34.0, 11.8, -56.0],
          [23.5, 13.6, -78.0],
          [38.0, 11.2, -102.0],
        ],
        'CVR Park & Main Block'
      )
    );

    // Route 3: PG Block & West Precinct Loop (strictly along open roadways & above rooftops)
    this.patrolRoutes.push(
      makeRoute(
        [
          [-39.0, 12.6, -96.0],  // Open 12m Divider Road between PG Block (x=-43) and Main Block (x=-35)
          [-39.0, 13.0, -116.0], // PG Block North Access Road (z=-110)
          [-4.0, 10.2, -138.0],  // Open Bus Egress Corridor
          [14.0, 12.8, -180.0],  // West Forecourt North of Pedestrian Gate
          [-16.0, 11.4, -148.0], // Open lawn West of Main Gate / North of Main Block
          [-39.0, 14.2, -112.0], // West Divider entry
          [-39.0, 13.8, -56.0],  // Divider Road West of Main Block
          [-26.0, 11.8, -40.0],  // Open 9m South Cross-Road between Main Block (z=-46) and Library (z=-35)
        ],
        'PG Block & West Avenue'
      )
    );

    // Eagle Route: Wide High Thermal Soaring Loop over entire Campus
    const eagleCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(24.0, 31.0, -182.0),
        new THREE.Vector3(78.0, 33.5, -145.0),
        new THREE.Vector3(96.0, 35.0, -76.0),
        new THREE.Vector3(36.0, 34.0, -34.0),
        new THREE.Vector3(-42.0, 35.5, -56.0),
        new THREE.Vector3(-56.0, 33.0, -118.0),
        new THREE.Vector3(-8.0, 30.5, -162.0),
      ],
      true,
      'catmullrom',
      0.5
    );
    this.eagleRoute = { curve: eagleCurve, length: eagleCurve.getLength() };
  }

  private buildTreePerchSpots(): void {
    // Showcase trees along Main Gate Avenue, Central Divider, Bus Bay Corner, and CVR Park Perimeter
    const perchCandidates: { treeX: number; treeZ: number; zoneTag: string; localIdx: number }[] = [
      { treeX: 17.0, treeZ: -152.0, zoneTag: 'West Entrance Avenue', localIdx: 0 },
      { treeX: 32.6, treeZ: -154.0, zoneTag: 'East Entrance / Bus Bay Corner', localIdx: 2 },
      { treeX: 25.0, treeZ: -150.0, zoneTag: '12M Avenue Divider', localIdx: 1 },
      { treeX: 25.0, treeZ: -120.0, zoneTag: 'Inner Avenue Divider', localIdx: 0 },
      { treeX: 32.6, treeZ: -100.0, zoneTag: 'CVR Park Entrance', localIdx: 1 },
      { treeX: 32.6, treeZ: -76.0, zoneTag: 'CVR Park Perimeter', localIdx: 0 },
      { treeX: 17.4, treeZ: -84.0, zoneTag: 'Main Block Portico Tree', localIdx: 2 },
      { treeX: 25.0, treeZ: -110.0, zoneTag: 'Roundabout Island Tree', localIdx: 1 },
      { treeX: 32.6, treeZ: -128.0, zoneTag: 'Bus Bay Avenue Tree', localIdx: 0 },
      { treeX: 17.0, treeZ: -136.0, zoneTag: 'West Avenue Mid Tree', localIdx: 3 },
    ];

    let spotId = 0;
    const tmp = new THREE.Vector3();
    for (const cand of perchCandidates) {
      const tree = this.heroTrees.find((t) => Math.abs(t.x - cand.treeX) < 0.2 && Math.abs(t.z - cand.treeZ) < 0.2);
      if (!tree) continue;
      const locals = tree.variant === 1 ? this.tree1LocalPerches : this.tree2LocalPerches;
      const lp = locals[cand.localIdx % locals.length];
      tmp.set(lp[0], lp[1], lp[2]);
      tmp.multiplyScalar(tree.scale);
      tmp.applyAxisAngle(new THREE.Vector3(0, 1, 0), tree.rotationY);
      tmp.x += tree.x;
      tmp.z += tree.z;

      const outwardYaw = Math.atan2(tmp.x - tree.x, tmp.z - tree.z);
      this.perchSpots.push({
        id: spotId++,
        treeX: tree.x,
        treeZ: tree.z,
        treeScale: tree.scale,
        treeRotationY: tree.rotationY,
        localPosition: new THREE.Vector3(lp[0], lp[1], lp[2]),
        basePosition: tmp.clone(),
        position: tmp.clone(),
        outwardYaw,
        zoneTag: cand.zoneTag,
        claimedBy: null,
      });
    }
  }

  private async initWildlife(): Promise<void> {
    this.pigeons = [];
    this.eagles = [];

    await Promise.all([this.loadPigeonFlock(), this.loadSoaringEagle()]);
    this.applyPopulationMask();
    this.isLoaded = true;
  }

  private measureAnimatedWorldSize(root: THREE.Object3D): THREE.Box3 {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    const v = new THREE.Vector3();

    root.traverse((obj) => {
      const mesh = obj as THREE.SkinnedMesh;
      if (mesh.isMesh && mesh.geometry?.attributes?.position) {
        if (mesh.isSkinnedMesh && mesh.skeleton) {
          mesh.skeleton.update();
        }
        const posAttr = mesh.geometry.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
          if (mesh.isSkinnedMesh && typeof mesh.getVertexPosition === 'function') {
            mesh.getVertexPosition(i, v);
          } else {
            v.fromBufferAttribute(posAttr, i);
          }
          v.applyMatrix4(mesh.matrixWorld);
          box.expandByPoint(v);
        }
      }
    });
    return box;
  }

  private async loadPigeonFlock(): Promise<void> {
    try {
      const gltf = await new Promise<any>((resolve, reject) => {
        this.loader.load('/models/birds/animated_bird_pigeon.glb', resolve, undefined, reject);
      });

      const templateScene = gltf.scene as THREE.Group;
      const clips = (gltf.animations || []) as THREE.AnimationClip[];

      let meshes = 0;
      let triangles = 0;
      templateScene.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          meshes++;
          const mesh = node as THREE.Mesh;
          const geom = mesh.geometry;
          triangles += geom.index ? Math.round(geom.index.count / 3) : Math.round(geom.attributes.position.count / 3);
          mesh.castShadow = true;
          mesh.receiveShadow = false;
          mesh.frustumCulled = false;
          this.sharedPigeonGeometries.push(geom);

          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat) {
            mat.roughness = 0.78;
            mat.metalness = 0.0;
            if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
            mat.needsUpdate = true;
            this.sharedPigeonMaterials.push(mat);
          }
        }
      });

      const flapClip = clips.find((c) => c.name === 'BirdRig|Flapping') || clips[0];
      const glideClip = clips.find((c) => c.name === 'BirdRig|Gliding') || clips[1] || flapClip;
      const landingClip = clips.find((c) => c.name === 'BirdRig|Landing') || flapClip;
      const idleClip = clips.find((c) => c.name === 'BirdRig|Standing Idle') || glideClip;
      const takeoffClip = clips.find((c) => c.name === 'BirdRig|Takeoff') || flapClip;

      // Measure raw animated gliding wingspan and normalize dynamically to 62.0 cm
      const measureMixer = new THREE.AnimationMixer(templateScene);
      measureMixer.clipAction(glideClip).play();
      let maxRawWingspan = 0;
      for (const frac of [0.0, 0.25, 0.5, 0.75]) {
        measureMixer.setTime(glideClip.duration * frac);
        const sz = this.measureAnimatedWorldSize(templateScene).getSize(new THREE.Vector3());
        if (sz.x > maxRawWingspan) maxRawWingspan = sz.x;
      }
      measureMixer.stopAllAction();

      const normScale = 0.62 / Math.max(maxRawWingspan, 0.001);
      this.pigeonNormScale = normScale;
      templateScene.scale.multiplyScalar(normScale);

      // Verify post-scale metrics
      measureMixer.clipAction(idleClip).play();
      measureMixer.setTime(idleClip.duration * 0.25);
      const idleBox = this.measureAnimatedWorldSize(templateScene);
      const idleSize = idleBox.getSize(new THREE.Vector3());
      this.standingFeetLocalY = idleBox.min.y; // ~ -0.140m
      measureMixer.stopAllAction();

      measureMixer.clipAction(glideClip).play();
      measureMixer.setTime(glideClip.duration * 0.25);
      const glideSize = this.measureAnimatedWorldSize(templateScene).getSize(new THREE.Vector3());
      measureMixer.stopAllAction();

      measureMixer.clipAction(flapClip).play();
      measureMixer.setTime(0);
      const flapMinX = this.measureAnimatedWorldSize(templateScene).getSize(new THREE.Vector3()).x;
      measureMixer.setTime(flapClip.duration * 0.25);
      const flapMaxX = this.measureAnimatedWorldSize(templateScene).getSize(new THREE.Vector3()).x;
      measureMixer.stopAllAction();

      this.animatedMetrics = {
        normScale: Number(normScale.toFixed(5)),
        glidingWingspanMeters: Number(glideSize.x.toFixed(4)),
        glidingLengthMeters: Number(glideSize.z.toFixed(4)),
        standingBodyLengthMeters: Number(idleSize.z.toFixed(4)),
        standingFeetLocalY: Number(this.standingFeetLocalY.toFixed(4)),
        flappingSpanRangeMeters: [Number(flapMinX.toFixed(4)), Number(flapMaxX.toFixed(4))],
        triangles,
        meshes,
      };

      // 9 Realistic Pigeons distributed across CVR Campus
      const configs: {
        routeIndex: number;
        flockGroupId: number;
        startProgress: number;
        startPerchedSpotIdx?: number;
        canPerch: boolean;
      }[] = [
          // Flock 1 (3 birds): Entrance Forecourt & 12M Spine Avenue
          { routeIndex: 0, flockGroupId: 1, startProgress: 0.02, canPerch: true },
          { routeIndex: 0, flockGroupId: 1, startProgress: 0.035, canPerch: true },
          { routeIndex: 0, flockGroupId: 1, startProgress: 0.12, startPerchedSpotIdx: 0, canPerch: true }, // Starts perched on Entrance Avenue tree
          // Flock 2 (2 birds): Bus Parking Bay & East Lawn
          { routeIndex: 1, flockGroupId: 2, startProgress: 0.15, canPerch: true },
          { routeIndex: 1, flockGroupId: 2, startProgress: 0.17, startPerchedSpotIdx: 1, canPerch: true }, // Starts perched on Bus Bay Corner tree
          // Pair 3 (2 birds): CVR Park & Main Block
          { routeIndex: 2, flockGroupId: 3, startProgress: 0.35, canPerch: true },
          { routeIndex: 2, flockGroupId: 3, startProgress: 0.55, startPerchedSpotIdx: 4, canPerch: true }, // Starts perched on CVR Park entrance tree
          // Pair 4 (2 birds): PG Block & West Campus Precinct
          { routeIndex: 3, flockGroupId: 4, startProgress: 0.22, canPerch: false },
          { routeIndex: 3, flockGroupId: 4, startProgress: 0.68, canPerch: false },
        ];

      // Organic non-monotonic solar elevation thresholds per bird so dusk & dawn transitions stagger naturally
      const wakeThresholds = [-1.4, 3.8, 0.9, 6.1, -0.3, 4.9, 2.2, 7.2, 1.5];
      const roostThresholds = [6.4, 2.1, 4.8, 0.8, 5.6, 1.5, 7.4, 3.1, 4.0];

      configs.forEach((cfg, idx) => {
        // SkeletonUtils.clone creates an independent skeleton while sharing geometry & Material.002!
        const model = SkeletonUtils.clone(templateScene) as THREE.Group;
        const pivot = new THREE.Group();
        pivot.name = `CVR_Pigeon_${String(idx + 1).padStart(2, '0')}`;
        pivot.rotation.order = 'YXZ';
        pivot.add(model);

        const mixer = new THREE.AnimationMixer(model);
        const flapAction = mixer.clipAction(flapClip);
        flapAction.setLoop(THREE.LoopRepeat, Infinity);
        flapAction.timeScale = 0.98 + (idx % 4) * 0.045;

        const glideAction = mixer.clipAction(glideClip);
        glideAction.setLoop(THREE.LoopRepeat, Infinity);

        const landingAction = mixer.clipAction(landingClip);
        landingAction.setLoop(THREE.LoopOnce, 1);
        landingAction.clampWhenFinished = true;

        const idleAction = mixer.clipAction(idleClip);
        idleAction.setLoop(THREE.LoopRepeat, Infinity);
        idleAction.timeScale = 0.9 + (idx % 3) * 0.08;

        const takeoffAction = mixer.clipAction(takeoffClip);
        takeoffAction.setLoop(THREE.LoopOnce, 1);
        takeoffAction.clampWhenFinished = true;

        const wakeElev = wakeThresholds[idx] + (Math.random() - 0.5) * 0.45;
        const roostElev = roostThresholds[idx] + (Math.random() - 0.5) * 0.4;
        const startShouldRoost = this.isSolarRoostTime(wakeElev, roostElev);

        const route = this.patrolRoutes[cfg.routeIndex];
        let startPos = route.curve.getPointAt(cfg.startProgress);
        const startTangent = route.curve.getTangentAt(cfg.startProgress).normalize();
        let initYaw = Math.atan2(startTangent.x, startTangent.z);
        let initLifecycle: PigeonLifecycleState = 'FLYING';
        let activeAction = idx % 3 === 1 ? glideAction : flapAction;
        let targetPerch: TreePerchSpot | null = null;
        let initSpeed = 9.5 + (idx % 3) * 0.4;
        let lifecycleTimer = 0;
        let lifecycleDuration = 0;

        // Lateral flock stagger offset so flockmates aren't stacked
        startPos.x += Math.sin(idx * 2.1) * 1.6;
        startPos.y += (idx % 2 === 0 ? 0.5 : -0.4);

        // If initial IST time is night/early dawn, spawn directly roosting cleanly on unique branches (no popping)
        const nightSpotIdx = idx === 4 ? 5 : idx === 5 ? 4 : idx;
        const chosenSpotIdx = startShouldRoost ? nightSpotIdx : cfg.startPerchedSpotIdx;

        if (chosenSpotIdx !== undefined && this.perchSpots[chosenSpotIdx]) {
          targetPerch = this.perchSpots[chosenSpotIdx];
          targetPerch.claimedBy = idx;
          startPos = targetPerch.position.clone();
          startPos.y -= this.standingFeetLocalY;
          initYaw = targetPerch.outwardYaw;
          initLifecycle = 'PERCHED';
          activeAction = idleAction;
          initSpeed = 0;
          lifecycleDuration = 6.0 + idx * 1.4;
          lifecycleTimer = lifecycleDuration;
        }

        activeAction.reset();
        activeAction.time = (activeAction.getClip().duration * ((idx * 0.31) % 1.0));
        activeAction.play();

        pivot.position.copy(startPos);
        pivot.rotation.set(0, initYaw, 0, 'YXZ');
        this.scene.add(pivot);

        this.pigeons.push({
          id: idx,
          name: pivot.name,
          zoneTag: route.zoneTag,
          pivot,
          model,
          mixer,
          flapAction,
          glideAction,
          landingAction,
          idleAction,
          takeoffAction,
          activeAction,
          routeIndex: cfg.routeIndex,
          flockGroupId: cfg.flockGroupId,
          canPerch: cfg.canPerch,
          lifecycle: initLifecycle,
          flightSubState: idx % 3 === 1 ? 'GLIDE' : 'FLAP_BURST',
          subStateTimer: 1.5 + (idx % 4) * 0.7,
          perchCooldown: startShouldRoost ? 0.8 : 8.0 + idx * 3.5,
          lifecycleTimer,
          lifecycleDuration,
          position: startPos.clone(),
          velocity: startTangent.clone().multiplyScalar(initSpeed),
          heading: startTangent.clone(),
          splineProgress: cfg.startProgress,
          speed: initSpeed,
          currentYaw: initYaw,
          currentPitch: 0,
          currentBank: 0,
          wingspanMeters: Number(glideSize.x.toFixed(3)),
          bodyLengthMeters: Number(idleSize.z.toFixed(3)),
          targetPerch,
          landingStartPos: new THREE.Vector3(),
          landingStartYaw: initYaw,
          perchedLookYaw: initYaw,
          perchLookTimer: 2.0 + (idx % 3),
          takeoffDir: new THREE.Vector3(Math.sin(initYaw), 0.35, Math.cos(initYaw)).normalize(),
          lodAccumDt: 0,
          lodFrameOffset: idx,
          visible: true,
          wakeElevationDeg: wakeElev,
          roostElevationDeg: roostElev,
          wakeDelayTimer: 0,
          wasShouldRoost: startShouldRoost,
          isNightRoostReturn: startShouldRoost,
        });
      });
    } catch (err) {
      console.warn('Failed to load pigeon flock:', err);
    }
  }

  private async loadSoaringEagle(): Promise<void> {
    try {
      const gltf = await new Promise<any>((resolve, reject) => {
        this.loader.load('/models/birds/animated_eagle.glb', resolve, undefined, reject);
      });

      const model = gltf.scene as THREE.Group;
      const clips = (gltf.animations || []) as THREE.AnimationClip[];
      const clip = clips[0];

      // Convert alphaMode BLEND to crisp feather alphaTest cutout so feathers never show depth holes
      model.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          const mesh = node as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = false;
          mesh.frustumCulled = false;
          this.sharedEagleGeometries.push(mesh.geometry);
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat) {
            mat.transparent = false;
            mat.alphaTest = 0.42;
            mat.depthWrite = true;
            mat.roughness = 0.85;
            mat.metalness = 0.0;
            if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
            mat.needsUpdate = true;
            this.sharedEagleMaterials.push(mat);
          }
        }
      });

      const mixer = new THREE.AnimationMixer(model);
      const action = clip ? mixer.clipAction(clip) : ({} as THREE.AnimationAction);
      if (clip) {
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.play();
        mixer.setTime(clip.duration * 0.3);
      }

      // Measure actual animated dimensions & offset pivot center (raw center sits near [-100, 102, 92])
      const rawBox = this.measureAnimatedWorldSize(model);
      const rawSize = rawBox.getSize(new THREE.Vector3());
      const rawCenter = rawBox.getCenter(new THREE.Vector3());
      const targetWingspan = 1.85; // Authentic large soaring raptor wingspan (1.85m)
      const normScale = targetWingspan / Math.max(rawSize.x, 1.0);

      model.scale.multiplyScalar(normScale);
      model.position.set(
        -rawCenter.x * normScale,
        -rawCenter.y * normScale,
        -rawCenter.z * normScale
      );

      const pivot = new THREE.Group();
      pivot.name = 'CVR_Eagle_01';
      pivot.rotation.order = 'YXZ';
      pivot.add(model);

      const startPos = this.eagleRoute.curve.getPointAt(0.05);
      const startTang = this.eagleRoute.curve.getTangentAt(0.05).normalize();
      const initYaw = Math.atan2(startTang.x, startTang.z);

      pivot.position.copy(startPos);
      pivot.rotation.set(0, initYaw, 0, 'YXZ');
      this.scene.add(pivot);

      if (clip) {
        action.timeScale = 0.25; // Start in calm thermal soaring glide
      }

      const wakeElev = 3.8;
      const roostElev = 2.4;
      const startActive = !this.isSolarRoostTime(wakeElev, roostElev);
      const spawnPos = startActive ? startPos.clone() : this.eagleSanctuaryPos.clone();
      const spawnHeading = startActive
        ? startTang.clone()
        : startPos.clone().sub(this.eagleSanctuaryPos).normalize();
      const spawnYaw = Math.atan2(spawnHeading.x, spawnHeading.z);

      pivot.position.copy(spawnPos);
      pivot.rotation.set(0, spawnYaw, 0, 'YXZ');
      pivot.visible = startActive;

      this.eagles.push({
        id: 0,
        name: pivot.name,
        pivot,
        model,
        mixer,
        action,
        position: spawnPos,
        heading: spawnHeading,
        splineProgress: 0.05,
        speed: startActive ? 12.2 : 0,
        lifecycle: startActive ? 'SOARING' : 'ROOSTED_OFF_CAMPUS',
        flightSubState: 'SOARING_GLIDE',
        subStateTimer: 6.5,
        currentYaw: spawnYaw,
        currentPitch: 0,
        currentBank: 0,
        wingspanMeters: targetWingspan,
        lodAccumDt: 0,
        visible: true,
        wakeElevationDeg: wakeElev,
        roostElevationDeg: roostElev,
        wasActive: startActive,
      });
    } catch (err) {
      console.warn('Failed to load animated_eagle.glb:', err);
    }
  }

  public setTargetPopulation(count: 0 | 6 | 10): void {
    this.targetPopulation = count;
    this.applyPopulationMask();
  }

  public getTargetPopulation(): 0 | 6 | 10 {
    return this.targetPopulation;
  }

  public setPigeonEnabled(enabled: boolean): void {
    this.setTargetPopulation(enabled ? 10 : 0);
  }

  private applyPopulationMask(): void {
    const pigeonLimit = this.targetPopulation === 0 ? 0 : this.targetPopulation === 6 ? 6 : 9;
    const eagleLimit = this.targetPopulation === 10 ? 1 : 0;

    for (let i = 0; i < this.pigeons.length; i++) {
      const show = i < pigeonLimit;
      this.pigeons[i].visible = show;
      this.pigeons[i].pivot.visible = show;
    }
    for (let i = 0; i < this.eagles.length; i++) {
      const show = i < eagleLimit;
      this.eagles[i].visible = show;
      this.eagles[i].pivot.visible = show && this.eagles[i].lifecycle !== 'ROOSTED_OFF_CAMPUS';
    }
  }

  private isSolarRoostTime(wakeElev: number, roostElev: number): boolean {
    const solarNoonMinutes = (this.solarState.sunriseMinutes + this.solarState.sunsetMinutes) * 0.5;
    const isMorning = this.solarState.minutesSinceMidnight < solarNoonMinutes;
    return isMorning
      ? this.solarState.solarElevationDeg < wakeElev
      : this.solarState.solarElevationDeg <= roostElev;
  }

  private shouldPigeonRoost(p: PigeonAgent): boolean {
    return this.isSolarRoostTime(p.wakeElevationDeg, p.roostElevationDeg);
  }

  /**
   * Synchronize wildlife circadian schedule with continuous real-time, preview, or accelerated solar state.
   * Large manual jumps & tab resumes trigger natural flight/approach/takeoff transitions without teleportation.
   */
  public setSolarState(next: WildlifeSolarState): void {
    const prevMinutes = this.solarState.minutesSinceMidnight;
    let deltaMinutes = Math.abs(next.minutesSinceMidnight - prevMinutes);
    if (deltaMinutes > 720) deltaMinutes = 1440 - deltaMinutes; // Handle midnight rollover cleanly
    const isJump = Boolean(next.isTimeJump) || deltaMinutes > 18;

    this.solarState = { ...next };
    if (!this.isLoaded) return;

    for (let i = 0; i < this.pigeons.length; i++) {
      const p = this.pigeons[i];
      const shouldRoost = this.shouldPigeonRoost(p);

      if (!p.wasShouldRoost && shouldRoost) {
        // Transitioning into evening/night roost
        p.wasShouldRoost = true;
        p.isNightRoostReturn = true;
        p.wakeDelayTimer = 0;
        if (p.lifecycle === 'FLYING') {
          p.perchCooldown = 0;
          const spot = this.pickUnclaimedPerch(p, true);
          if (spot) {
            p.targetPerch = spot;
            p.lifecycle = 'APPROACHING_BRANCH';
            if (p.flightSubState !== 'FLAP_BURST') {
              p.flightSubState = 'FLAP_BURST';
              this.crossFadePigeon(p, p.flapAction, 0.25, 1.04);
            }
          }
        }
      } else if (p.wasShouldRoost && !shouldRoost) {
        // Transitioning into morning/daytime wakeup — stagger takeoffs so flock departs organically
        p.wasShouldRoost = false;
        p.isNightRoostReturn = false;
        p.wakeDelayTimer = isJump
          ? 0.2 + ((p.id * 5) % 9) * 0.48 + Math.random() * 0.22
          : 0.18 + Math.random() * 1.15;
        if (p.lifecycle === 'PERCHED') {
          p.lifecycleTimer = 0;
        }
      }
    }

    for (let i = 0; i < this.eagles.length; i++) {
      const e = this.eagles[i];
      const eagleActive = !this.isSolarRoostTime(e.wakeElevationDeg, e.roostElevationDeg);

      if (e.wasActive && !eagleActive) {
        e.wasActive = false;
        if (e.lifecycle === 'SOARING' || e.lifecycle === 'ARRIVING') {
          e.lifecycle = 'DEPARTING';
        }
      } else if (!e.wasActive && eagleActive) {
        e.wasActive = true;
        if (e.lifecycle === 'ROOSTED_OFF_CAMPUS' || e.lifecycle === 'DEPARTING') {
          if (e.lifecycle === 'ROOSTED_OFF_CAMPUS') {
            e.position.copy(this.eagleSanctuaryPos);
          }
          e.lifecycle = 'ARRIVING';
          e.pivot.visible = e.visible;
        }
      }
    }
  }

  private crossFadePigeon(p: PigeonAgent, nextAction: THREE.AnimationAction, duration: number, timeScale = 1.0): void {
    if (p.activeAction === nextAction) return;
    const prev = p.activeAction;
    nextAction.reset();
    nextAction.timeScale = timeScale;
    nextAction.enabled = true;
    nextAction.setEffectiveWeight(1);
    nextAction.play();
    prev.crossFadeTo(nextAction, duration, true);
    p.activeAction = nextAction;
  }

  private pickUnclaimedPerch(p: PigeonAgent, allowAnyDistance = false): TreePerchSpot | null {
    let best: TreePerchSpot | null = null;
    let bestScore = Infinity;
    for (const spot of this.perchSpots) {
      if (spot.claimedBy !== null) continue;
      const d = p.position.distanceTo(spot.position);
      if (allowAnyDistance ? d > 2.0 : (d > 10.0 && d < 62.0)) {
        // Slight randomization so birds choose varied trees naturally; roosting favors nearby quiet trees first
        const score = allowAnyDistance ? d + Math.random() * 12.0 : d + Math.random() * 16.0;
        if (score < bestScore) {
          bestScore = score;
          best = spot;
        }
      }
    }
    if (best) best.claimedBy = p.id;
    return best;
  }

  private updatePigeonMixerWithLod(p: PigeonAgent, dt: number, camDist: number): void {
    // Always update at full 60Hz during precision branch landing/takeoff transitions
    const forceFull = p.lifecycle === 'LANDING' || p.lifecycle === 'TAKING_OFF';
    if (forceFull || camDist < 34.0) {
      p.mixer.update(dt + p.lodAccumDt);
      p.lodAccumDt = 0;
      return;
    }
    p.lodAccumDt += dt;
    const interval = camDist < 68.0 ? 2 : 4; // 30Hz mid-range, 15Hz distant/far-perched
    if ((this.frameIndex + p.lodFrameOffset) % interval === 0) {
      p.mixer.update(p.lodAccumDt);
      p.lodAccumDt = 0;
    }
  }

  public update(
    deltaTime: number,
    playerPos?: { x: number; y: number; z: number },
    cameraPos?: { x: number; y: number; z: number },
    vehiclePositions?: { x: number; y: number; z: number }[],
    wind?: EnvironmentalWind
  ): void {
    if (!this.isLoaded || this.targetPopulation === 0) {
      this.lastUpdateCpuMs = 0;
      return;
    }

    const t0 = performance.now();
    const dt = Math.min(Math.max(deltaTime, 0.0001), 0.1);
    this.time += dt;
    this.frameIndex++;

    // Synchronize active perch positions with live animated branch displacement
    for (let i = 0; i < this.perchSpots.length; i++) {
      const s = this.perchSpots[i];
      if (s.claimedBy === null) continue;
      if (wind) {
        wind.evaluateTreeBranchOffset(
          s.treeX,
          s.treeZ,
          s.localPosition.x,
          s.localPosition.y,
          s.localPosition.z,
          s.treeScale,
          this.tmpVec
        );
        s.position.copy(s.basePosition).add(this.tmpVec);
      } else {
        s.position.copy(s.basePosition);
      }
    }

    if (cameraPos) this.tmpCamPos.set(cameraPos.x, cameraPos.y, cameraPos.z);

    for (let i = 0; i < this.pigeons.length; i++) {
      const p = this.pigeons[i];
      if (!p.visible) continue;
      this.updateSinglePigeon(p, dt, playerPos, cameraPos, vehiclePositions);
    }

    for (let i = 0; i < this.eagles.length; i++) {
      const e = this.eagles[i];
      if (!e.visible) continue;
      this.updateSoaringEagle(e, dt, cameraPos);
    }

    const elapsed = performance.now() - t0;
    this.lastUpdateCpuMs = elapsed;
    this.totalUpdateCpuMs += elapsed;
    this.updateSamplesCount++;
  }

  private updateSinglePigeon(
    p: PigeonAgent,
    dt: number,
    playerPos?: { x: number; y: number; z: number },
    cameraPos?: { x: number; y: number; z: number },
    vehiclePositions?: { x: number; y: number; z: number }[]
  ): void {
    const camDist = cameraPos ? p.position.distanceTo(this.tmpCamPos) : 20.0;
    const shouldRoost = this.shouldPigeonRoost(p);

    if (p.lifecycle === 'FLYING') {
      // Alternate flapping vs gliding naturally
      p.subStateTimer -= dt;
      if (p.subStateTimer <= 0) {
        if (p.flightSubState === 'FLAP_BURST') {
          p.flightSubState = 'GLIDE';
          p.subStateTimer = 2.6 + Math.random() * 1.9;
          this.crossFadePigeon(p, p.glideAction, 0.36, 1.0);
        } else {
          p.flightSubState = 'FLAP_BURST';
          p.subStateTimer = 1.7 + Math.random() * 1.4;
          this.crossFadePigeon(p, p.flapAction, 0.26, 0.98 + (p.id % 4) * 0.045);
        }
      }

      // Check eligibility to land on a nearby exposed campus tree branch (all 9 pigeons roost at dusk/night)
      if (p.canPerch || shouldRoost) {
        p.perchCooldown -= dt;
        if (p.perchCooldown <= 0 || shouldRoost) {
          const spot = this.pickUnclaimedPerch(p, shouldRoost);
          if (spot) {
            p.targetPerch = spot;
            p.isNightRoostReturn = shouldRoost;
            p.lifecycle = 'APPROACHING_BRANCH';
            if (p.flightSubState !== 'FLAP_BURST') {
              p.flightSubState = 'FLAP_BURST';
              this.crossFadePigeon(p, p.flapAction, 0.25, 1.02);
            }
          } else {
            p.perchCooldown = shouldRoost ? 1.5 : 5.0;
          }
        }
      }

      const route = this.patrolRoutes[p.routeIndex];
      const stepFrac = (p.speed * dt) / Math.max(route.length, 1.0);
      p.splineProgress = (p.splineProgress + stepFrac) % 1.0;

      const lookAheadDist = 9.5;
      const aheadFrac = (p.splineProgress + lookAheadDist / Math.max(route.length, 1.0)) % 1.0;
      route.curve.getPointAt(aheadFrac, this.tmpAhead);

      // Unique non-repetitive path drift per pigeon
      const phaseSeed = p.id * 1.73;
      this.tmpTarget.copy(this.tmpAhead);
      this.tmpTarget.x += Math.sin(this.time * 0.31 + phaseSeed) * 2.5;
      this.tmpTarget.z += Math.cos(this.time * 0.27 + phaseSeed) * 2.1;
      this.tmpTarget.y +=
        Math.sin(this.time * 0.39 + phaseSeed) * 0.8 +
        (p.flightSubState === 'FLAP_BURST' ? 0.55 : -0.4);

      this.tmpDesiredDir.subVectors(this.tmpTarget, p.position);
      if (this.tmpDesiredDir.lengthSq() > 1e-5) this.tmpDesiredDir.normalize();
      else this.tmpDesiredDir.copy(p.heading);

      this.applyFlockingAndAvoidance(p, playerPos, cameraPos, vehiclePositions);
      this.advanceFlyingKinematics(p, dt, p.flightSubState === 'FLAP_BURST' ? 10.6 : 8.5, 5.2);
    } else if (p.lifecycle === 'APPROACHING_BRANCH' && p.targetPerch) {
      // If sunrise/day arrives mid-approach during a jump or morning wakeup, resume normal flight unless mid-landing
      if (!shouldRoost && p.isNightRoostReturn) {
        p.targetPerch.claimedBy = null;
        p.targetPerch = null;
        p.isNightRoostReturn = false;
        p.lifecycle = 'FLYING';
        p.perchCooldown = 14.0 + Math.random() * 10.0;
        this.updatePigeonMixerWithLod(p, dt, camDist);
        return;
      }

      // Approach staging point ~1.4m above and slightly back along incoming line; cruise higher if far across campus
      const perchPos = p.targetPerch.position;
      const rawDistToPerch = p.position.distanceTo(perchPos);
      const cruiseLift = rawDistToPerch > 24.0
        ? Math.min(7.5, (rawDistToPerch - 24.0) * 0.25)
        : 0;
      this.tmpTarget.set(
        perchPos.x + Math.sin(p.targetPerch.outwardYaw) * 1.1,
        perchPos.y + 1.15 + cruiseLift,
        perchPos.z + Math.cos(p.targetPerch.outwardYaw) * 1.1
      );
      const distToStage = p.position.distanceTo(this.tmpTarget);
      const distToPerch = p.position.distanceTo(perchPos);

      this.tmpDesiredDir.subVectors(this.tmpTarget, p.position).normalize();
      this.applyObstacleAvoidanceOnly(p, true, playerPos, cameraPos, vehiclePositions);

      // Smooth deceleration on approach (slightly brisker wingbeat return when roosting from far precincts)
      const maxApproachSpeed = p.isNightRoostReturn ? 11.8 : 8.8;
      const targetApproachSpeed = THREE.MathUtils.clamp(distToStage * 0.75 + 2.8, 3.2, maxApproachSpeed);
      this.advanceFlyingKinematics(p, dt, targetApproachSpeed, 2.4);

      if (distToStage < 1.65 || distToPerch < 2.2) {
        p.lifecycle = 'LANDING';
        p.lifecycleDuration = 1.65;
        p.lifecycleTimer = p.lifecycleDuration;
        p.landingStartPos.copy(p.position);
        p.landingStartYaw = p.currentYaw;
        this.crossFadePigeon(p, p.landingAction, 0.22, 1.15);
      }
    } else if (p.lifecycle === 'LANDING' && p.targetPerch) {
      p.lifecycleTimer -= dt;
      const tNorm = THREE.MathUtils.clamp(1.0 - p.lifecycleTimer / Math.max(p.lifecycleDuration, 0.01), 0, 1);
      // Smooth cubic ease-out onto exact branch feet contact height
      const ease = 1 - Math.pow(1 - tNorm, 3);

      const endPosY = p.targetPerch.position.y - this.standingFeetLocalY;
      p.position.x = THREE.MathUtils.lerp(p.landingStartPos.x, p.targetPerch.position.x, ease);
      p.position.z = THREE.MathUtils.lerp(p.landingStartPos.z, p.targetPerch.position.z, ease);
      // Gentle landing arc flare before settling claws on branch
      const flare = Math.sin(tNorm * Math.PI) * 0.28;
      p.position.y = THREE.MathUtils.lerp(p.landingStartPos.y, endPosY, ease) + flare;

      p.speed = THREE.MathUtils.lerp(3.5, 0.0, ease);

      let yawDiff = p.targetPerch.outwardYaw - p.landingStartYaw;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      p.currentYaw = p.landingStartYaw + yawDiff * ease;
      p.currentBank = THREE.MathUtils.lerp(p.currentBank, 0, Math.min(1, 8 * dt));
      p.currentPitch = THREE.MathUtils.lerp(p.currentPitch, -0.18 * (1 - ease), Math.min(1, 8 * dt));

      p.pivot.position.copy(p.position);
      p.pivot.rotation.set(p.currentPitch, p.currentYaw, p.currentBank, 'YXZ');

      if (p.lifecycleTimer <= 0) {
        p.lifecycle = 'PERCHED';
        p.lifecycleDuration = 7.5 + Math.random() * 6.5;
        p.lifecycleTimer = p.lifecycleDuration;
        p.position.set(p.targetPerch.position.x, endPosY, p.targetPerch.position.z);
        p.perchedLookYaw = p.targetPerch.outwardYaw;
        p.perchLookTimer = shouldRoost ? 4.5 + Math.random() * 4.0 : 1.8 + Math.random() * 2.0;
        p.pivot.position.copy(p.position);
        p.pivot.rotation.set(0, p.currentYaw, 0, 'YXZ');
        this.crossFadePigeon(p, p.idleAction, 0.30, shouldRoost ? 0.72 + (p.id % 3) * 0.06 : 1.0);
      }
    } else if (p.lifecycle === 'PERCHED' && p.targetPerch) {
      if (!shouldRoost) {
        if (p.wakeDelayTimer > 0) {
          p.wakeDelayTimer = Math.max(0, p.wakeDelayTimer - dt);
        } else {
          p.lifecycleTimer -= dt;
        }
      }

      p.perchLookTimer -= dt;
      if (p.perchLookTimer <= 0) {
        if (shouldRoost) {
          // Subtle quiet night head/posture shifts on the branch
          p.perchLookTimer = 4.5 + Math.random() * 4.5;
          p.perchedLookYaw = p.targetPerch.outwardYaw + (Math.random() - 0.5) * 0.34;
        } else {
          p.perchLookTimer = 2.0 + Math.random() * 2.5;
          p.perchedLookYaw = p.targetPerch.outwardYaw + (Math.random() - 0.5) * 0.7;
        }
      }

      let yawDiff = p.perchedLookYaw - p.currentYaw;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      p.currentYaw += yawDiff * Math.min(1, (shouldRoost ? 1.8 : 3.2) * dt);

      // Keep bird claws locked precisely to animated branch coordinates every frame
      const livePerchY = p.targetPerch.position.y - this.standingFeetLocalY;
      p.position.set(p.targetPerch.position.x, livePerchY, p.targetPerch.position.z);
      p.pivot.position.copy(p.position);
      p.pivot.rotation.set(0, p.currentYaw, 0, 'YXZ');

      // Spook gracefully if player comes right next to the bird (use 3D distance at night so walking underneath high canopy doesn't cause continuous midnight flight)
      let spooked = false;
      if (playerPos) {
        const dx = p.position.x - playerPos.x;
        const dy = p.position.y - playerPos.y;
        const dz = p.position.z - playerPos.z;
        if (shouldRoost) {
          if (Math.hypot(dx, dy, dz) < 3.4) spooked = true;
        } else {
          if (Math.hypot(dx, dz) < 4.8) spooked = true;
        }
      }

      const timerReadyToTakeOff = !shouldRoost && p.wakeDelayTimer <= 0 && p.lifecycleTimer <= 0;
      if (timerReadyToTakeOff || spooked) {
        p.lifecycle = 'TAKING_OFF';
        p.lifecycleDuration = 1.55;
        p.lifecycleTimer = p.lifecycleDuration;
        p.isNightRoostReturn = false;
        p.landingStartPos.copy(p.position);
        // Take off outward away from tree center & slightly upward into open sky
        p.takeoffDir
          .set(Math.sin(p.currentYaw), 0.36, Math.cos(p.currentYaw))
          .normalize();
        p.heading.copy(p.takeoffDir);
        this.crossFadePigeon(p, p.takeoffAction, 0.18, 1.15);
      }
    } else if (p.lifecycle === 'TAKING_OFF') {
      p.lifecycleTimer -= dt;
      const tNorm = THREE.MathUtils.clamp(1.0 - p.lifecycleTimer / Math.max(p.lifecycleDuration, 0.01), 0, 1);
      // Smooth upward acceleration off the branch
      p.speed = THREE.MathUtils.lerp(0.6, 9.2, Math.pow(tNorm, 0.85));
      p.position.addScaledVector(p.takeoffDir, p.speed * dt);
      p.currentPitch = THREE.MathUtils.lerp(p.currentPitch, -0.26, Math.min(1, 5.0 * dt));
      p.pivot.position.copy(p.position);
      p.pivot.rotation.set(p.currentPitch, p.currentYaw, 0, 'YXZ');

      if (p.lifecycleTimer <= 0) {
        if (p.targetPerch) {
          p.targetPerch.claimedBy = null;
          p.targetPerch = null;
        }
        p.lifecycle = 'FLYING';
        p.flightSubState = 'FLAP_BURST';
        p.subStateTimer = 2.2 + Math.random() * 1.1;
        // If spooked at night, settle quickly back onto another sheltered tree rather than cruising
        p.perchCooldown = shouldRoost ? 0.6 : 16.0 + Math.random() * 12.0;
        p.isNightRoostReturn = shouldRoost;
        this.crossFadePigeon(p, p.flapAction, 0.25, 1.02);
      }
    }

    this.updatePigeonMixerWithLod(p, dt, camDist);
  }

  private applyFlockingAndAvoidance(
    p: PigeonAgent,
    playerPos?: { x: number; y: number; z: number },
    cameraPos?: { x: number; y: number; z: number },
    vehiclePositions?: { x: number; y: number; z: number }[]
  ): void {
    this.applyObstacleAvoidanceOnly(p, false, playerPos, cameraPos, vehiclePositions);

    // Smooth separation & subtle alignment among nearby airborne pigeons
    for (let j = 0; j < this.pigeons.length; j++) {
      if (j === p.id) continue;
      const other = this.pigeons[j];
      if (!other.visible || other.lifecycle !== 'FLYING') continue;
      const dx = p.position.x - other.position.x;
      const dy = p.position.y - other.position.y;
      const dz = p.position.z - other.position.z;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq < 2.6 * 2.6 && dSq > 1e-4) {
        const d = Math.sqrt(dSq);
        const rep = (2.6 - d) / 2.6;
        this.tmpDesiredDir.x += (dx / d) * rep * 1.4;
        this.tmpDesiredDir.y += (dy / d) * rep * 0.9;
        this.tmpDesiredDir.z += (dz / d) * rep * 1.4;
      } else if (other.flockGroupId === p.flockGroupId && dSq < 8.5 * 8.5) {
        // Gentle flock alignment
        this.tmpDesiredDir.addScaledVector(other.heading, 0.18);
      }
    }
    this.tmpDesiredDir.normalize();
  }

  private applyObstacleAvoidanceOnly(
    p: PigeonAgent,
    allowTargetTree: boolean,
    playerPos?: { x: number; y: number; z: number },
    cameraPos?: { x: number; y: number; z: number },
    vehiclePositions?: { x: number; y: number; z: number }[]
  ): void {
    this.tmpSteer.set(0, 0, 0);

    // 1. Hero campus trees (skip target tree when approaching it cleanly)
    for (let t = 0; t < this.heroTrees.length; t++) {
      const tree = this.heroTrees[t];
      if (
        allowTargetTree &&
        p.targetPerch &&
        Math.abs(tree.x - p.targetPerch.treeX) < 0.2 &&
        Math.abs(tree.z - p.targetPerch.treeZ) < 0.2
      ) {
        continue;
      }
      const safeTop = tree.topY + 1.25;
      if (p.position.y < safeTop) {
        const dx = p.position.x - tree.x;
        const dz = p.position.z - tree.z;
        const dSq = dx * dx + dz * dz;
        const avoidR = tree.canopyRadius + 1.5;
        if (dSq < avoidR * avoidR && dSq > 1e-4) {
          const d = Math.sqrt(dSq);
          const strength = (avoidR - d) / avoidR;
          this.tmpSteer.x += (dx / d) * strength * 1.7;
          this.tmpSteer.z += (dz / d) * strength * 1.7;
          this.tmpSteer.y += strength * 1.2;
        }
      }
    }

    // 2. Campus Buildings, Gate Portal & Parked Bus Bay
    const bMargin = 2.6;
    for (let b = 0; b < this.buildingObstacles.length; b++) {
      const box = this.buildingObstacles[b];
      if (
        p.position.x > box.minX - bMargin &&
        p.position.x < box.maxX + bMargin &&
        p.position.z > box.minZ - bMargin &&
        p.position.z < box.maxZ + bMargin &&
        p.position.y < box.maxY + 2.0
      ) {
        const cx = (box.minX + box.maxX) * 0.5;
        const cz = (box.minZ + box.maxZ) * 0.5;
        this.tmpVec.set(p.position.x - cx, 0, p.position.z - cz);
        if (this.tmpVec.lengthSq() > 1e-4) this.tmpVec.normalize();
        else this.tmpVec.set(0, 0, 1);
        this.tmpSteer.x += this.tmpVec.x * 1.8;
        this.tmpSteer.z += this.tmpVec.z * 1.8;
        this.tmpSteer.y += 1.6;
      }
    }

    // 3. Player, Camera & Active Drivable Vehicles
    const avoidPoint = (pos: { x: number; y: number; z: number } | undefined, radius: number, yOff = 0.9) => {
      if (!pos) return;
      const dx = p.position.x - pos.x;
      const dy = p.position.y - (pos.y + yOff);
      const dz = p.position.z - pos.z;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq < radius * radius && dSq > 1e-4) {
        const d = Math.sqrt(dSq);
        const s = (radius - d) / radius;
        this.tmpSteer.x += (dx / d) * s * 2.2;
        this.tmpSteer.y += Math.max(0.35, dy / d) * s * 2.3;
        this.tmpSteer.z += (dz / d) * s * 2.2;
      }
    };
    avoidPoint(playerPos, 3.6, 0.9);
    avoidPoint(cameraPos, 3.4, 0.0);
    if (vehiclePositions) {
      for (let v = 0; v < vehiclePositions.length; v++) {
        avoidPoint(vehiclePositions[v], 4.8, 1.5);
      }
    }

    if (!allowTargetTree && p.position.y < 5.6) {
      this.tmpSteer.y += (5.6 - p.position.y) * 0.85;
    }

    this.tmpDesiredDir.add(this.tmpSteer).normalize();
  }

  private advanceFlyingKinematics(p: PigeonAgent, dt: number, baseTargetSpeed: number, minHeight: number): void {
    const prevYaw = Math.atan2(p.heading.x, p.heading.z);
    p.heading.lerp(this.tmpDesiredDir, Math.min(1.0, 2.35 * dt)).normalize();

    const climbDrag = p.heading.y * 1.7;
    const targetSpeed = THREE.MathUtils.clamp(baseTargetSpeed - climbDrag, 3.0, 12.2);
    p.speed = THREE.MathUtils.lerp(p.speed, targetSpeed, Math.min(1.0, 2.1 * dt));

    p.velocity.copy(p.heading).multiplyScalar(p.speed);
    p.position.addScaledVector(p.velocity, dt);
    if (p.position.y < minHeight) p.position.y = minHeight;

    // Hard building clearance guard so no bird can clip inside any structure AABB
    if (p.lifecycle === 'FLYING') {
      const pad = 0.85;
      for (let b = 0; b < this.buildingObstacles.length; b++) {
        const box = this.buildingObstacles[b];
        if (
          p.position.x > box.minX - pad &&
          p.position.x < box.maxX + pad &&
          p.position.z > box.minZ - pad &&
          p.position.z < box.maxZ + pad &&
          p.position.y < box.maxY + pad
        ) {
          const dLeft = p.position.x - (box.minX - pad);
          const dRight = box.maxX + pad - p.position.x;
          const dNorth = p.position.z - (box.minZ - pad);
          const dSouth = box.maxZ + pad - p.position.z;
          const dTop = box.maxY + pad - p.position.y;
          const m = Math.min(dLeft, dRight, dNorth, dSouth, dTop);
          if (m === dTop) p.position.y = box.maxY + pad;
          else if (m === dLeft) p.position.x = box.minX - pad;
          else if (m === dRight) p.position.x = box.maxX + pad;
          else if (m === dNorth) p.position.z = box.minZ - pad;
          else p.position.z = box.maxZ + pad;
        }
      }
    }

    const newYaw = Math.atan2(p.heading.x, p.heading.z);
    let yawDelta = newYaw - prevYaw;
    while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
    while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;

    const yawRate = yawDelta / Math.max(dt, 0.0005);
    const desiredBank = THREE.MathUtils.clamp(-yawRate * 0.42, -0.48, 0.48);
    p.currentBank = THREE.MathUtils.lerp(p.currentBank, desiredBank, Math.min(1.0, 5.5 * dt));

    const desiredPitch = -Math.asin(THREE.MathUtils.clamp(p.heading.y, -0.42, 0.42));
    p.currentPitch = THREE.MathUtils.lerp(p.currentPitch, desiredPitch, Math.min(1.0, 6.0 * dt));
    p.currentYaw = newYaw;

    p.pivot.position.copy(p.position);
    p.pivot.rotation.set(p.currentPitch, p.currentYaw, p.currentBank, 'YXZ');
  }

  private updateSoaringEagle(e: EagleAgent, dt: number, cameraPos?: { x: number; y: number; z: number }): void {
    if (e.lifecycle === 'ROOSTED_OFF_CAMPUS') {
      e.pivot.visible = false;
      e.speed = 0;
      return;
    }

    e.pivot.visible = e.visible;

    if (e.lifecycle === 'DEPARTING') {
      // animated_eagle.glb only provides a single flying loop; glide gracefully beyond horizon hills
      if (e.action && typeof e.action.play === 'function') e.action.timeScale = 0.9;
      this.tmpDesiredDir.subVectors(this.eagleSanctuaryPos, e.position);
      if (this.tmpDesiredDir.lengthSq() > 1e-4) this.tmpDesiredDir.normalize();
      const prevYaw = Math.atan2(e.heading.x, e.heading.z);
      e.heading.lerp(this.tmpDesiredDir, Math.min(1.0, 1.8 * dt)).normalize();
      e.speed = THREE.MathUtils.lerp(e.speed, 15.8, Math.min(1.0, 2.2 * dt));
      e.position.addScaledVector(e.heading, e.speed * dt);

      const newYaw = Math.atan2(e.heading.x, e.heading.z);
      let yawDelta = newYaw - prevYaw;
      while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
      while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
      e.currentBank = THREE.MathUtils.lerp(e.currentBank, THREE.MathUtils.clamp(-(yawDelta / Math.max(dt, 0.0005)) * 0.45, -0.45, 0.45), Math.min(1.0, 4.0 * dt));
      e.currentPitch = THREE.MathUtils.lerp(e.currentPitch, -Math.asin(THREE.MathUtils.clamp(e.heading.y, -0.35, 0.35)), Math.min(1.0, 4.5 * dt));
      e.currentYaw = newYaw;

      e.pivot.position.copy(e.position);
      e.pivot.rotation.set(e.currentPitch, e.currentYaw, e.currentBank, 'YXZ');

      if (Math.hypot(e.position.x, e.position.z) > 235 || e.position.distanceTo(this.eagleSanctuaryPos) < 20) {
        e.lifecycle = 'ROOSTED_OFF_CAMPUS';
        e.speed = 0;
        e.pivot.visible = false;
        return;
      }
    } else if (e.lifecycle === 'ARRIVING') {
      if (e.action && typeof e.action.play === 'function') e.action.timeScale = 0.95;
      this.eagleRoute.curve.getPointAt(e.splineProgress, this.tmpAhead);
      this.tmpDesiredDir.subVectors(this.tmpAhead, e.position);
      const distToRoute = this.tmpDesiredDir.length();
      if (distToRoute > 1e-4) this.tmpDesiredDir.normalize();

      const prevYaw = Math.atan2(e.heading.x, e.heading.z);
      e.heading.lerp(this.tmpDesiredDir, Math.min(1.0, 1.8 * dt)).normalize();
      e.speed = THREE.MathUtils.lerp(e.speed, 13.0, Math.min(1.0, 2.0 * dt));
      e.position.addScaledVector(e.heading, e.speed * dt);

      const newYaw = Math.atan2(e.heading.x, e.heading.z);
      let yawDelta = newYaw - prevYaw;
      while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
      while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
      e.currentBank = THREE.MathUtils.lerp(e.currentBank, THREE.MathUtils.clamp(-(yawDelta / Math.max(dt, 0.0005)) * 0.45, -0.45, 0.45), Math.min(1.0, 4.0 * dt));
      e.currentPitch = THREE.MathUtils.lerp(e.currentPitch, -Math.asin(THREE.MathUtils.clamp(e.heading.y, -0.35, 0.35)), Math.min(1.0, 4.5 * dt));
      e.currentYaw = newYaw;

      e.pivot.position.copy(e.position);
      e.pivot.rotation.set(e.currentPitch, e.currentYaw, e.currentBank, 'YXZ');

      if (distToRoute < 28.0) {
        e.lifecycle = 'SOARING';
        e.flightSubState = 'SOARING_GLIDE';
        e.subStateTimer = 5.5;
      }
    } else {
      e.subStateTimer -= dt;
      if (e.subStateTimer <= 0) {
        if (e.flightSubState === 'SOARING_GLIDE') {
          e.flightSubState = 'FLAP_BURST';
          e.subStateTimer = 3.0 + Math.random() * 1.5;
          if (e.action && typeof e.action.play === 'function') e.action.timeScale = 1.15;
        } else {
          e.flightSubState = 'SOARING_GLIDE';
          e.subStateTimer = 6.5 + Math.random() * 4.5;
          if (e.action && typeof e.action.play === 'function') e.action.timeScale = 0.22;
        }
      }

      const stepFrac = (e.speed * dt) / Math.max(this.eagleRoute.length, 1.0);
      e.splineProgress = (e.splineProgress + stepFrac) % 1.0;
      const aheadFrac = (e.splineProgress + 16.0 / Math.max(this.eagleRoute.length, 1.0)) % 1.0;
      this.eagleRoute.curve.getPointAt(aheadFrac, this.tmpAhead);

      this.tmpAhead.x += Math.sin(this.time * 0.17) * 5.0;
      this.tmpAhead.z += Math.cos(this.time * 0.14) * 5.0;
      this.tmpAhead.y += (e.flightSubState === 'FLAP_BURST' ? 2.0 : -1.2) + Math.sin(this.time * 0.22) * 1.8;

      this.tmpDesiredDir.subVectors(this.tmpAhead, e.position).normalize();
      const prevYaw = Math.atan2(e.heading.x, e.heading.z);
      e.heading.lerp(this.tmpDesiredDir, Math.min(1.0, 1.2 * dt)).normalize();

      const targetSpeed = e.flightSubState === 'FLAP_BURST' ? 13.8 : 11.4;
      e.speed = THREE.MathUtils.lerp(e.speed, targetSpeed, Math.min(1.0, 1.4 * dt));
      e.position.addScaledVector(e.heading, e.speed * dt);

      const newYaw = Math.atan2(e.heading.x, e.heading.z);
      let yawDelta = newYaw - prevYaw;
      while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
      while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
      const yawRate = yawDelta / Math.max(dt, 0.0005);

      e.currentBank = THREE.MathUtils.lerp(e.currentBank, THREE.MathUtils.clamp(-yawRate * 0.45, -0.45, 0.45), Math.min(1.0, 4.0 * dt));
      e.currentPitch = THREE.MathUtils.lerp(e.currentPitch, -Math.asin(THREE.MathUtils.clamp(e.heading.y, -0.35, 0.35)), Math.min(1.0, 4.5 * dt));
      e.currentYaw = newYaw;

      e.pivot.position.copy(e.position);
      e.pivot.rotation.set(e.currentPitch, e.currentYaw, e.currentBank, 'YXZ');
    }

    // Distance LOD on eagle mixer
    const camDist = cameraPos ? e.position.distanceTo(this.tmpCamPos) : 45.0;
    if (camDist < 42.0) {
      e.mixer.update(dt + e.lodAccumDt);
      e.lodAccumDt = 0;
    } else {
      e.lodAccumDt += dt;
      if (this.frameIndex % 2 === 0) {
        e.mixer.update(e.lodAccumDt);
        e.lodAccumDt = 0;
      }
    }
  }

  public getWildlifeCounts(): { pigeons: number; eagles: number; parrots: number; phoenix: number; total: number } {
    const activePigeons = this.pigeons.filter((p) => p.visible).length;
    const activeEagles = this.eagles.filter((e) => e.visible).length;
    return {
      pigeons: activePigeons,
      eagles: activeEagles,
      parrots: 0,
      phoenix: 0,
      total: activePigeons + activeEagles,
    };
  }

  public getCircadianSummary(): {
    solarElevationDeg: number;
    airbornePigeons: number;
    approachingPigeons: number;
    landingPigeons: number;
    perchedPigeons: number;
    takingOffPigeons: number;
    eagleLifecycle: string;
    eagleVisibleInScene: boolean;
  } {
    let airborne = 0;
    let approaching = 0;
    let landing = 0;
    let perched = 0;
    let takingOff = 0;
    for (const p of this.pigeons) {
      if (!p.visible) continue;
      if (p.lifecycle === 'FLYING') airborne++;
      else if (p.lifecycle === 'APPROACHING_BRANCH') approaching++;
      else if (p.lifecycle === 'LANDING') landing++;
      else if (p.lifecycle === 'PERCHED') perched++;
      else if (p.lifecycle === 'TAKING_OFF') takingOff++;
    }
    const e = this.eagles[0];
    return {
      solarElevationDeg: Number(this.solarState.solarElevationDeg.toFixed(2)),
      airbornePigeons: airborne,
      approachingPigeons: approaching,
      landingPigeons: landing,
      perchedPigeons: perched,
      takingOffPigeons: takingOff,
      eagleLifecycle: e ? e.lifecycle : 'NONE',
      eagleVisibleInScene: e ? e.pivot.visible : false,
    };
  }

  public getAnimatedMetrics(): PigeonAnimatedMetrics | null {
    return this.animatedMetrics;
  }

  public getAnimationCpuStats(): { lastMs: number; avgMs: number; samples: number } {
    return {
      lastMs: Number(this.lastUpdateCpuMs.toFixed(4)),
      avgMs: this.updateSamplesCount > 0 ? Number((this.totalUpdateCpuMs / this.updateSamplesCount).toFixed(4)) : 0,
      samples: this.updateSamplesCount,
    };
  }

  public resetCpuStats(): void {
    this.totalUpdateCpuMs = 0;
    this.updateSamplesCount = 0;
    this.lastUpdateCpuMs = 0;
  }

  public getTreePerchSpots(): { id: number; zoneTag: string; pos: { x: number; y: number; z: number }; claimedBy: number | null }[] {
    return this.perchSpots.map((s) => ({
      id: s.id,
      zoneTag: s.zoneTag,
      pos: { x: Number(s.position.x.toFixed(2)), y: Number(s.position.y.toFixed(2)), z: Number(s.position.z.toFixed(2)) },
      claimedBy: s.claimedBy,
    }));
  }

  public getAllBirdStates(): {
    name: string;
    species: 'pigeon' | 'eagle';
    lifecycle: string;
    flightSubState: string;
    zone: string;
    speed: number;
    position: { x: number; y: number; z: number };
    visible: boolean;
  }[] {
    return [
      ...this.pigeons.map((p) => ({
        name: p.name,
        species: 'pigeon' as const,
        lifecycle: p.lifecycle,
        flightSubState: p.flightSubState,
        zone: p.zoneTag,
        speed: Number(p.speed.toFixed(2)),
        position: {
          x: Number(p.position.x.toFixed(2)),
          y: Number(p.position.y.toFixed(2)),
          z: Number(p.position.z.toFixed(2)),
        },
        visible: p.visible,
      })),
      ...this.eagles.map((e) => ({
        name: e.name,
        species: 'eagle' as const,
        lifecycle: e.lifecycle,
        flightSubState: e.flightSubState,
        zone: e.lifecycle === 'ROOSTED_OFF_CAMPUS' ? 'Distant Roost Hills' : 'Campus High Sky',
        speed: Number(e.speed.toFixed(2)),
        position: {
          x: Number(e.position.x.toFixed(2)),
          y: Number(e.position.y.toFixed(2)),
          z: Number(e.position.z.toFixed(2)),
        },
        visible: e.pivot.visible,
      })),
    ];
  }

  public getPrimaryPigeonState(): {
    position: { x: number; y: number; z: number };
    flightState: string;
    speed: number;
    wingspanMeters: number;
    bodyLengthMeters: number;
  } | null {
    if (this.pigeons.length === 0) return null;
    const p = this.pigeons[0];
    return {
      position: {
        x: Number(p.position.x.toFixed(2)),
        y: Number(p.position.y.toFixed(2)),
        z: Number(p.position.z.toFixed(2)),
      },
      flightState: p.lifecycle === 'FLYING' ? p.flightSubState : p.lifecycle,
      speed: Number(p.speed.toFixed(2)),
      wingspanMeters: p.wingspanMeters,
      bodyLengthMeters: p.bodyLengthMeters,
    };
  }

  public dispose(): void {
    for (const pg of this.pigeons) {
      if (pg.mixer) pg.mixer.stopAllAction();
      this.scene.remove(pg.pivot);
    }
    for (const eg of this.eagles) {
      if (eg.mixer) eg.mixer.stopAllAction();
      this.scene.remove(eg.pivot);
    }
    for (const g of this.sharedPigeonGeometries) g.dispose();
    for (const m of this.sharedPigeonMaterials) {
      const sm = m as THREE.MeshStandardMaterial;
      sm.map?.dispose();
      m.dispose();
    }
    for (const g of this.sharedEagleGeometries) g.dispose();
    for (const m of this.sharedEagleMaterials) {
      const sm = m as THREE.MeshStandardMaterial;
      sm.map?.dispose();
      m.dispose();
    }
    this.pigeons = [];
    this.eagles = [];
  }
}
