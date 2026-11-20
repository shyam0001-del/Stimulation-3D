import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { PhysicsWorld } from './PhysicsWorld';

export interface VehicleData {
  id: string;
  name: string;
  group: THREE.Group;
  rigidBody: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  speed: number;
  maxSpeed: number;
  acceleration: number;
  reverseSpeed: number;
  steerAngle: number;
  turnSpeed: number;
  yaw: number;
  cameraDistance: number;
  cameraHeight: number;
  dimensions: { width: number; height: number; depth: number };
  exitOffset: { x: number; y: number; z: number };
  wheelMeshes?: THREE.Object3D[];
}

export class VehicleController {
  private scene: THREE.Scene;
  private physics: PhysicsWorld;
  public vehicles: Map<string, VehicleData> = new Map();
  public activeVehicle: VehicleData | null = null;
  public isDriving = false;

  private gltfLoader: GLTFLoader;
  private disposables: { dispose: () => void }[] = [];

  constructor(scene: THREE.Scene, physics: PhysicsWorld) {
    this.scene = scene;
    this.physics = physics;
    this.gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/gltf/');
    this.gltfLoader.setDRACOLoader(dracoLoader);

    this.initVehicles();
  }

  private initVehicles(): void {
    // 1. CVR College Bus (North Bus Bay: x: 68, z: -163, facing South)
    this.createCVRBus(68, 1.7, -163, 0);

    // 2. Campus Car (12M Spine Avenue Parking: x: 29, z: -120, facing South)
    this.createCampusCar(29, 0.8, -120, 0);

    // 3. Campus Scooter (Near Main Gate security post: x: 21, z: -145, facing South)
    this.createCampusScooter(21, 0.6, -145, 0);
  }

  // --- CVR COLLEGE BUS BUILDER ---
  private createCVRBus(x: number, y: number, z: number, initialYaw: number): void {
    const group = new THREE.Group();
    group.name = 'CVR_College_Bus';

    const width = 2.5;
    const height = 3.1;
    const depth = 10.5;

    // Body Materials
    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15, // Golden yellow CVR bus livery
      roughness: 0.35,
      metalness: 0.2,
    });
    const maroonMat = new THREE.MeshStandardMaterial({
      color: 0x881337, // Maroon lower stripe
      roughness: 0.4,
      metalness: 0.15,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      roughness: 0.08,
      metalness: 0.1,
      transmission: 0.65,
      transparent: true,
      opacity: 0.9,
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.85,
      metalness: 0.1,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      roughness: 0.25,
      metalness: 0.8,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.9,
    });
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xfef08a,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: 0xef4444,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });

    // 1. Lower Chassis & Maroon Skirt
    const skirtGeo = new THREE.BoxGeometry(width, 0.7, depth);
    const skirtMesh = new THREE.Mesh(skirtGeo, maroonMat);
    skirtMesh.position.set(0, -0.9, 0);
    skirtMesh.castShadow = true;
    skirtMesh.receiveShadow = true;
    group.add(skirtMesh);

    // 2. Main Yellow Cabin
    const cabinGeo = new THREE.BoxGeometry(width, 1.9, depth);
    const cabinMesh = new THREE.Mesh(cabinGeo, yellowMat);
    cabinMesh.position.set(0, 0.4, 0);
    cabinMesh.castShadow = true;
    cabinMesh.receiveShadow = true;
    group.add(cabinMesh);

    // 3. Curved White Roof
    const roofGeo = new THREE.BoxGeometry(width - 0.1, 0.35, depth - 0.2);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.set(0, 1.45, 0);
    roofMesh.castShadow = true;
    group.add(roofMesh);

    // Roof A/C Vents
    for (let vz = -2; vz <= 2; vz += 2) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 1.2), chromeMat);
      vent.position.set(0, 1.7, vz);
      vent.castShadow = true;
      group.add(vent);
    }

    // 4. Large Continuous Side Glass Windows
    // Left & Right Windows bands
    const winWidth = 0.08;
    const winHeight = 0.9;
    const winDepth = 8.5;
    const leftWin = new THREE.Mesh(new THREE.BoxGeometry(winWidth, winHeight, winDepth), glassMat);
    leftWin.position.set(-width / 2 - 0.01, 0.55, 0.2);
    group.add(leftWin);

    const rightWin = new THREE.Mesh(new THREE.BoxGeometry(winWidth, winHeight, winDepth), glassMat);
    rightWin.position.set(width / 2 + 0.01, 0.55, 0.2);
    group.add(rightWin);

    // Front Windshield (front is -Z in vehicle local space)
    const frontWindshield = new THREE.Mesh(new THREE.BoxGeometry(width - 0.3, 1.1, 0.1), glassMat);
    frontWindshield.position.set(0, 0.55, -depth / 2 - 0.01);
    group.add(frontWindshield);

    // Rear Window
    const rearWin = new THREE.Mesh(new THREE.BoxGeometry(width - 0.4, 0.8, 0.1), glassMat);
    rearWin.position.set(0, 0.65, depth / 2 + 0.01);
    group.add(rearWin);

    // 5. CVR College Side Livery Signboards
    const sideSignTex = this.createBusSideSignTexture();
    this.disposables.push(sideSignTex);
    const sideSignMat = new THREE.MeshBasicMaterial({
      map: sideSignTex,
      transparent: true,
    });
    const sideSignGeo = new THREE.PlaneGeometry(6.2, 0.55);

    // Left sign (facing -X)
    const leftSign = new THREE.Mesh(sideSignGeo, sideSignMat);
    leftSign.rotation.y = -Math.PI / 2;
    leftSign.position.set(-width / 2 - 0.02, -0.3, 0.3);
    group.add(leftSign);

    // Right sign (facing +X)
    const rightSign = new THREE.Mesh(sideSignGeo, sideSignMat);
    rightSign.rotation.y = Math.PI / 2;
    rightSign.position.set(width / 2 + 0.02, -0.3, 0.3);
    group.add(rightSign);

    // Front Destination Board ("CVR - IBRAHIMPATNAM")
    const destTex = this.createDestinationSignTexture();
    this.disposables.push(destTex);
    const destMat = new THREE.MeshBasicMaterial({ map: destTex });
    const destMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.32), destMat);
    destMesh.rotation.y = Math.PI;
    destMesh.position.set(0, 1.25, -depth / 2 - 0.02);
    group.add(destMesh);

    // 6. Chrome Grille & Headlights
    const grilleMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.15), chromeMat);
    grilleMesh.position.set(0, -0.65, -depth / 2 - 0.02);
    group.add(grilleMesh);

    // Dual Headlights
    const hlGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.1, 16);
    hlGeo.rotateX(Math.PI / 2);
    const leftHL = new THREE.Mesh(hlGeo, headlightMat);
    leftHL.position.set(-1.0, -0.65, -depth / 2 - 0.03);
    group.add(leftHL);
    const rightHL = new THREE.Mesh(hlGeo, headlightMat);
    rightHL.position.set(1.0, -0.65, -depth / 2 - 0.03);
    group.add(rightHL);

    // Rear Taillights
    const tlGeo = new THREE.BoxGeometry(0.25, 0.45, 0.08);
    const leftTL = new THREE.Mesh(tlGeo, taillightMat);
    leftTL.position.set(-1.1, -0.5, depth / 2 + 0.02);
    group.add(leftTL);
    const rightTL = new THREE.Mesh(tlGeo, taillightMat);
    rightTL.position.set(1.1, -0.5, depth / 2 + 0.02);
    group.add(rightTL);

    // 7. 6 Heavy Rubber Wheels with Silver Rims
    const wheelMeshes: THREE.Object3D[] = [];
    const wheelRadius = 0.55;
    const wheelWidth = 0.38;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 20);
    wheelGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.55, wheelRadius * 0.55, wheelWidth + 0.02, 16);
    rimGeo.rotateZ(Math.PI / 2);

    const wheelZOffsets = [-3.2, 2.5, 3.8]; // Front wheel, Rear dual axles
    wheelZOffsets.forEach((wz) => {
      // Left wheel
      const leftWheel = new THREE.Group();
      leftWheel.add(new THREE.Mesh(wheelGeo, tireMat));
      leftWheel.add(new THREE.Mesh(rimGeo, rimMat));
      leftWheel.position.set(-width / 2 + 0.05, -1.05, wz);
      leftWheel.castShadow = true;
      group.add(leftWheel);
      wheelMeshes.push(leftWheel);

      // Right wheel
      const rightWheel = new THREE.Group();
      rightWheel.add(new THREE.Mesh(wheelGeo, tireMat));
      rightWheel.add(new THREE.Mesh(rimGeo, rimMat));
      rightWheel.position.set(width / 2 - 0.05, -1.05, wz);
      rightWheel.castShadow = true;
      group.add(rightWheel);
      wheelMeshes.push(rightWheel);
    });

    group.position.set(x, y, z);
    group.rotation.y = initialYaw;
    this.scene.add(group);

    // Rapier Physics Body
    const { body, collider } = this.physics.createDynamicBox(x, y, z, width, height, depth, 4500);

    const vehicleData: VehicleData = {
      id: 'cvr-bus',
      name: 'CVR College Bus',
      group,
      rigidBody: body,
      collider,
      speed: 0,
      maxSpeed: 16.0, // ~58 km/h
      acceleration: 9.0,
      reverseSpeed: 6.0,
      steerAngle: 0,
      turnSpeed: 1.2,
      yaw: initialYaw,
      cameraDistance: 13.5,
      cameraHeight: 4.8,
      dimensions: { width, height, depth },
      exitOffset: { x: -2.4, y: 0, z: -2.5 },
      wheelMeshes,
    };

    this.vehicles.set('cvr-bus', vehicleData);
  }

  // --- CAMPUS CAR BUILDER (ferrari.glb / Mint Campus Car: 1.45m tall, 4.1m long) ---
  private createCampusCar(x: number, y: number, z: number, initialYaw: number): void {
    const group = new THREE.Group();
    group.name = 'Campus_Car';

    const width = 1.85;
    const height = 1.45;
    const depth = 4.1;

    // Create Rapier body immediately so physics is active
    const { body, collider } = this.physics.createDynamicBox(x, y, z, width, height, depth, 1400);

    group.position.set(x, y, z);
    group.rotation.y = initialYaw;
    this.scene.add(group);

    const vehicleData: VehicleData = {
      id: 'campus-car',
      name: 'Mint Campus Car',
      group,
      rigidBody: body,
      collider,
      speed: 0,
      maxSpeed: 24.0, // ~86 km/h
      acceleration: 18.0,
      reverseSpeed: 8.0,
      steerAngle: 0,
      turnSpeed: 2.1,
      yaw: initialYaw,
      cameraDistance: 8.0,
      cameraHeight: 2.4,
      dimensions: { width, height, depth },
      exitOffset: { x: -1.8, y: 0, z: 0 },
    };

    this.vehicles.set('campus-car', vehicleData);

    // Load car.glb model
    this.gltfLoader.load(
      '/models/car.glb',
      (gltf) => {
        const carModel = gltf.scene;
        // Retint materials for campus look
        carModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = false;

            const mat = child.material as THREE.MeshStandardMaterial;
            if (mat) {
              if (mat.name === 'Body_Color' || mat.name === 'Ferrari_Yellow') {
                // Sleek Emerald / Mint Green campus EV coat
                child.material = new THREE.MeshStandardMaterial({
                  color: 0x10b981,
                  roughness: 0.15,
                  metalness: 0.7,
                });
              } else if (mat.name === 'Leather_red') {
                child.material = new THREE.MeshStandardMaterial({
                  color: 0x1e293b,
                  roughness: 0.6,
                });
              }
            }
          }
        });

        // Compute model bounds to align and scale to exact 1.45m height and 4.1m length
        const box = new THREE.Box3().setFromObject(carModel);
        const size = box.getSize(new THREE.Vector3());
        const scale = Math.min(depth / (size.z || 1.0), height / (size.y || 1.0));
        carModel.scale.setScalar(scale);

        // Center car model on origin and place wheels at base
        const scaledBox = new THREE.Box3().setFromObject(carModel);
        const center = scaledBox.getCenter(new THREE.Vector3());
        carModel.position.set(-center.x, -scaledBox.min.y - height / 2 + 0.05, -center.z);
        // Face forward (-Z)
        carModel.rotation.y = Math.PI;

        group.add(carModel);
      },
      undefined,
      (err) => {
        console.warn('Fallback car model used:', err);
        const bodyMesh = new THREE.Mesh(
          new THREE.BoxGeometry(width, height * 0.7, depth),
          new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.2, metalness: 0.6 })
        );
        bodyMesh.position.y = 0.1;
        group.add(bodyMesh);
      }
    );
  }

  // --- CAMPUS SCOOTER BUILDER (Activa proportions: 1.15m tall, 1.85m long, dark metallic) ---
  private createCampusScooter(x: number, y: number, z: number, initialYaw: number): void {
    const group = new THREE.Group();
    group.name = 'Campus_Scooter';

    const width = 0.75;
    const height = 1.15;
    const depth = 1.85;

    const { body, collider } = this.physics.createDynamicBox(x, y, z, width, height, depth, 220);

    group.position.set(x, y, z);
    group.rotation.y = initialYaw;
    this.scene.add(group);

    const vehicleData: VehicleData = {
      id: 'campus-scooter',
      name: 'Campus Scooter',
      group,
      rigidBody: body,
      collider,
      speed: 0,
      maxSpeed: 18.0, // ~65 km/h
      acceleration: 15.0,
      reverseSpeed: 4.5,
      steerAngle: 0,
      turnSpeed: 2.8,
      yaw: initialYaw,
      cameraDistance: 6.0,
      cameraHeight: 1.9,
      dimensions: { width, height, depth },
      exitOffset: { x: -1.2, y: 0, z: 0 },
    };

    this.vehicles.set('campus-scooter', vehicleData);

    this.gltfLoader.load(
      '/models/scooter.glb',
      (gltf) => {
        const scooterModel = gltf.scene;

        // Metric normalization: 1.15m height, 1.85m length
        const box = new THREE.Box3().setFromObject(scooterModel);
        const size = box.getSize(new THREE.Vector3());
        const scale = Math.min(height / (size.y || 1.0), depth / (size.z || 1.0));
        scooterModel.scale.setScalar(scale);

        const scaledBox = new THREE.Box3().setFromObject(scooterModel);
        const center = scaledBox.getCenter(new THREE.Vector3());
        scooterModel.position.set(-center.x, -scaledBox.min.y - height / 2 + 0.05, -center.z);
        scooterModel.rotation.y = Math.PI;

        // Realistic sleek dark-metallic silver / graphite commuter scooter (Activa styling)
        scooterModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = false;

            const name = child.name.toLowerCase();
            if (name.includes('body') || name.includes('frame') || (!name.includes('wheel') && !name.includes('tire') && !name.includes('seat'))) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0x334155, // Dark Slate / Gunmetal Grey Metallic
                metalness: 0.8,
                roughness: 0.25,
              });
            } else if (name.includes('seat')) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0x18181b, // Black textured leather
                roughness: 0.85,
              });
            } else {
              child.material = new THREE.MeshStandardMaterial({
                color: 0x27272a, // Dark rubber wheels and rim
                roughness: 0.6,
                metalness: 0.4,
              });
            }
          }
        });

        group.add(scooterModel);
      },
      undefined,
      (err) => {
        console.warn('Fallback scooter used:', err);
      }
    );
  }

  // --- PROCEDURAL TEXTURES FOR CVR BUS ---
  private createBusSideSignTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Yellow background
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, 1024, 128);

    // Maroon accent border
    ctx.strokeStyle = '#881337';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 1008, 112);

    // CVR Emblem Circle
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.arc(64, 64, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CVR', 64, 64);

    // Main Text: "CVR COLLEGE OF ENGINEERING"
    ctx.fillStyle = '#881337';
    ctx.font = '900 46px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CVR COLLEGE OF ENGINEERING', 130, 54);

    // Subtitle: "VASTUNAGAR • MANGALPALLY • HYDERABAD"
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('COLLEGE BUS • VASTUNAGAR, MANGALPALLY', 132, 98);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createDestinationSignTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;

    // Dark LED Board
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 96);

    // Amber LED Text
    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 38px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CVR - IBRAHIMPATNAM', 256, 48);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // --- PROXIMITY DETECTION ---
  public getNearbyVehicle(playerPos: { x: number; y: number; z: number }, maxDistance = 4.2): VehicleData | null {
    let closest: VehicleData | null = null;
    let minDist = maxDistance;

    for (const vehicle of this.vehicles.values()) {
      const vPos = vehicle.rigidBody.translation();
      const dist = Math.hypot(playerPos.x - vPos.x, playerPos.z - vPos.z);
      if (dist < minDist) {
        minDist = dist;
        closest = vehicle;
      }
    }
    return closest;
  }

  // --- ENTER / EXIT VEHICLE ---
  public enterVehicle(vehicle: VehicleData): void {
    this.activeVehicle = vehicle;
    this.isDriving = true;
  }

  public exitVehicle(playerTeleport: (x: number, y: number, z: number, facingAngle?: number) => void): void {
    if (!this.activeVehicle) return;

    const vPos = this.activeVehicle.rigidBody.translation();
    const yaw = this.activeVehicle.yaw;

    // Place player beside vehicle driver door
    const exitX = vPos.x + Math.cos(yaw) * this.activeVehicle.exitOffset.x - Math.sin(yaw) * this.activeVehicle.exitOffset.z;
    const exitZ = vPos.z + Math.sin(yaw) * this.activeVehicle.exitOffset.x + Math.cos(yaw) * this.activeVehicle.exitOffset.z;

    playerTeleport(exitX, 1.5, exitZ, yaw);

    this.activeVehicle.speed = 0;
    this.activeVehicle.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);

    this.activeVehicle = null;
    this.isDriving = false;
  }

  // --- FIXED-TIMESTEP PHYSICS UPDATE (60Hz) ---
  public physicsUpdate(dt: number, keys: Record<string, boolean>): void {
    if (!this.isDriving || !this.activeVehicle) {
      // Idle vehicles: apply damping to stop slight drifts
      for (const v of this.vehicles.values()) {
        const vel = v.rigidBody.linvel();
        if (Math.hypot(vel.x, vel.z) > 0.05) {
          v.rigidBody.setLinvel({ x: vel.x * 0.92, y: vel.y, z: vel.z * 0.92 }, true);
        }
      }
      return;
    }

    const v = this.activeVehicle;

    // Driving Controls: W/S Accelerate/Brake, A/D Steer, Space Handbrake
    const isAccelerating = !!(keys['KeyW'] || keys['ArrowUp']);
    const isReversing = !!(keys['KeyS'] || keys['ArrowDown']);
    const isSteeringLeft = !!(keys['KeyA'] || keys['ArrowLeft']);
    const isSteeringRight = !!(keys['KeyD'] || keys['ArrowRight']);
    const isHandbrake = !!keys['Space'];

    // Acceleration & Braking
    if (isHandbrake) {
      v.speed = THREE.MathUtils.lerp(v.speed, 0, Math.min(1.0, 10.0 * dt));
    } else if (isAccelerating) {
      v.speed = Math.min(v.maxSpeed, v.speed + v.acceleration * dt);
    } else if (isReversing) {
      v.speed = Math.max(-v.reverseSpeed, v.speed - v.acceleration * 0.8 * dt);
    } else {
      // Natural rolling friction
      v.speed = THREE.MathUtils.lerp(v.speed, 0, Math.min(1.0, 3.5 * dt));
    }

    // Steering
    let targetSteer = 0;
    if (isSteeringLeft) targetSteer += 1;
    if (isSteeringRight) targetSteer -= 1;

    // Turn rate scales with speed direction so turning in reverse feels natural
    const speedFactor = Math.min(Math.abs(v.speed) / 3.0, 1.0);
    const steerDir = v.speed >= 0 ? 1 : -1;
    v.yaw += targetSteer * v.turnSpeed * dt * speedFactor * steerDir;

    // Calculate forward velocity vector: forward is -Z rotated by yaw
    // in world: worldX = -sin(yaw) * speed, worldZ = -cos(yaw) * speed
    const vx = -Math.sin(v.yaw) * v.speed;
    const vz = -Math.cos(v.yaw) * v.speed;

    const currentVel = v.rigidBody.linvel();
    v.rigidBody.setLinvel({ x: vx, y: currentVel.y, z: vz }, true);

    // Roll wheels if present
    if (v.wheelMeshes && Math.abs(v.speed) > 0.1) {
      const rollDelta = (v.speed / 0.5) * dt;
      v.wheelMeshes.forEach((w) => {
        w.rotation.x += rollDelta;
      });
    }
  }

  // --- SYNC VISUALS ---
  public updateVisuals(): void {
    for (const v of this.vehicles.values()) {
      const pos = v.rigidBody.translation();
      v.group.position.set(pos.x, pos.y, pos.z);
      v.group.rotation.y = v.yaw;
    }
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
