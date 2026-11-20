import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { PhysicsWorld } from './PhysicsWorld';
import { CVRCampusMap } from './CVRCampusMap';
import { PlayerController } from './PlayerController';
import { VehicleController } from './VehicleController';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { GameState } from '../types/game';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private dirLight!: THREE.DirectionalLight;
  private sky!: Sky;

  private physics!: PhysicsWorld;
  private campus!: CVRCampusMap;
  public player!: PlayerController;
  public vehicles!: VehicleController;
  public cameraController!: ThirdPersonCamera;

  // Fixed Timestep Loop Accumulator (60Hz physics for Apple Silicon & desktop)
  private readonly fixedTimeStep = 1 / 60;
  private accumulator = 0;
  private lastTime = 0;
  private animationFrameId: number | null = null;
  private isRunning = false;
  private isDisposed = false;

  // FPS and State Reporting
  private stateCallback: ((state: GameState) => void) | null = null;
  private frameCount = 0;
  private fpsTimer = 0;
  private currentFps = 60;
  private statePublishTimer = 0;

  // Key tracking for vehicle interactions
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onResizeBound: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.onResizeBound = this.onResize.bind(this);
    this.onKeyDownBound = this.handleKeyDown.bind(this);
  }

  public async init(): Promise<void> {
    // 1. Initialize Rapier Physics World
    const physicsWorld = await PhysicsWorld.create({ x: 0.0, y: -9.81, z: 0.0 });
    if (this.isDisposed) {
      physicsWorld.dispose();
      return;
    }
    this.physics = physicsWorld;

    // 2. Initialize Three.js Scene & Fog
    this.scene = new THREE.Scene();
    const fogColor = new THREE.Color(0xcfdde8);
    this.scene.fog = new THREE.FogExp2(fogColor, 0.0055);

    // 3. Configure WebGL2 High-Performance Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // 4. Image-Based Lighting (IBL) via PMREMGenerator & RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envTexture;

    // 5. Sky Dome & Physical Sun Position
    this.setupSkyAndSun();

    // 6. Build CVR Campus Layout & Colliders
    this.campus = new CVRCampusMap(this.physics);
    this.scene.add(this.campus.group);

    // 7. Spawn Rigged Humanoid Student Character
    this.player = new PlayerController(this.scene, this.physics);

    // 8. Spawn Interactive Vehicles (CVR Bus, Campus Car, Campus Scooter)
    this.vehicles = new VehicleController(this.scene, this.physics);

    // 9. Setup Smooth Orbit Camera
    this.cameraController = new ThirdPersonCamera(this.canvas);

    // 10. Attach Event Listeners
    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('keydown', this.onKeyDownBound);
  }

  private setupSkyAndSun(): void {
    // Atmospheric Sky Dome
    this.sky = new Sky();
    this.sky.scale.setScalar(450000);
    this.scene.add(this.sky);

    const sun = new THREE.Vector3();
    const elevation = 28; // Warm golden morning/afternoon sun
    const azimuth = 115;
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    sun.setFromSphericalCoords(1, phi, theta);

    this.sky.material.uniforms['sunPosition'].value.copy(sun);
    this.sky.material.uniforms['turbidity'].value = 8;
    this.sky.material.uniforms['rayleigh'].value = 1.35;
    this.sky.material.uniforms['mieCoefficient'].value = 0.005;
    this.sky.material.uniforms['mieDirectionalG'].value = 0.8;

    // Directional Sunlight with 2048x2048 Soft Shadow Map
    this.dirLight = new THREE.DirectionalLight(0xfffaec, 2.5);
    this.dirLight.position.set(sun.x * 200, sun.y * 200, sun.z * 200);
    this.dirLight.castShadow = true;

    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 420;
    this.dirLight.shadow.bias = -0.0004;
    this.dirLight.shadow.normalBias = 0.02;

    const shadowExtent = 110;
    this.dirLight.shadow.camera.left = -shadowExtent;
    this.dirLight.shadow.camera.right = shadowExtent;
    this.dirLight.shadow.camera.top = shadowExtent;
    this.dirLight.shadow.camera.bottom = -shadowExtent;

    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // Ambient / Fill light
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x5a4a3a, 0.85);
    this.scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.code === 'KeyF') {
      if (this.vehicles.isDriving) {
        // Exit active vehicle
        this.vehicles.exitVehicle((x, y, z, facingAngle) => {
          this.player.teleportTo(x, y, z, facingAngle);
          this.player.setVisible(true);
        });
      } else {
        // Check proximity to vehicle
        const playerPos = this.player.getPosition();
        const nearby = this.vehicles.getNearbyVehicle(playerPos, 4.2);
        if (nearby) {
          this.vehicles.enterVehicle(nearby);
          this.player.setVisible(false);
        }
      }
    }
  }

  public start(): void {
    if (this.isRunning || this.isDisposed) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.tick(this.lastTime);
  }

  private tick = (currentTime: number): void => {
    if (!this.isRunning || this.isDisposed) return;

    this.animationFrameId = requestAnimationFrame(this.tick);

    const frameDelta = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    // Fixed-timestep physics accumulator (60Hz)
    this.accumulator += frameDelta;
    const cameraAzimuth = this.cameraController.getAzimuth();

    while (this.accumulator >= this.fixedTimeStep) {
      this.physics.step();

      if (this.vehicles.isDriving && this.vehicles.activeVehicle) {
        this.vehicles.physicsUpdate(this.fixedTimeStep, this.player.keys);
        // Keep player position anchored to vehicle so zone tracking & teleporting stays coherent
        const vPos = this.vehicles.activeVehicle.rigidBody.translation();
        this.player.rigidBody.setTranslation({ x: vPos.x, y: vPos.y + 1.0, z: vPos.z }, true);
        this.player.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      } else {
        this.player.physicsUpdate(this.fixedTimeStep, cameraAzimuth);
        this.vehicles.physicsUpdate(this.fixedTimeStep, this.player.keys);
      }

      this.accumulator -= this.fixedTimeStep;
    }

    // Sync visuals with Rapier physics
    this.player.updateVisuals();
    this.vehicles.updateVisuals();

    // Determine target entity for camera & sunlight
    let focusPos: { x: number; y: number; z: number };
    let activeSpeed = this.player.currentSpeed;

    if (this.vehicles.isDriving && this.vehicles.activeVehicle) {
      const v = this.vehicles.activeVehicle;
      const vPos = v.rigidBody.translation();
      focusPos = { x: vPos.x, y: vPos.y + 0.6, z: vPos.z };
      activeSpeed = Math.abs(v.speed);

      // Follow vehicle with camera
      this.cameraController.update(frameDelta, focusPos);
    } else {
      const pPos = this.player.getPosition();
      focusPos = { x: pPos.x, y: pPos.y, z: pPos.z };
      this.cameraController.update(frameDelta, focusPos);
    }

    // Dynamic sunlight shadow camera tracking
    this.dirLight.target.position.set(focusPos.x, 0, focusPos.z);

    // Render WebGL frame
    this.renderer.render(this.scene, this.cameraController.camera);

    // FPS Counter
    this.frameCount++;
    this.fpsTimer += frameDelta;
    if (this.fpsTimer >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    // Report live state to React UI ~15 times per second
    this.statePublishTimer += frameDelta;
    if (this.statePublishTimer >= 0.066 && this.stateCallback) {
      this.statePublishTimer = 0;
      const playerPos = this.player.getPosition();
      const zoneInfo = this.campus.detectZone(playerPos);

      // Detect nearby vehicle for [F] prompt
      const nearbyVehicle = this.vehicles.isDriving ? null : this.vehicles.getNearbyVehicle(playerPos, 4.2);

      this.stateCallback({
        fps: this.currentFps,
        currentZone: zoneInfo.zone,
        zoneDescription: zoneInfo.description,
        playerPosition: {
          x: Number(playerPos.x.toFixed(1)),
          y: Number(playerPos.y.toFixed(1)),
          z: Number(playerPos.z.toFixed(1)),
        },
        playerRotationY: this.vehicles.isDriving && this.vehicles.activeVehicle ? this.vehicles.activeVehicle.yaw : this.player.getRotationY(),
        playerSpeed: Number(activeSpeed.toFixed(1)),
        isSprinting: this.player.isSprinting,
        isGrounded: this.player.isGrounded,
        isPointerLocked: this.cameraController.isPointerLocked,
        vehicleInteraction: this.vehicles.isDriving && this.vehicles.activeVehicle
          ? {
              vehicleId: this.vehicles.activeVehicle.id,
              vehicleName: this.vehicles.activeVehicle.name,
              isDriving: true,
              speedKmh: Math.round(Math.abs(this.vehicles.activeVehicle.speed) * 3.6),
            }
          : nearbyVehicle
          ? {
              vehicleId: nearbyVehicle.id,
              vehicleName: nearbyVehicle.name,
              isDriving: false,
              speedKmh: 0,
            }
          : null,
      });
    }
  };

  public onStateUpdate(callback: (state: GameState) => void): void {
    this.stateCallback = callback;
  }

  public requestPointerLock(): void {
    this.cameraController.requestPointerLock();
  }

  public resetPlayerPosition(): void {
    if (this.vehicles.isDriving) {
      this.vehicles.exitVehicle((x, y, z, facingAngle) => {
        this.player.teleportTo(x, y, z, facingAngle);
        this.player.setVisible(true);
      });
    } else {
      this.player.resetPosition();
    }
  }

  public teleportPlayer(x: number, y: number, z: number, facingAngle?: number): void {
    if (this.vehicles.isDriving) {
      this.vehicles.exitVehicle((ex, ey, ez, ef) => {
        this.player.teleportTo(x, y, z, facingAngle || ef);
        this.player.setVisible(true);
      });
    } else {
      this.player.teleportTo(x, y, z, facingAngle);
    }
  }

  private onResize(): void {
    if (!this.renderer || !this.cameraController) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.cameraController.resize(width, height);
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.isRunning = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('keydown', this.onKeyDownBound);

    this.cameraController?.dispose();
    this.player?.dispose();
    this.vehicles?.dispose();
    this.campus?.dispose();
    this.physics?.dispose();
    this.renderer?.dispose();
  }
}
