import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PhysicsWorld } from './PhysicsWorld';
import { CampusZone } from '../types/game';

export class CVRCampusMap {
  public group: THREE.Group;
  private physics: PhysicsWorld;
  private gltfLoader: GLTFLoader;

  // Track allocated resources for clean disposal
  private disposables: { dispose: () => void }[] = [];

  // Procedural Canvas Textures
  private gateSignTex!: THREE.CanvasTexture;
  private sandstoneTex!: THREE.CanvasTexture;
  private emblemTex!: THREE.CanvasTexture;
  private curbTex!: THREE.CanvasTexture;
  private woodGrainTex!: THREE.CanvasTexture;
  private mainBlockSignTex!: THREE.CanvasTexture;
  private roofSignTex!: THREE.CanvasTexture;
  private pgBlockSignTex!: THREE.CanvasTexture;
  private librarySignTex!: THREE.CanvasTexture;
  private firstYearSignTex!: THREE.CanvasTexture;
  private cseSignTex!: THREE.CanvasTexture;
  private noticeTex!: THREE.CanvasTexture;
  private busSignTex!: THREE.CanvasTexture;
  private solarTex!: THREE.CanvasTexture;
  private asphaltPbrMap!: THREE.CanvasTexture;
  private asphaltRoughnessMap!: THREE.CanvasTexture;

  public waypointChevron?: THREE.Mesh;

  // Materials dictionary
  private materials!: {
    grass: THREE.MeshLambertMaterial;
    grassLawn: THREE.MeshLambertMaterial;
    redSoil: THREE.MeshLambertMaterial;
    avenueConcrete: THREE.MeshLambertMaterial;
    asphalt: THREE.MeshStandardMaterial;
    highwayAsphalt: THREE.MeshStandardMaterial;
    roadMarking: THREE.MeshBasicMaterial;
    concrete: THREE.MeshLambertMaterial;
    curbStripe: THREE.MeshLambertMaterial;
    sandstoneMonument: THREE.MeshLambertMaterial;
    concreteBorder: THREE.MeshLambertMaterial;
    woodPillar: THREE.MeshLambertMaterial;
    gateDarkFrame: THREE.MeshStandardMaterial;
    ironGateBlack: THREE.MeshStandardMaterial;
    gateGold: THREE.MeshStandardMaterial;
    monumentCharcoal: THREE.MeshStandardMaterial;
    planterStone: THREE.MeshLambertMaterial;
    maroonWall: THREE.MeshLambertMaterial;
    mainBlockBeige: THREE.MeshLambertMaterial;
    academicWall: THREE.MeshLambertMaterial;
    academicCornice: THREE.MeshLambertMaterial;
    granitePillar: THREE.MeshStandardMaterial;
    windowGlass: THREE.MeshStandardMaterial;
    windowFrameWhite: THREE.MeshLambertMaterial;
    solarPanel: THREE.MeshStandardMaterial;
    shedRoofRed: THREE.MeshLambertMaterial;
    quadTowerBrown: THREE.MeshLambertMaterial;
    busYellow: THREE.MeshLambertMaterial;
    busTire: THREE.MeshLambertMaterial;
    busRoofWhite: THREE.MeshLambertMaterial;
    treeTrunk: THREE.MeshLambertMaterial;
    treeFoliage1: THREE.MeshLambertMaterial;
    treeFoliage2: THREE.MeshLambertMaterial;
    hedgeGreen: THREE.MeshLambertMaterial;
    bougainvillea: THREE.MeshStandardMaterial;
    bougainvilleaLeaves: THREE.MeshStandardMaterial;
    waypointChevron: THREE.MeshStandardMaterial;
    boundaryWall: THREE.MeshLambertMaterial;
    cricketTurf: THREE.MeshLambertMaterial;
    cricketPitch: THREE.MeshLambertMaterial;
    steelTower: THREE.MeshStandardMaterial;
    royalBlueSign: THREE.MeshStandardMaterial;
    waterCanal: THREE.MeshStandardMaterial;
    courtGreen: THREE.MeshLambertMaterial;
    courtRed: THREE.MeshLambertMaterial;
  };

  constructor(physics: PhysicsWorld) {
    this.physics = physics;
    this.gltfLoader = new GLTFLoader();
    this.group = new THREE.Group();
    this.group.name = 'CVRCampusMap';

    this.initMaterials();
    this.buildTerrainAndRoads();
    this.buildSignatureMainEntranceGate();
    this.buildNorthBusBay();
    this.buildCentral12MSpineAvenue();
    this.buildLandscapeGardenAndHTTower();
    this.buildMainBuildingWithWalkablePortico();
    this.buildWestAcademicBlocks();
    this.buildSouthAcademicAndStudentService();
    this.buildCSEBuildingAndWorkshops();
    this.buildCricketGroundAndSportsCourts();
    this.buildBoysHostelAndWestCampus();
    this.buildRachaKalwaCanalAndPerimeter();
  }

  // --- Procedural Canvas Textures & Materials Setup ---

  private initMaterials(): void {
    // 1. Procedural High-Res Signboard: "CVR COLLEGE OF ENGINEERING" for Gate Lintel
    this.gateSignTex = this.createGateSignboardTexture();
    this.disposables.push(this.gateSignTex);

    // 2. Procedural Sandstone Veining Texture (#dfba8c)
    this.sandstoneTex = this.createSandstoneTexture();
    this.disposables.push(this.sandstoneTex);

    // 3. Procedural CVR Emblem Medallion Texture
    this.emblemTex = this.createEmblemTexture();
    this.disposables.push(this.emblemTex);

    // 4. Procedural Yellow-and-Black Striped Curb Texture (#facc15 / #18181b)
    this.curbTex = this.createCurbStripeTexture();
    this.disposables.push(this.curbTex);

    // 5. Procedural Dark Walnut Wood-Grain Texture (#4a3222)
    this.woodGrainTex = this.createWoodGrainTexture();
    this.disposables.push(this.woodGrainTex);

    // 6. Procedural Royal-Blue Signboard Textures
    this.mainBlockSignTex = this.createSignboardTexture('MAIN BLOCK');
    this.pgBlockSignTex = this.createSignboardTexture('PG BLOCK');
    this.librarySignTex = this.createSignboardTexture('CENTRAL LIBRARY');
    this.firstYearSignTex = this.createSignboardTexture('FIRST YEAR BLOCK');
    this.cseSignTex = this.createSignboardTexture('CSE BLOCK');
    this.disposables.push(
      this.mainBlockSignTex,
      this.pgBlockSignTex,
      this.librarySignTex,
      this.firstYearSignTex,
      this.cseSignTex
    );

    // 7. Procedural Roofline "CVR COLLEGE OF ENGINEERING" Signboard Texture
    this.roofSignTex = this.createRooflineSignTexture();
    this.disposables.push(this.roofSignTex);

    // 8. Procedural Gate Notice Board Texture ("B.Tech Admissions")
    this.noticeTex = this.createAdmissionNoticeTexture();
    this.disposables.push(this.noticeTex);

    // 9. Procedural Blue "BUS PARKING" Sign Texture
    this.busSignTex = this.createBusParkingSignTexture();
    this.disposables.push(this.busSignTex);

    // 10. Procedural Solar Panel Grid Texture
    this.solarTex = this.createSolarPanelTexture();
    this.disposables.push(this.solarTex);

    // 11. Procedural Weathered Asphalt PBR Textures
    const asphaltPbr = this.createAsphaltPbrTextures();
    this.asphaltPbrMap = asphaltPbr.map;
    this.asphaltRoughnessMap = asphaltPbr.roughnessMap;
    this.disposables.push(this.asphaltPbrMap, this.asphaltRoughnessMap);

    this.materials = {
      grass: new THREE.MeshLambertMaterial({ color: 0x42753a }),
      grassLawn: new THREE.MeshLambertMaterial({ color: 0x558a43 }),
      redSoil: new THREE.MeshLambertMaterial({ color: 0xaf5a34 }),
      avenueConcrete: new THREE.MeshLambertMaterial({ color: 0xb8b2a6 }),
      asphalt: new THREE.MeshStandardMaterial({
        color: 0x484c54,
        map: this.asphaltPbrMap,
        roughnessMap: this.asphaltRoughnessMap,
        bumpMap: this.asphaltRoughnessMap,
        bumpScale: 0.05,
        roughness: 0.82,
        metalness: 0.12,
      }),
      highwayAsphalt: new THREE.MeshStandardMaterial({
        color: 0x32353b,
        map: this.asphaltPbrMap,
        roughnessMap: this.asphaltRoughnessMap,
        roughness: 0.88,
        metalness: 0.1,
      }),
      roadMarking: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      concrete: new THREE.MeshLambertMaterial({ color: 0xded8cc }),
      curbStripe: new THREE.MeshLambertMaterial({ map: this.curbTex }),
      sandstoneMonument: new THREE.MeshLambertMaterial({ map: this.sandstoneTex }),
      concreteBorder: new THREE.MeshLambertMaterial({ color: 0xb8bcb8 }),
      woodPillar: new THREE.MeshLambertMaterial({ map: this.woodGrainTex }),
      gateDarkFrame: new THREE.MeshStandardMaterial({
        color: 0x374151,
        roughness: 0.35,
        metalness: 0.65,
      }),
      ironGateBlack: new THREE.MeshStandardMaterial({
        color: 0x14171a,
        roughness: 0.25,
        metalness: 0.85,
      }),
      gateGold: new THREE.MeshStandardMaterial({
        color: 0xeab308,
        roughness: 0.2,
        metalness: 0.9,
      }),
      monumentCharcoal: new THREE.MeshStandardMaterial({
        color: 0x26292e,
        roughness: 0.4,
        metalness: 0.5,
      }),
      planterStone: new THREE.MeshLambertMaterial({ color: 0x9c8c7a }),
      maroonWall: new THREE.MeshLambertMaterial({ color: 0x6b2d2d }),
      mainBlockBeige: new THREE.MeshLambertMaterial({ color: 0xdfc196 }),
      academicWall: new THREE.MeshLambertMaterial({ color: 0xe5dcc5 }),
      academicCornice: new THREE.MeshLambertMaterial({ color: 0xc7b99e }),
      granitePillar: new THREE.MeshStandardMaterial({
        color: 0x3b2820,
        roughness: 0.15,
        metalness: 0.75,
      }),
      windowGlass: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.12,
        metalness: 0.88,
      }),
      windowFrameWhite: new THREE.MeshLambertMaterial({ color: 0xf8fafc }),
      solarPanel: new THREE.MeshStandardMaterial({
        map: this.solarTex,
        roughness: 0.25,
        metalness: 0.65,
      }),
      shedRoofRed: new THREE.MeshLambertMaterial({ color: 0xd9776c }),
      quadTowerBrown: new THREE.MeshLambertMaterial({ color: 0x8c6244 }),
      busYellow: new THREE.MeshLambertMaterial({ color: 0xfacc15 }),
      busTire: new THREE.MeshLambertMaterial({ color: 0x18181b }),
      busRoofWhite: new THREE.MeshLambertMaterial({ color: 0xf8fafc }),
      treeTrunk: new THREE.MeshLambertMaterial({ color: 0x422f24 }),
      treeFoliage1: new THREE.MeshLambertMaterial({ color: 0x2e592b }),
      treeFoliage2: new THREE.MeshLambertMaterial({ color: 0x3c7336 }),
      hedgeGreen: new THREE.MeshLambertMaterial({ color: 0x294d25 }),
      bougainvillea: new THREE.MeshStandardMaterial({
        color: 0xdb2777,
        roughness: 0.65,
        metalness: 0.05,
      }),
      bougainvilleaLeaves: new THREE.MeshStandardMaterial({
        color: 0x15803d,
        roughness: 0.7,
      }),
      waypointChevron: new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 1.2,
        roughness: 0.2,
        metalness: 0.8,
      }),
      boundaryWall: new THREE.MeshLambertMaterial({ color: 0xdcd3c0 }),
      cricketTurf: new THREE.MeshLambertMaterial({ color: 0x3a8235 }),
      cricketPitch: new THREE.MeshLambertMaterial({ color: 0xc4a47c }),
      steelTower: new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.35,
        metalness: 0.8,
      }),
      royalBlueSign: new THREE.MeshStandardMaterial({
        map: this.mainBlockSignTex,
        roughness: 0.3,
        metalness: 0.5,
      }),
      waterCanal: new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.1,
        metalness: 0.2,
      }),
      courtGreen: new THREE.MeshLambertMaterial({ color: 0x065f46 }),
      courtRed: new THREE.MeshLambertMaterial({ color: 0x991b1b }),
    };

    Object.values(this.materials).forEach((mat) => this.disposables.push(mat));
  }

  // --- Procedural Canvas Generators ---

  private createGateSignboardTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1e242d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 84px "Arial Black", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '8px';
    ctx.fillText('CVR COLLEGE OF ENGINEERING', canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createSandstoneTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#dfba8c';
    ctx.fillRect(0, 0, 512, 512);

    for (let y = 0; y < 512; y += 32) {
      ctx.fillStyle = 'rgba(180, 140, 95, 0.35)';
      ctx.fillRect(0, y, 512, 2);
      ctx.fillStyle = 'rgba(255, 240, 215, 0.2)';
      ctx.fillRect(0, y + 2, 512, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 4);
    return texture;
  }

  private createEmblemTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 512, 512);

    // Outer Navy Ring
    ctx.beginPath();
    ctx.arc(256, 256, 230, 0, Math.PI * 2);
    ctx.fillStyle = '#1e3a5f';
    ctx.fill();

    // Gold Accent Ring
    ctx.beginPath();
    ctx.arc(256, 256, 212, 0, Math.PI * 2);
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#d4af37';
    ctx.stroke();

    // Maroon Inner Disc
    ctx.beginPath();
    ctx.arc(256, 256, 196, 0, Math.PI * 2);
    ctx.fillStyle = '#7a1c1c';
    ctx.fill();

    // Center Cream Core
    ctx.beginPath();
    ctx.arc(256, 256, 150, 0, Math.PI * 2);
    ctx.fillStyle = '#fff4e0';
    ctx.fill();

    // Bold CVR Monogram
    ctx.fillStyle = '#1e3a5f';
    ctx.font = '900 120px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CVR', 256, 246);

    ctx.fillStyle = '#7a1c1c';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('ESTD 2001', 256, 320);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createCurbStripeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, 64, 32);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(64, 0, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 1);
    return texture;
  }

  private createWoodGrainTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#4a3222';
    ctx.fillRect(0, 0, 256, 512);

    for (let y = 0; y < 512; y += 16) {
      ctx.fillStyle = 'rgba(25, 15, 8, 0.45)';
      ctx.fillRect(0, y, 256, 3);
      ctx.fillStyle = 'rgba(120, 85, 60, 0.15)';
      ctx.fillRect(0, y + 3, 256, 13);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 4);
    return texture;
  }

  private createSignboardTexture(text: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

    ctx.font = '900 100px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '8px';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 4);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createRooflineSignTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = '900 92px "Arial Black", sans-serif';
    ctx.letterSpacing = '12px';
    ctx.fillStyle = '#0a0d12';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CVR COLLEGE OF ENGINEERING', canvas.width / 2 + 4, canvas.height / 2 + 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CVR COLLEGE OF ENGINEERING', canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createAdmissionNoticeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 384);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 368);

    ctx.fillStyle = '#1e3a5f';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CVR COLLEGE OF ENGINEERING', 256, 70);

    ctx.fillStyle = '#b91c1c';
    ctx.font = '900 42px sans-serif';
    ctx.fillText('B.TECH ADMISSIONS', 256, 160);

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('COUNSELLING IN PROGRESS', 256, 230);
    ctx.font = 'normal 22px sans-serif';
    ctx.fillText('Report to Admin Block Room 102', 256, 290);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private createBusParkingSignTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1e40af';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 492, 236);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 58px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BUS PARKING', 256, 128);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private createSolarPanelTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 256; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 4);
    return texture;
  }

  private createAsphaltPbrTextures(): {
    map: THREE.CanvasTexture;
    roughnessMap: THREE.CanvasTexture;
  } {
    const size = 1024;
    const diffuseCanvas = document.createElement('canvas');
    diffuseCanvas.width = size;
    diffuseCanvas.height = size;
    const dCtx = diffuseCanvas.getContext('2d')!;

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const rCtx = roughCanvas.getContext('2d')!;

    dCtx.fillStyle = '#2f3238';
    dCtx.fillRect(0, 0, size, size);

    rCtx.fillStyle = '#cccccc';
    rCtx.fillRect(0, 0, size, size);

    for (let i = 0; i < 4000; i++) {
      const px = Math.random() * size;
      const py = Math.random() * size;
      const pr = Math.random() * 1.8 + 0.4;
      const gray = Math.floor(Math.random() * 55) + 35;
      dCtx.fillStyle = `rgb(${gray}, ${gray + 2}, ${gray + 5})`;
      dCtx.beginPath();
      dCtx.arc(px, py, pr, 0, Math.PI * 2);
      dCtx.fill();
    }

    const trackCenters = [240, 420, 600, 780];
    trackCenters.forEach((cx) => {
      const grad = dCtx.createLinearGradient(cx - 50, 0, cx + 50, 0);
      grad.addColorStop(0, 'rgba(30, 32, 38, 0)');
      grad.addColorStop(0.5, 'rgba(20, 22, 26, 0.4)');
      grad.addColorStop(1, 'rgba(30, 32, 38, 0)');
      dCtx.fillStyle = grad;
      dCtx.fillRect(cx - 55, 0, 110, size);

      const rGrad = rCtx.createLinearGradient(cx - 50, 0, cx + 50, 0);
      rGrad.addColorStop(0, 'rgba(200, 200, 200, 0)');
      rGrad.addColorStop(0.5, 'rgba(120, 120, 120, 0.55)');
      rGrad.addColorStop(1, 'rgba(200, 200, 200, 0)');
      rCtx.fillStyle = rGrad;
      rCtx.fillRect(cx - 55, 0, 110, size);
    });

    const map = new THREE.CanvasTexture(diffuseCanvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(3, 12);
    map.colorSpace = THREE.SRGBColorSpace;

    const roughnessMap = new THREE.CanvasTexture(roughCanvas);
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(3, 12);

    return { map, roughnessMap };
  }

  // --- Helper Methods to Register Static Obstacles ---

  private addBox(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    rotY = 0,
    hasCollision = true,
    rotX = 0,
    rotZ = 0
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, h, d);
    this.disposables.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    if (rotY !== 0) mesh.rotation.y = rotY;
    if (rotX !== 0) mesh.rotation.x = rotX;
    if (rotZ !== 0) mesh.rotation.z = rotZ;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);

    if (hasCollision) {
      this.physics.createStaticBox(x, y, z, w, h, d, rotY);
    }
    return mesh;
  }

  private addCylinder(
    x: number,
    y: number,
    z: number,
    radius: number,
    height: number,
    mat: THREE.Material,
    hasCollision = true
  ): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(radius, radius, height, 16);
    this.disposables.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);

    if (hasCollision) {
      this.physics.createStaticCylinder(x, y, z, height, radius);
    }
    return mesh;
  }

  private createRoad(
    x: number,
    z: number,
    width: number,
    length: number,
    rotY = 0,
    mat: THREE.Material = this.materials.asphalt
  ): void {
    const geo = new THREE.PlaneGeometry(width, length);
    this.disposables.push(geo);
    const road = new THREE.Mesh(geo, mat);
    road.rotation.x = -Math.PI / 2;
    if (rotY !== 0) road.rotation.z = -rotY;
    road.position.set(x, 0.015, z);
    road.receiveShadow = true;
    this.group.add(road);

    // Dashed center line
    const dashes = Math.floor((length - 4) / 7);
    for (let i = 0; i < dashes; i++) {
      const offset = -length / 2 + 3.5 + i * 7;
      const dashGeo = new THREE.PlaneGeometry(0.32, 3.5);
      this.disposables.push(dashGeo);
      const dash = new THREE.Mesh(dashGeo, this.materials.roadMarking);
      dash.rotation.x = -Math.PI / 2;
      if (rotY === 0) {
        dash.position.set(x, 0.02, z + offset);
      } else {
        const sin = Math.sin(rotY);
        const cos = Math.cos(rotY);
        dash.rotation.z = -rotY;
        dash.position.set(x - offset * sin, 0.02, z + offset * cos);
      }
      this.group.add(dash);
    }
  }

  private buildZebraCrosswalk(centerX: number, centerZ: number, widthX: number, depthZ: number, rotY = 0): void {
    const stripeCount = 8;
    const stripeWidth = 0.65;
    const spacing = depthZ / (stripeCount + 1);

    for (let i = 1; i <= stripeCount; i++) {
      const offset = -depthZ / 2 + i * spacing;
      const stripeGeo = new THREE.PlaneGeometry(widthX, stripeWidth);
      this.disposables.push(stripeGeo);
      const stripe = new THREE.Mesh(stripeGeo, this.materials.roadMarking);
      stripe.rotation.x = -Math.PI / 2;
      if (rotY !== 0) stripe.rotation.z = -rotY;
      if (rotY === 0) {
        stripe.position.set(centerX, 0.022, centerZ + offset);
      } else {
        const sin = Math.sin(rotY);
        const cos = Math.cos(rotY);
        stripe.position.set(centerX - offset * sin, 0.022, centerZ + offset * cos);
      }
      stripe.receiveShadow = true;
      this.group.add(stripe);
    }
  }

  // --- 1. Base Terrain & Official CAD Road Network (420m x 420m) ---

  private buildTerrainAndRoads(): void {
    // 420m x 420m Main Campus Base
    const groundGeo = new THREE.PlaneGeometry(420, 420);
    this.disposables.push(groundGeo);
    const groundMesh = new THREE.Mesh(groundGeo, this.materials.grass);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(0, 0, 0);
    groundMesh.receiveShadow = true;
    this.group.add(groundMesh);

    // Static physics ground collider (covers 420m at y = -0.5)
    this.physics.createStaticBox(0, -0.5, 0, 420, 1.0, 420);

    // North Approach Highway (z = -175, width 14m, length 420m, runs E-W)
    this.createRoad(0, -175, 14, 420, Math.PI / 2, this.materials.highwayAsphalt);

    // 1. Central 12M North-South Spine (x = 25, width 12m, runs from Highway z = -175 through Main Gate z = -160 to z = 115, length 290m)
    this.createRoad(25, -30, 12, 290, 0);
    // Yellow-black curbs along the 12m spine
    this.addBox(18.8, 0.17, -30, 0.45, 0.35, 290, this.materials.curbStripe, 0);
    this.addBox(31.2, 0.17, -30, 0.45, 0.35, 290, this.materials.curbStripe, 0);

    // 2. North Landscape Loop Road (z = -138, width 12m, runs East from x = 25 to 132, length 107m)
    this.createRoad(78.5, -138, 12, 107, Math.PI / 2);

    // 3. East Perimeter Road (x = 132, width 12m, runs South from z = -138 to -38, length 100m)
    this.createRoad(132, -88, 12, 100, 0);

    // 4. Main Block North Cross-Road (z = -112, width 9m, runs West from x = 25 to -95, length 120m)
    this.createRoad(-35, -112, 9, 120, Math.PI / 2);

    // 5. West Academic Divider Road (x = -38, width 12m, runs from z = -112 to 115, length 227m)
    this.createRoad(-38, 1.5, 12, 227, 0);

    // 6. PG / First Year West Service Road (x = -92, width 7.6m, runs from z = -112 to 35, length 147m)
    this.createRoad(-92, -38.5, 7.6, 147, 0);

    // 7. Main / PG South Cross-Road (z = -38, width 9m, runs from x = -92 across x = 25 to 132, length 224m)
    this.createRoad(20, -38, 9, 224, Math.PI / 2);

    // 8. Library / CSE South Cross-Road (z = -8, width 6m, runs from x = -92 to 132, length 224m)
    this.createRoad(20, -8, 6, 224, Math.PI / 2);

    // 9. Student Service / Sports Cross-Road (z = 22, width 6m, runs from x = -38 to 125, length 163m)
    this.createRoad(43.5, 22, 6, 163, Math.PI / 2);

    // 10. South-West Hostel Road (width 6m, connects x: -92, z: -38 to Boy's Hostel x: -155, z: 115)
    this.createRoad(-115, 0, 6, 80, -Math.PI / 6);
    this.createRoad(-140, 75, 6, 90, -Math.PI / 8);

    // Zebra Crosswalks at key pedestrian crossings
    this.buildZebraCrosswalk(25, -154, 11.5, 4.0); // Inside Main Gate
    this.buildZebraCrosswalk(25, -138, 11.5, 4.0); // 12M Spine & Landscape Loop
    this.buildZebraCrosswalk(25, -75, 11.5, 4.0);  // Main Building East Portico Crossing
    this.buildZebraCrosswalk(25, -38, 11.5, 4.0);  // CSE & Library Crossing
    this.buildZebraCrosswalk(-38, -75, 11.5, 4.0); // Main Block & PG Divider Crossing
  }

  // --- 2. Signature Main Entrance Gate (x = 25, z = -160, facing North -Z) ---

  private buildSignatureMainEntranceGate(): void {
    const gx = 25;
    const gz = -160;

    // --- A. WARM SANDSTONE EMBLEM WALL (Left / East of gate: x = 27 to 38, center x = 32.5) ---
    // Facing North (-Z toward approach highway)
    this.addBox(32.5, 4.75, gz, 11.0, 9.5, 1.8, this.materials.sandstoneMonument);
    // Concrete top and right borders
    this.addBox(32.5, 9.6, gz, 11.4, 0.4, 2.1, this.materials.concreteBorder);
    this.addBox(38.0, 4.75, gz, 0.8, 9.5, 2.1, this.materials.concreteBorder);

    // Central Circular CVR Emblem Medallion (radius 1.4m, mounted on North face at y = 5.4m)
    const emblemGeo = new THREE.CircleGeometry(1.4, 32);
    this.disposables.push(emblemGeo);
    const emblemMat = new THREE.MeshBasicMaterial({ map: this.emblemTex, side: THREE.DoubleSide });
    this.disposables.push(emblemMat);
    const emblemMesh = new THREE.Mesh(emblemGeo, emblemMat);
    emblemMesh.rotation.y = Math.PI; // Face North (-Z)
    emblemMesh.position.set(32.5, 5.4, gz - 0.92);
    this.group.add(emblemMesh);

    // Raised Sandstone Plinth at the base (y = 0 to 1.1m)
    this.addBox(32.5, 0.55, gz - 0.3, 10.6, 1.1, 2.4, this.materials.sandstoneMonument);

    // Stone-Brick Planter Bed with Green Shrubs (North front)
    this.addBox(32.5, 0.4, gz - 1.8, 9.8, 0.8, 1.5, this.materials.planterStone);
    this.addBox(32.5, 0.82, gz - 1.8, 9.2, 0.2, 1.2, this.materials.grassLawn, 0, false);
    for (let s = -4.0; s <= 4.0; s += 1.3) {
      const shrub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), this.materials.hedgeGreen);
      shrub.position.set(32.5 + s, 1.15, gz - 1.8);
      this.disposables.push(shrub.geometry);
      this.group.add(shrub);
    }

    // 3D Dark-Charcoal Block Letters "C V R" on North face of plinth
    this.build3DLettersCVR(32.5, 1.75, gz - 0.95);

    // --- B. DARK WALNUT WOOD-PANELED CENTRAL PILLAR (x = 25 to 27, center x = 26) ---
    this.addBox(26.0, 4.75, gz, 2.2, 9.5, 2.2, this.materials.woodPillar);

    // --- C. OVERHEAD DARK CHARCOAL LINTEL BEAM (Right / West: x = 11 to 27, center x = 19) ---
    this.addBox(19.0, 8.2, gz, 16.0, 1.6, 2.2, this.materials.gateDarkFrame);

    // Lintel Signboard: "CVR COLLEGE OF ENGINEERING" on North face
    const signGeo = new THREE.PlaneGeometry(15.2, 1.35);
    this.disposables.push(signGeo);
    const signMat = new THREE.MeshBasicMaterial({ map: this.gateSignTex, side: THREE.DoubleSide });
    this.disposables.push(signMat);
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.rotation.y = Math.PI; // Face North (-Z)
    signMesh.position.set(19.0, 8.2, gz - 1.12);
    this.group.add(signMesh);

    // Dual-Arm Streetlamp on Lintel
    this.addCylinder(19.0, 9.8, gz, 0.12, 1.5, this.materials.gateDarkFrame, false);
    this.addBox(18.1, 10.6, gz, 1.8, 0.1, 0.1, this.materials.gateDarkFrame, 0, false);
    this.addBox(19.9, 10.6, gz, 1.8, 0.1, 0.1, this.materials.gateDarkFrame, 0, false);

    // West Support Pillar (x = 11.5)
    this.addBox(11.5, 4.75, gz, 1.8, 9.5, 2.2, this.materials.gateDarkFrame);

    // --- D. ARCHED BLACK WROUGHT-IRON DOUBLE GATES ---
    // Swung open inward toward South (+Z) to frame the 12m road entrance
    this.buildArchedWroughtIronGate(13.8, gz + 2.5, 4.8, 3.8, Math.PI / 6, false); // West leaf
    this.buildArchedWroughtIronGate(24.2, gz + 2.5, 4.8, 3.8, -Math.PI / 6, true);  // East leaf with notice board

    // --- E. SECURITY GUARD CABIN (x = 17, z = -152) ---
    this.addBox(17, 2.1, -152, 4.2, 4.2, 4.5, this.materials.academicWall);
    this.addBox(17, 4.3, -152, 4.8, 0.35, 5.1, this.materials.gateDarkFrame);
    this.addBox(17, 2.2, -154.3, 2.6, 1.6, 0.1, this.materials.windowGlass, 0, false);
  }

  private build3DLettersCVR(x: number, y: number, z: number): void {
    const mat = this.materials.monumentCharcoal;
    const h = 1.35;
    const t = 0.28;

    // When facing South (+Z toward campus), Left on screen is +X, Right is -X.
    // 'C' (Left side: centered at x + 2.4)
    const cx = x + 2.4;
    this.addBox(cx + 0.35, y, z, 0.22, h, t, mat, 0, false);
    this.addBox(cx - 0.05, y + h / 2 - 0.11, z, 0.65, 0.22, t, mat, 0, false);
    this.addBox(cx - 0.05, y - h / 2 + 0.11, z, 0.65, 0.22, t, mat, 0, false);

    // 'V' (Center: centered at x)
    this.addBox(x + 0.2, y, z, 0.22, 1.4, t, mat, 0, false, 0, -0.28);
    this.addBox(x - 0.2, y, z, 0.22, 1.4, t, mat, 0, false, 0, 0.28);

    // 'R' (Right side: centered at x - 2.4)
    const rx = x - 2.4;
    this.addBox(rx + 0.35, y, z, 0.22, h, t, mat, 0, false);
    this.addBox(rx - 0.05, y + h / 2 - 0.11, z, 0.45, 0.22, t, mat, 0, false);
    this.addBox(rx - 0.05, y + 0.02, z, 0.45, 0.22, t, mat, 0, false);
    this.addBox(rx - 0.2, y + h / 4, z, 0.2, h / 2, t, mat, 0, false);
    this.addBox(rx - 0.16, y - h / 4 - 0.05, z, 0.22, 0.75, t, mat, 0, false, 0, -0.42);
  }

  private buildArchedWroughtIronGate(
    x: number,
    z: number,
    width: number,
    height: number,
    rotY: number,
    hasNotice: boolean
  ): void {
    const gateGroup = new THREE.Group();
    gateGroup.position.set(x, 0, z);
    gateGroup.rotation.y = rotY;

    // Rails
    const botRail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, 0.12), this.materials.ironGateBlack);
    botRail.position.set(0, 0.3, 0);
    gateGroup.add(botRail);

    const midRail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, 0.12), this.materials.ironGateBlack);
    midRail.position.set(0, 0.9, 0);
    gateGroup.add(midRail);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.16, 0.12), this.materials.ironGateBlack);
    topRail.position.set(0, height, 0);
    gateGroup.add(topRail);

    // Picketing & spear finials
    const barCount = 10;
    const spacing = width / (barCount + 1);
    for (let i = 1; i <= barCount; i++) {
      const bx = -width / 2 + i * spacing;
      const arch = Math.sin((i / (barCount + 1)) * Math.PI) * 0.45;
      const barH = height - 0.3 + arch;

      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, barH, 8), this.materials.ironGateBlack);
      bar.position.set(bx, barH / 2 + 0.3, 0);
      gateGroup.add(bar);

      const finial = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.25, 8), this.materials.gateGold);
      finial.position.set(bx, barH + 0.42, 0);
      gateGroup.add(finial);
    }

    if (hasNotice) {
      const noticeMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.8, 1.3),
        new THREE.MeshBasicMaterial({ map: this.noticeTex, side: THREE.DoubleSide })
      );
      noticeMesh.position.set(0, 2.2, 0.08);
      gateGroup.add(noticeMesh);
    }

    this.group.add(gateGroup);
    this.physics.createStaticBox(x, height / 2, z, width, height, 0.3, rotY);
  }

  // --- 3. North Bus Bay (x = 50 to 135, z = -163) ---

  private buildNorthBusBay(): void {
    // Earthen Red-Soil & Paved Bus Bay Ground
    const bayGeo = new THREE.PlaneGeometry(85, 26);
    this.disposables.push(bayGeo);
    const bayMesh = new THREE.Mesh(bayGeo, this.materials.redSoil);
    bayMesh.rotation.x = -Math.PI / 2;
    bayMesh.position.set(92.5, 0.018, -163);
    bayMesh.receiveShadow = true;
    this.group.add(bayMesh);

    // Bus Bay Concrete Kerbs & Shelters
    this.addBox(92.5, 0.17, -150.2, 85, 0.35, 0.45, this.materials.curbStripe, 0);
    this.addBox(92.5, 0.17, -175.8, 85, 0.35, 0.45, this.materials.curbStripe, 0);

    // Blue "BUS PARKING" Signboard at x = 54, z = -151
    this.addCylinder(54, 1.8, -151, 0.06, 3.6, this.materials.steelTower, false);
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.9),
      new THREE.MeshBasicMaterial({ map: this.busSignTex, side: THREE.DoubleSide })
    );
    signMesh.position.set(54, 3.2, -151);
    this.group.add(signMesh);

    // Parked CVR College Buses in the Bay (staggered parking rows)
    const busSlots = [88, 108, 126];
    busSlots.forEach((bx) => {
      this.buildStaticCVRBus(bx, -163, 0);
    });
  }

  private buildStaticCVRBus(x: number, z: number, yaw: number): void {
    const group = new THREE.Group();
    group.position.set(x, 1.7, z);
    group.rotation.y = yaw;

    // Body
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.9, 10.5), this.materials.busYellow);
    cabin.position.set(0, 0.4, 0);
    cabin.castShadow = true;
    group.add(cabin);

    // Maroon Skirt
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.7, 10.5), this.materials.maroonWall);
    skirt.position.set(0, -0.9, 0);
    skirt.castShadow = true;
    group.add(skirt);

    // White Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.35, 10.3), this.materials.busRoofWhite);
    roof.position.set(0, 1.45, 0);
    group.add(roof);

    // Windows
    const win = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.9, 8.5), this.materials.windowGlass);
    win.position.set(0, 0.55, 0.2);
    group.add(win);

    // Tires
    const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    [-3.2, 2.5, 3.8].forEach((wz) => {
      const leftTire = new THREE.Mesh(wheelGeo, this.materials.busTire);
      leftTire.position.set(-1.4, -1.05, wz);
      group.add(leftTire);

      const rightTire = new THREE.Mesh(wheelGeo, this.materials.busTire);
      rightTire.position.set(1.4, -1.05, wz);
      group.add(rightTire);
    });

    this.group.add(group);
    this.physics.createStaticBox(x, 1.7, z, 2.8, 3.3, 10.5, yaw);
  }

  // --- 4. Central 12M Spine Avenue & Quaternius Streetlights ---

  private buildCentral12MSpineAvenue(): void {
    // Streetlights (Streetlight_Single.glb) lining the 12M Spine Avenue
    const streetlightZ = [-145, -115, -85, -55, -25, 5, 35, 65, 95];
    this.gltfLoader.load(
      '/models/Streetlight_Single.glb',
      (gltf) => {
        streetlightZ.forEach((sz, idx) => {
          const side = idx % 2 === 0 ? 1 : -1;
          const sx = 25 + side * 6.8;
          const lamp = gltf.scene.clone();
          lamp.scale.setScalar(1.5);
          lamp.position.set(sx, 0, sz);
          lamp.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;

          lamp.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              if (child.material && (child.material.name === 'Light' || child.material.name === 'Glass')) {
                child.material = new THREE.MeshStandardMaterial({
                  color: 0xfffbeb,
                  emissive: 0xfef08a,
                  emissiveIntensity: 1.8,
                });
              }
            }
          });

          this.group.add(lamp);
          this.physics.createStaticCylinder(sx, 2.5, sz, 5.0, 0.2);
        });
      },
      undefined,
      (err) => {
        console.warn('Fallback streetlights:', err);
      }
    );

    // Overarching Multi-Branch Neem Trees lining the 12M Avenue
    this.build12MSpineTrees();

    // Floating Glowing 3D Waypoint Chevron pointing to Main Building East Portico
    this.buildWaypointChevron(25, 4.2, -75);
  }

  private build12MSpineTrees(): void {
    const treePositions: { x: number; z: number; tiltX: number; scale: number }[] = [];
    for (let z = -140; z <= 100; z += 12) {
      treePositions.push({ x: 17.5, z, tiltX: 0.1, scale: 1.05 + Math.random() * 0.2 });
      treePositions.push({ x: 32.5, z, tiltX: -0.1, scale: 1.05 + Math.random() * 0.2 });
    }

    const count = treePositions.length;
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.52, 5.2, 8);
    const branchGeo = new THREE.CylinderGeometry(0.22, 0.32, 3.4, 6);
    this.disposables.push(trunkGeo, branchGeo);

    const trunkMesh = new THREE.InstancedMesh(trunkGeo, this.materials.treeTrunk, count);
    const branchMesh = new THREE.InstancedMesh(branchGeo, this.materials.treeTrunk, count);
    trunkMesh.castShadow = true;
    branchMesh.castShadow = true;

    const foliageGeo = new THREE.DodecahedronGeometry(3.6, 0);
    const upperGeo = new THREE.DodecahedronGeometry(2.8, 0);
    this.disposables.push(foliageGeo, upperGeo);

    const foliageMesh = new THREE.InstancedMesh(foliageGeo, this.materials.treeFoliage1, count);
    const upperMesh = new THREE.InstancedMesh(upperGeo, this.materials.treeFoliage2, count);
    foliageMesh.castShadow = true;
    upperMesh.castShadow = true;

    const dummy = new THREE.Object3D();
    treePositions.forEach((tp, i) => {
      dummy.position.set(tp.x, 2.6 * tp.scale, tp.z);
      dummy.scale.set(tp.scale, tp.scale, tp.scale);
      dummy.rotation.set(0, Math.random() * Math.PI, tp.tiltX);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tp.x + (tp.tiltX > 0 ? 0.9 : -0.9), 4.4 * tp.scale, tp.z);
      dummy.rotation.set(0, 0, tp.tiltX * 2.8);
      dummy.updateMatrix();
      branchMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tp.x + (tp.tiltX > 0 ? 1.6 : -1.6), 5.8 * tp.scale, tp.z);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.updateMatrix();
      foliageMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tp.x + (tp.tiltX > 0 ? 2.6 : -2.6), 7.8 * tp.scale, tp.z);
      dummy.updateMatrix();
      upperMesh.setMatrixAt(i, dummy.matrix);

      this.physics.createStaticCylinder(tp.x, 2.6 * tp.scale, tp.z, 5.2 * tp.scale, 0.45 * tp.scale);
    });

    trunkMesh.instanceMatrix.needsUpdate = true;
    branchMesh.instanceMatrix.needsUpdate = true;
    foliageMesh.instanceMatrix.needsUpdate = true;
    upperMesh.instanceMatrix.needsUpdate = true;

    this.group.add(trunkMesh, branchMesh, foliageMesh, upperMesh);
    this.disposables.push(trunkMesh, branchMesh, foliageMesh, upperMesh);
  }

  private buildWaypointChevron(x: number, y: number, z: number): void {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const diamondGeo = new THREE.OctahedronGeometry(0.85, 0);
    this.disposables.push(diamondGeo);
    const chevronMesh = new THREE.Mesh(diamondGeo, this.materials.waypointChevron);
    chevronMesh.scale.set(0.7, 1.2, 0.7);
    group.add(chevronMesh);

    const ringGeo = new THREE.TorusGeometry(1.2, 0.05, 8, 24);
    this.disposables.push(ringGeo);
    const ringMesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
    ringMesh.rotation.x = Math.PI / 2;
    group.add(ringMesh);

    this.waypointChevron = chevronMesh;
    this.group.add(group);
  }

  // --- 5. Landscape Garden & High-Tension Transmission Tower (x = 34 to 124, z = -130 to -45) ---

  private buildLandscapeGardenAndHTTower(): void {
    // Lush Green Garden Lawn
    const lawnGeo = new THREE.PlaneGeometry(90, 85);
    this.disposables.push(lawnGeo);
    const lawnMesh = new THREE.Mesh(lawnGeo, this.materials.grassLawn);
    lawnMesh.rotation.x = -Math.PI / 2;
    lawnMesh.position.set(79, 0.018, -87.5);
    lawnMesh.receiveShadow = true;
    this.group.add(lawnMesh);

    // Sculpted Trimmed Hedges
    const hedges = [
      { x: 79, z: -120, w: 70, d: 2.0 },
      { x: 79, z: -55, w: 70, d: 2.0 },
      { x: 45, z: -87.5, w: 2.0, d: 60 },
      { x: 115, z: -87.5, w: 2.0, d: 60 },
    ];
    hedges.forEach((h) => {
      this.addBox(h.x, 0.5, h.z, h.w, 1.0, h.d, this.materials.hedgeGreen);
    });

    // Circular Central Fountain
    this.addCylinder(79, 0.4, -87.5, 7.5, 0.8, this.materials.planterStone);
    this.addCylinder(79, 0.65, -87.5, 6.8, 0.4, this.materials.waterCanal, false);
    this.addCylinder(79, 1.5, -87.5, 1.8, 2.2, this.materials.planterStone);

    // 36m Tall Steel Lattice High-Tension Transmission Tower at North-East corner (x = 142, z = -142)
    this.buildLatticeTransmissionTower(142, -142);
  }

  private buildLatticeTransmissionTower(x: number, z: number): void {
    const towerH = 36;
    const baseW = 8.5;
    const topW = 2.4;
    const mat = this.materials.steelTower;

    const corners = [
      { sx: -1, sz: -1 },
      { sx: 1, sz: -1 },
      { sx: -1, sz: 1 },
      { sx: 1, sz: 1 },
    ];

    corners.forEach((c) => {
      const legGeo = new THREE.CylinderGeometry(0.12, 0.22, towerH, 8);
      this.disposables.push(legGeo);
      const leg = new THREE.Mesh(legGeo, mat);
      const angleX = -c.sz * Math.atan2((baseW - topW) / 2, towerH);
      const angleZ = c.sx * Math.atan2((baseW - topW) / 2, towerH);
      leg.position.set(x + (c.sx * (baseW + topW)) / 4, towerH / 2, z + (c.sz * (baseW + topW)) / 4);
      leg.rotation.x = angleX;
      leg.rotation.z = angleZ;
      leg.castShadow = true;
      this.group.add(leg);
    });

    // Horizontal bracing tiers
    const tiers = [7, 14, 21, 28, 33];
    tiers.forEach((ty) => {
      const curW = baseW - (ty / towerH) * (baseW - topW);
      this.addBox(x, ty, z - curW / 2, curW, 0.2, 0.2, mat, 0, false);
      this.addBox(x, ty, z + curW / 2, curW, 0.2, 0.2, mat, 0, false);
      this.addBox(x - curW / 2, ty, z, 0.2, 0.2, curW, mat, 0, false);
      this.addBox(x + curW / 2, ty, z, 0.2, 0.2, curW, mat, 0, false);
    });

    // Cross-arms for high-tension cables
    this.addBox(x, 27, z, 17.0, 0.45, 1.2, mat, 0, false);
    this.addBox(x, 32, z, 13.5, 0.45, 1.2, mat, 0, false);

    // Static physics collider at tower base
    this.physics.createStaticBox(x, towerH / 2, z, baseW, towerH, baseW);
  }

  // --- 6. Main Building (x = -12, z = -75, 44m x 56m) with Walkable East Portico ---

  private buildMainBuildingWithWalkablePortico(): void {
    const bx = -12;
    const bz = -75;
    const bHeight = 16.0; // 4-story building

    // C-Shaped Courtyard Wings
    // West Back Wing
    this.addBox(bx - 17, bHeight / 2, bz, 10, bHeight, 56, this.materials.mainBlockBeige);
    // North Wing
    this.addBox(bx + 4, bHeight / 2, bz - 22, 32, bHeight, 12, this.materials.mainBlockBeige);
    // South Wing
    this.addBox(bx + 4, bHeight / 2, bz + 22, 32, bHeight, 12, this.materials.mainBlockBeige);

    // Central Courtyard Open Floor (walkable ground foyer)
    this.addBox(bx + 3, 0.08, bz, 28, 0.15, 30, this.materials.concrete, 0, false);

    // Roof Parapet with 3D Signboard: "CVR COLLEGE OF ENGINEERING"
    this.addBox(bx + 4, bHeight + 0.6, bz - 22, 33, 1.2, 13, this.materials.academicCornice);
    this.addBox(bx + 4, bHeight + 0.6, bz + 22, 33, 1.2, 13, this.materials.academicCornice);

    // --- GRAND DOUBLE-HEIGHT OVERHANGING EAST PORTICO (x = 10 to 18, z = -85 to -65) ---
    // Facing East (+X directly onto the 12M Spine Avenue at x = 25)
    // 1. Overhanging Upper Canopy (y = 7.5m to 9.2m)
    this.addBox(14.0, 8.35, bz, 8.0, 1.7, 20.0, this.materials.mainBlockBeige);
    this.addBox(14.0, 9.35, bz, 8.4, 0.35, 20.4, this.materials.academicCornice);

    // 2. Dark Polished Brown-Granite Pillars supporting the portico
    const pillarX = [10.5, 17.5];
    const pillarZ = [-83, -77, -73, -67];
    pillarX.forEach((px) => {
      pillarZ.forEach((pz) => {
        this.addBox(px, 3.75, pz, 1.1, 7.5, 1.1, this.materials.granitePillar);
      });
    });

    // 3. Royal Blue "MAIN BLOCK" Signboard on East Fascia of Portico Canopy
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(12.5, 1.4),
      new THREE.MeshBasicMaterial({ map: this.mainBlockSignTex, side: THREE.DoubleSide })
    );
    signMesh.rotation.y = Math.PI / 2; // Face East (+X)
    signMesh.position.set(18.22, 8.35, bz);
    this.group.add(signMesh);

    // 4. Roofline Lettering "CVR COLLEGE OF ENGINEERING"
    const roofSignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(24.0, 1.8),
      new THREE.MeshBasicMaterial({ map: this.roofSignTex, transparent: true, side: THREE.DoubleSide })
    );
    roofSignMesh.rotation.y = Math.PI / 2; // Face East (+X)
    roofSignMesh.position.set(bx + 19.5, bHeight + 1.2, bz);
    this.group.add(roofSignMesh);

    // 5. Walkable Lobby Entrance Steps & Foyer Floor
    this.addBox(14.0, 0.25, bz, 8.0, 0.5, 20.0, this.materials.concrete, 0, false);
    // Dark-tinted recessed glass foyer wall
    this.addBox(9.8, 3.75, bz, 0.2, 7.5, 18.0, this.materials.windowGlass, 0, false);
  }

  // --- 7. West Academic Blocks: PG Block & First Year Block ---

  private buildWestAcademicBlocks(): void {
    // A. PG Block (x = -65, z = -75, footprint 42m x 56m)
    // 4-Story Academic Block directly West of Main Building across 12m road (x = -38)
    this.addBox(-65, 8.0, -75, 42, 16.0, 56, this.materials.academicWall);
    this.addBox(-65, 16.4, -75, 43, 0.8, 57, this.materials.academicCornice);

    // PG Block Blue Signboard on East Facade facing the 12m Divider Road
    const pgSignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(10.0, 1.3),
      new THREE.MeshBasicMaterial({ map: this.pgBlockSignTex, side: THREE.DoubleSide })
    );
    pgSignMesh.rotation.y = Math.PI / 2; // Face East
    pgSignMesh.position.set(-43.8, 12.0, -75);
    this.group.add(pgSignMesh);

    // Windows bands on PG Block
    for (let f = 1; f <= 3; f++) {
      this.addBox(-43.85, f * 4.0, -75, 0.1, 1.6, 44.0, this.materials.windowGlass, 0, false);
    }

    // B. First Year Block (x = -65, z = -10, footprint 42m x 46m)
    // 4-Story Freshman Engineering Academic Complex South of PG Block across 9m road (z = -38)
    this.addBox(-65, 8.0, -10, 42, 16.0, 46, this.materials.academicWall);
    this.addBox(-65, 16.4, -10, 43, 0.8, 47, this.materials.academicCornice);

    // First Year Block Blue Signboard
    const fySignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(11.0, 1.3),
      new THREE.MeshBasicMaterial({ map: this.firstYearSignTex, side: THREE.DoubleSide })
    );
    fySignMesh.rotation.y = Math.PI / 2;
    fySignMesh.position.set(-43.8, 12.0, -10);
    this.group.add(fySignMesh);

    for (let f = 1; f <= 3; f++) {
      this.addBox(-43.85, f * 4.0, -10, 0.1, 1.6, 36.0, this.materials.windowGlass, 0, false);
    }
  }

  // --- 8. Central Library & Student Service Block ---

  private buildSouthAcademicAndStudentService(): void {
    // A. Central Library (x = -12, z = -23, footprint 42m x 22m)
    // 3-Story Library Block South of Main Building across 9m road (z = -38)
    this.addBox(-12, 6.0, -23, 42, 12.0, 22, this.materials.academicWall);
    this.addBox(-12, 12.4, -23, 43, 0.8, 23, this.materials.academicCornice);

    // Central Library Signboard on East Facade facing 12m Spine
    const libSignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(11.0, 1.3),
      new THREE.MeshBasicMaterial({ map: this.librarySignTex, side: THREE.DoubleSide })
    );
    libSignMesh.rotation.y = Math.PI / 2;
    libSignMesh.position.set(9.1, 9.0, -23);
    this.group.add(libSignMesh);

    // Large glass reading atrium window
    this.addBox(9.15, 5.5, -23, 0.1, 6.0, 14.0, this.materials.windowGlass, 0, false);

    // B. Student Service Block (x = -8, z = 7, footprint 36m x 20m)
    // 2-Story Block South of Library across 6m road (z = -8)
    this.addBox(-8, 4.5, 7, 36, 9.0, 20, this.materials.mainBlockBeige);
    this.addBox(-8, 9.3, 7, 37, 0.6, 21, this.materials.academicCornice);
  }

  // --- 9. CSE Building & AC Sheet Workshop Sheds ---

  private buildCSEBuildingAndWorkshops(): void {
    // A. CSE Building (x = 76, z = -23, footprint 84m x 18m)
    // Long 4-Story Computing Facilities Block South of Landscape Garden across 12m road (z = -38)
    this.addBox(76, 8.0, -23, 84, 16.0, 18, this.materials.academicWall);
    this.addBox(76, 16.4, -23, 85, 0.8, 19, this.materials.academicCornice);

    // CSE BLOCK Signboard on West Facade facing the 12M Spine Avenue
    const cseSignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(9.0, 1.3),
      new THREE.MeshBasicMaterial({ map: this.cseSignTex, side: THREE.DoubleSide })
    );
    cseSignMesh.rotation.y = -Math.PI / 2; // Face West
    cseSignMesh.position.set(33.9, 12.0, -23);
    this.group.add(cseSignMesh);

    // Continuous glass computer lab ribbon windows
    for (let f = 1; f <= 3; f++) {
      this.addBox(76, f * 4.0, -13.9, 74.0, 1.6, 0.1, this.materials.windowGlass, 0, false);
      this.addBox(76, f * 4.0, -32.1, 74.0, 1.6, 0.1, this.materials.windowGlass, 0, false);
    }

    // Solar panels on CSE roof
    this.addBox(76, 16.9, -23, 76.0, 0.1, 14.0, this.materials.solarPanel, 0, false);

    // B. AC Sheet Workshop Buildings 1, 2, and 3 (Pitched terracotta-red industrial sheds)
    const sheds = [
      { x: 82, z: 2, w: 60, d: 14, label: 'AC Sheet Building-1' },
      { x: 92, z: 16, w: 56, d: 14, label: 'AC Sheet Building-2' },
      { x: 114, z: 34, w: 48, d: 16, label: 'AC Sheet Building-3' },
    ];
    sheds.forEach((s) => {
      // Lower brick walls
      this.addBox(s.x, 2.5, s.z, s.w, 5.0, s.d, this.materials.maroonWall);
      // Pitched terracotta red corrugated roof
      this.addBox(s.x, 5.8, s.z, s.w + 1.5, 1.6, s.d + 1.2, this.materials.shedRoofRed);
    });
  }

  // --- 10. Cricket Stadium Oval & Sports Courts ---

  private buildCricketGroundAndSportsCourts(): void {
    // A. Cricket Stadium Oval (x = 82, z = 72, 84m x 64m)
    // Full green turf cricket stadium oval in the South-East quadrant
    const ovalGeo = new THREE.CylinderGeometry(42, 42, 0.15, 32);
    ovalGeo.scale(1.0, 1.0, 0.76);
    this.disposables.push(ovalGeo);
    const turfMesh = new THREE.Mesh(ovalGeo, this.materials.cricketTurf);
    turfMesh.position.set(82, 0.08, 72);
    turfMesh.receiveShadow = true;
    this.group.add(turfMesh);

    // Central Clay Cricket Pitch (22 yards = 20.1m x 3.05m)
    this.addBox(82, 0.17, 72, 3.2, 0.04, 20.1, this.materials.cricketPitch, 0, false);

    // White Boundary Rope Line
    const ropeGeo = new THREE.TorusGeometry(38, 0.15, 8, 32);
    ropeGeo.scale(1.0, 0.76, 1.0);
    this.disposables.push(ropeGeo);
    const ropeMesh = new THREE.Mesh(ropeGeo, this.materials.roadMarking);
    ropeMesh.rotation.x = Math.PI / 2;
    ropeMesh.position.set(82, 0.18, 72);
    this.group.add(ropeMesh);

    // Spectator Pavilion at South end of Cricket ground (z = 98)
    this.addBox(82, 2.5, 98, 44, 5.0, 8.0, this.materials.academicWall);
    this.addBox(82, 5.3, 98, 46, 0.6, 9.0, this.materials.academicCornice);

    // B. Sports Courts & Exam Hall
    // Basketball Court (x = -2, z = 36)
    this.addBox(-2, 0.1, 36, 28, 0.1, 15, this.materials.courtRed, 0, false);
    // Volleyball Court (x = 2, z = 68)
    this.addBox(2, 0.1, 68, 18, 0.1, 9, this.materials.courtGreen, 0, false);

    // Exam Hall & Workshop-1 (x = -24, z = 68, footprint 32m x 20m)
    this.addBox(-24, 4.5, 68, 32, 9.0, 20, this.materials.academicWall);

    // Utilities: Transformer & Generator Room (x = -56, z = 48) & STP (x = -102, z = -5)
    this.addBox(-56, 2.0, 48, 14, 4.0, 10, this.materials.academicWall);
    this.addBox(-102, 1.5, -5, 12, 3.0, 12, this.materials.concrete);
  }

  // --- 11. Boy's Hostel & West Campus ---

  private buildBoysHostelAndWestCampus(): void {
    // Boy's Hostel (x = -155, z = 115, footprint 48m x 32m, 4-story)
    this.addBox(-155, 8.0, 115, 48, 16.0, 32, this.materials.academicWall);
    this.addBox(-155, 16.4, 115, 49, 0.8, 33, this.materials.academicCornice);

    // Store Room (x = -132, z = 78, footprint 24m x 14m)
    this.addBox(-132, 3.0, 78, 24, 6.0, 14, this.materials.maroonWall);
  }

  // --- 12. Racha Kalwa (Rain Water Canal) & Perimeter Boundary ---

  private buildRachaKalwaCanalAndPerimeter(): void {
    // Stylized Rain Water Canal curving along East (x = 152) and South (z = 115) boundary
    // East Canal Section (x = 152, z = -140 to 115, width 6m)
    const eastCanalGeo = new THREE.PlaneGeometry(6, 255);
    this.disposables.push(eastCanalGeo);
    const eastCanal = new THREE.Mesh(eastCanalGeo, this.materials.waterCanal);
    eastCanal.rotation.x = -Math.PI / 2;
    eastCanal.position.set(152, 0.012, -12.5);
    this.group.add(eastCanal);
    // Sloped stone embankments along East canal
    this.addBox(148.8, 0.25, -12.5, 0.6, 0.5, 255, this.materials.planterStone);
    this.addBox(155.2, 0.25, -12.5, 0.6, 0.5, 255, this.materials.planterStone);

    // South Canal Section (z = 115, x = -80 to 152, width 6m)
    const southCanalGeo = new THREE.PlaneGeometry(232, 6);
    this.disposables.push(southCanalGeo);
    const southCanal = new THREE.Mesh(southCanalGeo, this.materials.waterCanal);
    southCanal.rotation.x = -Math.PI / 2;
    southCanal.position.set(36, 0.012, 115);
    this.group.add(southCanal);

    // Campus Perimeter Boundary Walls (Height 2.4m, thickness 0.45m)
    // North Boundary Wall (z = -170, with openings for Main Gate x = 11 to 38 and Bus Bay)
    this.addBox(-95, 1.2, -170, 190, 2.4, 0.45, this.materials.boundaryWall);
    this.addBox(170, 1.2, -170, 70, 2.4, 0.45, this.materials.boundaryWall);

    // East Boundary Wall (x = 160, z = -170 to 125, length 295m)
    this.addBox(160, 1.2, -22.5, 0.45, 2.4, 295, this.materials.boundaryWall);

    // South Boundary Wall (z = 125, x = -190 to 160, length 350m)
    this.addBox(-15, 1.2, 125, 350, 2.4, 0.45, this.materials.boundaryWall);

    // West Boundary Wall (x = -190, z = -170 to 125, length 295m)
    this.addBox(-190, 1.2, -22.5, 0.45, 2.4, 295, this.materials.boundaryWall);
  }

  // --- Dynamic Zone Detection (Matching True CAD 14 Zones) ---

  public detectZone(pos: { x: number; y: number; z: number }): { zone: CampusZone; description: string } {
    const x = pos.x;
    const z = pos.z;

    // 1. North Main Gate & Bus Bay
    if (z < -145) {
      return {
        zone: 'Main Entrance Gate & Bus Bay',
        description: 'Iconic Portal, Sandstone Emblem Monument, Wrought-Iron Gates & North Bus Bay',
      };
    }

    // 2. Landscape Garden & HT Tower (x: 34 to 130, z: -138 to -42)
    if (x >= 34 && x <= 130 && z >= -138 && z <= -42) {
      return {
        zone: 'Landscape Garden & HT Tower',
        description: 'Lush Garden Park, Trimmed Hedges, Pathways & 36m Steel Lattice HT Tower',
      };
    }

    // 3. CSE Building (x: 34 to 125, z: -42 to -12)
    if (x >= 34 && x <= 125 && z > -42 && z <= -12) {
      return {
        zone: 'Computer Science Block (CSE)',
        description: '4-Story Computing Facilities, AI/ML Research Laboratories & Innovation Centers',
      };
    }

    // 4. AC Sheet Workshop Sheds (x: 34 to 135, z: -12 to 42)
    if (x >= 34 && x <= 135 && z > -12 && z <= 42) {
      return {
        zone: 'AC Sheet Workshop Sheds',
        description: 'Pitched Terracotta-Red Workshop Sheds (Buildings 1, 2, and 3)',
      };
    }

    // 5. Cricket Stadium & Pavilion (x: 34, z > 42)
    if (x >= 34 && z > 42) {
      return {
        zone: 'Cricket Stadium & Pavilion',
        description: 'Athletic Turf Oval, Central Pitch & Stepped Spectator Pavilion',
      };
    }

    // 6. Main Building (East Portico) (x: -36 to 30, z: -105 to -42)
    if (x >= -36 && x <= 30 && z >= -105 && z <= -42) {
      return {
        zone: 'Main Building (East Portico)',
        description: 'East-Facing Overhanging Portico, Dark Granite Pillars & Royal-Blue Sign',
      };
    }

    // 7. PG Block (x < -36, z: -105 to -42)
    if (x < -36 && z >= -105 && z <= -42) {
      return {
        zone: 'PG Block',
        description: '4-Story Postgraduate & Engineering Research Wing West of Main Building',
      };
    }

    // 8. Central Library (x: -36 to 30, z: -42 to -12)
    if (x >= -36 && x <= 30 && z > -42 && z <= -12) {
      return {
        zone: 'Central Library',
        description: '3-Story Central Academic Library South of Main Building',
      };
    }

    // 9. First Year Block (x < -36, z: -42 to 15)
    if (x < -36 && z > -42 && z <= 15) {
      return {
        zone: 'First Year Block',
        description: '4-Story Freshman Engineering Academic Complex',
      };
    }

    // 10. Student Service Block (x: -36 to 30, z: -12 to 20)
    if (x >= -36 && x <= 30 && z > -12 && z <= 20) {
      return {
        zone: 'Student Service Block',
        description: 'Student Center, Administrative Counters & Amenities Block',
      };
    }

    // 11. Sports Courts & Exam Hall (x: -60 to 30, z > 20)
    if (x >= -60 && x <= 30 && z > 20) {
      return {
        zone: 'Sports Courts & Exam Hall',
        description: 'Basketball & Volleyball Courts, Exam Hall & Utilities',
      };
    }

    // 12. Boy's Hostel & West Campus (x < -60, z > 15)
    if (x < -60 && z > 15) {
      return {
        zone: 'Boy\'s Hostel & West Campus',
        description: 'Multi-Story Residential Hostel Block & South-West Grounds',
      };
    }

    // 13. Racha Kalwa Perimeter Canal (Perimeter edges)
    if (x >= 145 || z >= 110) {
      return {
        zone: 'Racha Kalwa Perimeter Canal',
        description: 'Curving Rain Water Canal & Stone Embankments on Campus Perimeter',
      };
    }

    // 14. Central 12M Spine Avenue (Default)
    return {
      zone: 'Central 12M Spine Avenue',
      description: '12m Wide Central Avenue Spine connecting North Gate to Campus Core',
    };
  }

  public dispose(): void {
    this.disposables.forEach((item) => {
      try {
        item.dispose();
      } catch (e) {
        // ignore
      }
    });
  }
}
