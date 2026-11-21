import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { PhysicsWorld } from './PhysicsWorld';
import { CharacterPreset, CHARACTER_PRESETS } from '../types/game';

export class PlayerController {
  public mesh: THREE.Group;
  public rigidBody: RAPIER.RigidBody;
  public collider: RAPIER.Collider;

  private physics: PhysicsWorld;
  public gltfLoader: GLTFLoader;

  // Character physical dimensions (1.75m human standard)
  public readonly targetHeight = 1.75;
  private readonly capsuleHalfHeight = 0.48;
  private readonly capsuleRadius = 0.35;

  // Movement Speeds (m/s) — Calibrated with Rapier ground friction for responsive 2.5 m/s walk & 6.0 m/s sprint
  private readonly walkSpeed = 2.75;
  private readonly sprintSpeed = 6.28;
  // Jump velocity v = sqrt(2 * g * h) = sqrt(2 * 9.81 * 0.80) = 3.962 m/s for realistic 0.8m height
  private readonly jumpVelocity = 3.962;
  private readonly acceleration = 16.0;
  private readonly deceleration = 11.0;

  // State
  public isGrounded = true;
  public isSprinting = false;
  public currentSpeed = 0;
  private walkCycle = 0;
  private groundGraceTimer = 0;
  private wasSpacePressed = false;
  private jumpCooldown = 0;

  // Rigged GLTF Model & Animation Mixer
  private mixer: THREE.AnimationMixer | null = null;
  private animations: Map<string, THREE.AnimationAction> = new Map();
  private sharedClips: Map<string, THREE.AnimationClip> = new Map();
  private currentAction: THREE.AnimationAction | null = null;
  public isGltfLoaded = false;

  // Active Character Representation
  public activePreset: CharacterPreset | null = null;
  public activeCharacterName = 'Aarav';
  private currentModelContainer: THREE.Group | null = null;

  // Procedural Fallback Meshes
  private proceduralGroup: THREE.Group;
  private torsoGroup!: THREE.Group;
  private leftArmGroup!: THREE.Group;
  private rightArmGroup!: THREE.Group;
  private leftLegGroup!: THREE.Group;
  private rightLegGroup!: THREE.Group;

  // Input Tracking
  public keys: Record<string, boolean> = {};

  // Spawn Point: North Main Entrance Gate, facing South (+Z) down 12M Spine Avenue
  public readonly defaultSpawn = { x: 25, y: 1.5, z: -168 };
  private pendingTeleport: { x: number; y: number; z: number; facingAngle: number } | null = null;

  constructor(scene: THREE.Scene, physics: PhysicsWorld) {
    this.physics = physics;
    this.gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/gltf/');
    this.gltfLoader.setDRACOLoader(dracoLoader);

    // 1. Create Rapier Physics Dynamic Capsule
    const { body, collider } = this.physics.createDynamicCapsule(
      this.defaultSpawn.x,
      this.defaultSpawn.y,
      this.defaultSpawn.z,
      this.capsuleHalfHeight,
      this.capsuleRadius,
      70.0
    );
    this.rigidBody = body;
    this.collider = collider;

    // 2. Create Root Character Container Group
    this.mesh = new THREE.Group();
    this.mesh.name = 'PlayerCharacter';
    this.mesh.rotation.y = 0; // Face South (+Z) down central 12M spine
    scene.add(this.mesh);

    // 3. Immediate Procedural Articulated Student Mesh (visible while GLTF decodes)
    this.proceduralGroup = this.createProceduralStudentMesh();
    this.mesh.add(this.proceduralGroup);

    // 4. Initialize Student Character from Presets / Cache
    const savedPresetId = (typeof localStorage !== 'undefined' && localStorage.getItem('cvr_selected_avatar_id')) || 'remy';
    this.initCharacters(savedPresetId);

    // 5. Setup Keyboard Listeners
    this.setupInputs();
  }

  /**
   * Initializes shared animations and sets initial character preset
   */
  public async initCharacters(initialPresetId = 'remy'): Promise<void> {
    try {
      // Preload avatar_male.glb to populate shared standard Mixamo clips (idle, walk, run)
      const maleGltf = await this.gltfLoader.loadAsync('/models/avatar_male.glb');
      if (maleGltf.animations) {
        maleGltf.animations.forEach((clip) => {
          const lower = clip.name.toLowerCase();
          this.sharedClips.set(lower, clip);
        });
      }

      // Apply initial preset
      const preset = CHARACTER_PRESETS.find((p) => p.id === initialPresetId) || CHARACTER_PRESETS[0];
      await this.setCharacter(preset);
    } catch (err) {
      console.warn('Fallback character initialization:', err);
      const preset = CHARACTER_PRESETS.find((p) => p.id === initialPresetId) || CHARACTER_PRESETS[0];
      await this.setCharacter(preset);
    }
  }

  /**
   * Loads and live-swaps character model (presets or custom user .glb)
   */
  public async setCharacter(presetOrUrl: CharacterPreset | string): Promise<void> {
    let preset: CharacterPreset | null = null;
    let url = '';

    if (typeof presetOrUrl === 'string') {
      const found = CHARACTER_PRESETS.find((p) => p.id === presetOrUrl || p.modelUrl === presetOrUrl);
      if (found) {
        preset = found;
        url = found.modelUrl;
      } else {
        url = presetOrUrl;
      }
    } else {
      preset = presetOrUrl;
      url = preset.modelUrl;
    }

    if (preset) {
      this.activePreset = preset;
      this.activeCharacterName = preset.name;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('cvr_selected_avatar_id', preset.id);
      }
    } else {
      this.activePreset = null;
      this.activeCharacterName = 'Custom Avatar';
    }

    try {
      const gltf = await this.gltfLoader.loadAsync(url);
      const model = gltf.scene;
      model.name = 'RiggedStudentGLTF';

      // 1. Metric Normalization: Measure exact height and scale to 1.75m
      const rawBox = new THREE.Box3().setFromObject(model);
      const rawSize = rawBox.getSize(new THREE.Vector3());
      const rawHeight = rawSize.y || 1.75;
      const uniformScale = this.targetHeight / rawHeight;
      model.scale.set(uniformScale, uniformScale, uniformScale);

      // 2. Place soles cleanly at y = 0 and center horizontally
      const scaledBox = new THREE.Box3().setFromObject(model);
      const center = scaledBox.getCenter(new THREE.Vector3());
      model.position.set(-center.x, -scaledBox.min.y, -center.z);

      // 3. Natural Forward Alignment:
      // Xbot and Michelle glTF models face forward along +Z.
      const pivot = new THREE.Group();
      pivot.name = 'CharacterPivot';
      pivot.rotation.y = 0;
      pivot.add(model);

      // 4. Customize Materials & Colors
      model.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false; // Prevent skinned limbs from clipping

          if (preset && child.material) {
            const origMat = child.material as THREE.MeshStandardMaterial;
            if (child.material.name === 'Beta_Joints_MAT') {
              // Accent joints / trim (dark navy or gold)
              child.material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(preset.outfit.accentColor),
                roughness: 0.45,
                metalness: 0.2,
              });
            } else if (child.material.name === 'asdf1:Beta_HighLimbsGeoSG2') {
              // Main torso, limbs & hoodie coat
              child.material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(preset.outfit.primaryColor),
                roughness: 0.55,
                metalness: 0.1,
              });
            } else if (child.material.name === 'Ch03_Body') {
              // Female jacket & casual wear tint
              const cloned = origMat.clone();
              cloned.color = new THREE.Color(preset.outfit.primaryColor);
              child.material = cloned;
            }
          }
        }
      });

      // 5. Attach Stylized 3D College Backpack to Spine Bone (if enabled for preset)
      const spineBone =
        model.getObjectByName('mixamorigSpine1') ||
        model.getObjectByName('mixamorig:Spine1') ||
        model.getObjectByName('mixamorigSpine') ||
        model.getObjectByName('mixamorig:Spine');
      if (spineBone && (!preset || preset.hasBackpack !== false)) {
        const backpack = this.createSpineBackpackMesh(preset ? preset.outfit.backpackColor : '#f97316');
        spineBone.add(backpack);
      }

      // 6. Setup AnimationMixer & Clip Bindings
      if (this.mixer) {
        this.mixer.stopAllAction();
      }
      this.mixer = new THREE.AnimationMixer(model);
      this.animations.clear();

      // Collect available clips from glTF
      const clipsToBind: THREE.AnimationClip[] = [];
      if (gltf.animations && gltf.animations.length > 0) {
        gltf.animations.forEach((clip) => {
          clipsToBind.push(clip);
          const lower = clip.name.toLowerCase();
          if (['idle', 'walk', 'run', 'jump'].includes(lower)) {
            this.sharedClips.set(lower, clip);
          }
        });
      }

      // If glTF lacks walk/run/idle (e.g. Michelle.glb), bind adapted clips from shared Mixamo library
      ['idle', 'walk', 'run'].forEach((clipName) => {
        const hasClip = clipsToBind.some((c) => c.name.toLowerCase() === clipName);
        if (!hasClip && this.sharedClips.has(clipName)) {
          const rawClip = this.sharedClips.get(clipName)!;
          // Adapt shared clip for meter-scaled skeletons (like Michelle.glb)
          const adaptedClip = rawClip.clone();
          adaptedClip.name = clipName;
          adaptedClip.tracks = adaptedClip.tracks.filter((t) => {
            if (t.name.endsWith('.position')) {
              if (t.name.includes('Hips') || t.name.includes('hips')) {
                // Scale root hip translation from Mixamo centimeters to meters
                for (let i = 0; i < t.values.length; i++) {
                  t.values[i] *= 0.01;
                }
                return true;
              }
              // Drop non-hip position tracks so character maintains its own natural skeletal bone offsets
              return false;
            }
            // Keep all rotation (quaternion) tracks
            return true;
          });
          clipsToBind.push(adaptedClip);
        }
      });

      // Bind all actions to mixer
      clipsToBind.forEach((clip) => {
        if (this.mixer) {
          const action = this.mixer.clipAction(clip);
          const lower = clip.name.toLowerCase();
          if (lower === 'jump') {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
          }
          this.animations.set(clip.name.toLowerCase(), action);
          this.animations.set(clip.name, action);
        }
      });

      // Start initial idle state
      const idleAction = this.animations.get('idle') || this.animations.get('Idle');
      if (idleAction) {
        idleAction.play();
        this.currentAction = idleAction;
      }

      // 7. Live Swap Container in this.mesh
      if (this.currentModelContainer) {
        this.mesh.remove(this.currentModelContainer);
      }
      this.mesh.remove(this.proceduralGroup);
      this.currentModelContainer = pivot;
      this.mesh.add(pivot);
      this.isGltfLoaded = true;
    } catch (err) {
      console.error('Failed to set character:', err);
    }
  }

  /**
   * Builds a properly proportioned 3D college backpack (metric meters) for spine bone
   */
  private createSpineBackpackMesh(backpackColor = '#f97316'): THREE.Group {
    const group = new THREE.Group();
    group.name = 'StudentBackpack';

    const backpackMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(backpackColor),
      roughness: 0.65,
      metalness: 0.1,
    });
    const pocketMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(backpackColor).multiplyScalar(0.82),
      roughness: 0.7,
    });
    const strapMat = new THREE.MeshStandardMaterial({
      color: 0x18181b, // Dark nylon straps
      roughness: 0.8,
    });
    const zipperMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      metalness: 0.85,
      roughness: 0.3,
    });

    // Main pack body: 0.30m wide, 0.38m tall, 0.16m deep
    const mainMesh = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.38, 0.16), backpackMat);
    mainMesh.castShadow = true;
    group.add(mainMesh);

    // Front pocket
    const pocketMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.08), pocketMat);
    pocketMesh.position.set(0, -0.05, 0.11);
    pocketMesh.castShadow = true;
    group.add(pocketMesh);

    // Silver zipper pull
    const zipperMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.02), zipperMat);
    zipperMesh.position.set(0, 0.06, 0.155);
    group.add(zipperMesh);

    // Left and Right straps
    const strapGeo = new THREE.BoxGeometry(0.045, 0.34, 0.03);
    const leftStrap = new THREE.Mesh(strapGeo, strapMat);
    leftStrap.position.set(-0.10, 0.02, -0.08);
    group.add(leftStrap);

    const rightStrap = new THREE.Mesh(strapGeo, strapMat);
    rightStrap.position.set(0.10, 0.02, -0.08);
    group.add(rightStrap);

    // Position securely on back of spine
    group.position.set(0, -0.05, -0.15);
    group.rotation.x = Math.PI; // Flip so pocket faces outward
    return group;
  }

  /**
   * Procedural stylized student mesh fallback
   */
  private createProceduralStudentMesh(): THREE.Group {
    const root = new THREE.Group();
    root.name = 'ProceduralStudentMesh';

    const skinMat = new THREE.MeshLambertMaterial({ color: 0xdeb887 });
    const hoodieMat = new THREE.MeshLambertMaterial({ color: 0x14b8a6 }); // Teal hoodie
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x1e293b }); // Dark denim
    const shoeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const backpackMat = new THREE.MeshLambertMaterial({ color: 0xe67e22 });
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x211a14 });

    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, 0.85, 0);

    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.3), hoodieMat);
    torsoMesh.castShadow = true;
    this.torsoGroup.add(torsoMesh);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.32), skinMat);
    head.position.set(0, 0.44, 0);
    head.castShadow = true;
    this.torsoGroup.add(head);

    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.34), hairMat);
    hair.position.set(0, 0.15, 0);
    head.add(hair);

    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.2), backpackMat);
    backpack.position.set(0, -0.02, -0.22);
    backpack.castShadow = true;
    this.torsoGroup.add(backpack);

    // Arms
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.32, 0.2, 0);
    const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.16), hoodieMat);
    leftArmMesh.position.set(0, -0.2, 0);
    leftArmMesh.castShadow = true;
    this.leftArmGroup.add(leftArmMesh);
    this.torsoGroup.add(this.leftArmGroup);

    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.32, 0.2, 0);
    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.16), hoodieMat);
    rightArmMesh.position.set(0, -0.2, 0);
    rightArmMesh.castShadow = true;
    this.rightArmGroup.add(rightArmMesh);
    this.torsoGroup.add(this.rightArmGroup);

    root.add(this.torsoGroup);

    // Legs
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.14, 0.55, 0);
    const leftPants = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.18), pantsMat);
    leftPants.position.set(0, -0.27, 0);
    leftPants.castShadow = true;
    this.leftLegGroup.add(leftPants);
    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.12, 0.24), shoeMat);
    leftShoe.position.set(0, -0.52, 0.03);
    this.leftLegGroup.add(leftShoe);
    root.add(this.leftLegGroup);

    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.14, 0.55, 0);
    const rightPants = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.18), pantsMat);
    rightPants.position.set(0, -0.27, 0);
    rightPants.castShadow = true;
    this.rightLegGroup.add(rightPants);
    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.12, 0.24), shoeMat);
    rightShoe.position.set(0, -0.52, 0.03);
    this.rightLegGroup.add(rightShoe);
    root.add(this.rightLegGroup);

    return root;
  }

  private setupInputs(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyR') {
        this.resetPosition();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  public resetPosition(
    x = this.defaultSpawn.x,
    y = this.defaultSpawn.y,
    z = this.defaultSpawn.z,
    facingAngle = 0
  ): void {
    this.pendingTeleport = { x, y, z, facingAngle };
    this.mesh.position.set(x, y - (this.capsuleHalfHeight + this.capsuleRadius), z);
    this.mesh.rotation.y = facingAngle;
  }

  public teleportTo(x: number, y: number, z: number, facingAngle = 0): void {
    this.resetPosition(x, y, z, facingAngle);
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
    if (!visible) {
      // Cleanly transition to idle state when player is hidden (e.g. inside vehicle)
      const idleAction =
        this.animations.get('idle') ||
        this.animations.get('Idle') ||
        this.animations.get('IDLE');
      if (idleAction && this.currentAction && this.currentAction !== idleAction) {
        this.currentAction.stop();
        idleAction.reset().play();
        this.currentAction = idleAction;
      }
    }
  }

  public getRotationY(): number {
    return this.mesh.rotation.y;
  }

  private checkGrounded(): boolean {
    const pos = this.rigidBody.translation();
    const vel = this.rigidBody.linvel();

    // If ascending or within jump liftoff cooldown, character is strictly airborne
    if (vel.y > 0.5 || this.jumpCooldown > 0) {
      return false;
    }

    const rayOrigin = {
      x: pos.x,
      y: pos.y - this.capsuleHalfHeight,
      z: pos.z,
    };
    const rayDir = { x: 0, y: -1, z: 0 };
    // Center ray tolerance: capsuleRadius (0.35m) + 0.18m margin (smooth traversal over 18cm curb edges)
    const maxDistance = this.capsuleRadius + 0.18;

    // 1. Primary center ray
    const centerHit = this.physics.castRay(rayOrigin, rayDir, maxDistance, true, this.collider);
    if (centerHit !== null && centerHit.timeOfImpact <= maxDistance) {
      return true;
    }

    // 2. Multi-point edge probes around the capsule foot circle (0.18m offset from center).
    // Prevents false airborne state and jitter when character's center overhangs a curb, step, or sidewalk edge.
    const probeOffset = 0.18;
    const probeDeltas = [
      { dx: probeOffset, dz: 0 },
      { dx: -probeOffset, dz: 0 },
      { dx: 0, dz: probeOffset },
      { dx: 0, dz: -probeOffset },
    ];

    for (let i = 0; i < probeDeltas.length; i++) {
      const probeOrigin = {
        x: pos.x + probeDeltas[i].dx,
        y: pos.y - this.capsuleHalfHeight,
        z: pos.z + probeDeltas[i].dz,
      };
      const probeHit = this.physics.castRay(probeOrigin, rayDir, maxDistance, true, this.collider);
      if (probeHit !== null && probeHit.timeOfImpact <= maxDistance) {
        return true;
      }
    }

    return false;
  }

  public physicsUpdate(dt: number, cameraAzimuth: number): void {
    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);

    // Process deferred teleport to avoid Rapier3D WASM linear borrow conflict
    if (this.pendingTeleport) {
      const { x, y, z, facingAngle } = this.pendingTeleport;
      try {
        this.rigidBody.setTranslation({ x, y, z }, true);
        this.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      } catch (err) {
        console.warn('Deferred rigidBody teleport:', err);
      }
      this.mesh.position.set(x, y - (this.capsuleHalfHeight + this.capsuleRadius), z);
      this.mesh.rotation.y = facingAngle;
      this.pendingTeleport = null;
      return;
    }

    const rawGrounded = this.checkGrounded();
    if (rawGrounded) {
      this.isGrounded = true;
      this.groundGraceTimer = 0.08; // 80ms coyote time buffer for smooth curb traversal
    } else {
      this.groundGraceTimer = Math.max(0, this.groundGraceTimer - dt);
      if (this.groundGraceTimer <= 0) {
        this.isGrounded = false;
      }
    }

    let inputForward = 0;
    let inputRight = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) inputForward += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) inputForward -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) inputRight += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) inputRight -= 1;

    this.isSprinting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    const targetSpeed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;

    const currentVel = this.rigidBody.linvel();
    let targetVx = 0;
    let targetVz = 0;

    const hasInput = inputForward !== 0 || inputRight !== 0;

    if (hasInput) {
      const inputLength = Math.hypot(inputForward, inputRight);
      const nx = inputRight / inputLength;
      const nz = inputForward / inputLength;

      const sinA = Math.sin(cameraAzimuth);
      const cosA = Math.cos(cameraAzimuth);

      // Camera forward vector in world: (-sinA, -cosA)
      // Camera right vector in world:   (cosA, -sinA)
      const worldDirX = nx * cosA - nz * sinA;
      const worldDirZ = -nx * sinA - nz * cosA;

      targetVx = worldDirX * targetSpeed;
      targetVz = worldDirZ * targetSpeed;

      // Smoothly rotate character to face the direction of movement
      const targetAngle = Math.atan2(worldDirX, worldDirZ);
      let angleDiff = targetAngle - this.mesh.rotation.y;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      this.mesh.rotation.y += angleDiff * Math.min(1.0, 13.5 * dt);
    }

    const lerpRate = hasInput ? this.acceleration * dt : this.deceleration * dt;
    const newVx = THREE.MathUtils.lerp(currentVel.x, targetVx, Math.min(1.0, lerpRate));
    const newVz = THREE.MathUtils.lerp(currentVel.z, targetVz, Math.min(1.0, lerpRate));

    let newVy = currentVel.y;
    const isSpaceJustPressed = !!this.keys['Space'] && !this.wasSpacePressed;
    this.wasSpacePressed = !!this.keys['Space'];

    if (isSpaceJustPressed && this.jumpCooldown <= 0 && (this.isGrounded || this.groundGraceTimer > 0)) {
      newVy = this.jumpVelocity;
      this.isGrounded = false;
      this.groundGraceTimer = 0;
      this.jumpCooldown = 0.20; // 200ms liftoff lockout prevents double-jumping
    }

    this.rigidBody.setLinvel({ x: newVx, y: newVy, z: newVz }, true);
    this.currentSpeed = Math.hypot(newVx, newVz);

    // Update animations
    if (this.isGltfLoaded && this.mixer) {
      this.updateGLTFAnimation(dt, hasInput);
    } else {
      this.animateProceduralLimbs(dt, hasInput);
    }
  }

  /**
   * Smoothly cross-fades rigged GLTF animations (idle <-> walk <-> run <-> jump/airborne fallback)
   */
  private updateGLTFAnimation(dt: number, hasInput: boolean): void {
    if (!this.mixer) return;

    let targetActionName = 'idle';
    let timeScale = 1.0;

    const hasJumpAction =
      this.animations.has('jump') ||
      this.animations.has('Jump') ||
      this.animations.has('JUMP');

    if (!this.isGrounded) {
      if (hasJumpAction) {
        targetActionName = 'jump';
        timeScale = 1.0;
      } else {
        // Safe airborne fallback when current avatar has no dedicated jump animation clip:
        // If moving with momentum, maintain airborne stride rather than snapping to a grounded standing idle
        if (this.currentSpeed > 3.0) {
          targetActionName = 'run';
          timeScale = 0.85;
        } else if (this.currentSpeed > 0.3) {
          targetActionName = 'walk';
          timeScale = 0.90;
        } else {
          targetActionName = 'idle';
          timeScale = 1.0;
        }
      }
    } else if (hasInput && this.currentSpeed > 0.25) {
      if (this.isSprinting && this.currentSpeed > 3.0) {
        targetActionName = 'run';
        timeScale = THREE.MathUtils.clamp(this.currentSpeed / 5.4, 0.75, 1.35);
      } else {
        targetActionName = 'walk';
        timeScale = THREE.MathUtils.clamp(this.currentSpeed / 2.15, 0.65, 1.35);
      }
    } else {
      targetActionName = 'idle';
      timeScale = 1.0;
    }

    const targetAction =
      this.animations.get(targetActionName) ||
      this.animations.get(targetActionName.toUpperCase()) ||
      this.animations.get(targetActionName.charAt(0).toUpperCase() + targetActionName.slice(1));

    if (targetAction && targetAction !== this.currentAction) {
      const prevAction = this.currentAction;
      const isLocomotionTransition =
        prevAction &&
        ((prevAction === this.animations.get('walk') && targetAction === this.animations.get('run')) ||
         (prevAction === this.animations.get('run') && targetAction === this.animations.get('walk')));

      targetAction.reset();
      targetAction.timeScale = timeScale;

      // Stride phase synchronization: match foot phase between walk <-> run to eliminate leg snapping
      if (isLocomotionTransition && prevAction) {
        const prevDuration = prevAction.getClip().duration;
        const targetDuration = targetAction.getClip().duration;
        if (prevDuration > 0 && targetDuration > 0) {
          const stridePhase = (prevAction.time / prevDuration) % 1.0;
          targetAction.time = stridePhase * targetDuration;
        }
      }

      const fadeDuration = isLocomotionTransition ? 0.25 : 0.2;
      targetAction.fadeIn(fadeDuration);
      targetAction.play();

      if (prevAction) {
        prevAction.fadeOut(fadeDuration);
      }
      this.currentAction = targetAction;
    } else if (this.currentAction) {
      this.currentAction.timeScale = timeScale;
    }

    this.mixer.update(dt);
  }

  private animateProceduralLimbs(dt: number, hasInput: boolean): void {
    if (this.isGrounded && hasInput && this.currentSpeed > 0.25) {
      const frequency = this.isSprinting ? 11.0 : 6.5;
      this.walkCycle += dt * frequency;

      const armSwing = Math.sin(this.walkCycle) * 0.45;
      const legSwing = Math.sin(this.walkCycle) * 0.55;

      this.leftArmGroup.rotation.x = armSwing;
      this.rightArmGroup.rotation.x = -armSwing;
      this.leftLegGroup.rotation.x = -legSwing;
      this.rightLegGroup.rotation.x = legSwing;
      this.torsoGroup.position.y = 0.85 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.04;
    } else if (!this.isGrounded) {
      // Natural airborne pose for procedural student: arms slightly out, legs staggered
      this.leftArmGroup.rotation.x = THREE.MathUtils.lerp(this.leftArmGroup.rotation.x, -0.5, 10 * dt);
      this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(this.rightArmGroup.rotation.x, -0.5, 10 * dt);
      this.leftLegGroup.rotation.x = THREE.MathUtils.lerp(this.leftLegGroup.rotation.x, 0.35, 10 * dt);
      this.rightLegGroup.rotation.x = THREE.MathUtils.lerp(this.rightLegGroup.rotation.x, -0.25, 10 * dt);
      this.torsoGroup.position.y = 0.88;
    } else {
      this.leftArmGroup.rotation.x *= 0.85;
      this.rightArmGroup.rotation.x *= 0.85;
      this.leftLegGroup.rotation.x *= 0.85;
      this.rightLegGroup.rotation.x *= 0.85;
      this.torsoGroup.position.y = 0.85;
    }
  }

  public updateVisuals(): void {
    const pos = this.rigidBody.translation();
    const bottomY = pos.y - (this.capsuleHalfHeight + this.capsuleRadius);
    this.mesh.position.set(pos.x, bottomY, pos.z);
  }

  public getPosition(): { x: number; y: number; z: number } {
    if (this.pendingTeleport) {
      return { x: this.pendingTeleport.x, y: this.pendingTeleport.y, z: this.pendingTeleport.z };
    }
    return this.rigidBody.translation();
  }

  /**
   * Helper to verify dot product between world forward vector and movement vector
   */
  public getForwardAlignmentWithMovement(): number {
    try {
      const vel = this.rigidBody.linvel();
      const speed = Math.hypot(vel.x, vel.z);
      if (speed < 0.2) return 1.0;

      const moveDir = new THREE.Vector3(vel.x, 0, vel.z).normalize();
      // In our container, local +Z is forward
      const forwardInWorld = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, this.mesh.rotation.y, 0)).normalize();
      return forwardInWorld.dot(moveDir);
    } catch {
      return 1.0;
    }
  }

  public dispose(): void {
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
  }
}
