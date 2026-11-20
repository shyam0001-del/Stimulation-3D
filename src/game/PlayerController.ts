import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PhysicsWorld } from './PhysicsWorld';

export class PlayerController {
  public mesh: THREE.Group;
  public rigidBody: RAPIER.RigidBody;
  public collider: RAPIER.Collider;

  private physics: PhysicsWorld;
  private gltfLoader: GLTFLoader;

  // Character dimensions
  private readonly capsuleHalfHeight = 0.45;
  private readonly capsuleRadius = 0.35;

  // Speeds (m/s)
  private readonly walkSpeed = 5.8;
  private readonly sprintSpeed = 10.5;
  private readonly jumpVelocity = 7.0;
  private readonly acceleration = 18.0;

  // State
  public isGrounded = true;
  public isSprinting = false;
  public currentSpeed = 0;
  private walkCycle = 0;

  // Rigged GLTF Model & Animation Mixer
  private mixer: THREE.AnimationMixer | null = null;
  private animations: Map<string, THREE.AnimationAction> = new Map();
  private currentAction: THREE.AnimationAction | null = null;
  public isGltfLoaded = false;

  // Procedural fallback limbs
  private proceduralGroup: THREE.Group;
  private torsoGroup!: THREE.Group;
  private leftArmGroup!: THREE.Group;
  private rightArmGroup!: THREE.Group;
  private leftLegGroup!: THREE.Group;
  private rightLegGroup!: THREE.Group;

  // Input Tracking
  public keys: Record<string, boolean> = {};

  // Spawn Point: North Main Entrance Gate, facing South down 12M Spine Avenue
  public readonly defaultSpawn = { x: 25, y: 1.5, z: -168 };
  private pendingTeleport: { x: number; y: number; z: number; facingAngle: number } | null = null;

  constructor(scene: THREE.Scene, physics: PhysicsWorld) {
    this.physics = physics;
    this.gltfLoader = new GLTFLoader();

    // 1. Create Physics Capsule
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

    // 2. Create Root Character Group
    this.mesh = new THREE.Group();
    this.mesh.name = 'PlayerCharacter';
    this.mesh.rotation.y = 0; // Face South toward central 12M spine
    scene.add(this.mesh);

    // 3. Build immediate procedural stylized student while GLTF loads
    this.proceduralGroup = this.createProceduralStudentMesh();
    this.mesh.add(this.proceduralGroup);

    // 4. Asynchronously load rigged humanoid student.glb
    this.loadRiggedStudentModel();

    // 5. Setup Keyboard Listeners
    this.setupInputs();
  }

  private loadRiggedStudentModel(): void {
    this.gltfLoader.load(
      '/models/student.glb',
      (gltf) => {
        const model = gltf.scene;
        model.name = 'RiggedStudentGLTF';

        // 1. Traverse and customize materials for CVR student style
        const hoodieColor = new THREE.Color(0x14b8a6); // Teal / Cyan campus hoodie
        const skinColor = new THREE.Color(0xd4a373); // Warm skin tone

        model.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = false; // Always render skinned character

            if (child.material) {
              const mat = child.material as THREE.MeshStandardMaterial;
              if (mat.name === 'VanguardBodyMat') {
                child.material = new THREE.MeshStandardMaterial({
                  map: mat.map || null,
                  normalMap: mat.normalMap || null,
                  color: new THREE.Color(0x14b8a6), // Teal jacket tint
                  roughness: 0.6,
                  metalness: 0.15,
                });
              } else if (mat.name === 'Vanguard_VisorMat') {
                child.material = new THREE.MeshStandardMaterial({
                  map: mat.map || null,
                  normalMap: mat.normalMap || null,
                  color: new THREE.Color(0xd4a373), // Skin visor
                  roughness: 0.4,
                  metalness: 0.2,
                });
              }
            }
          }
        });

        // 2. Soldier.glb internal Character node has scale 0.01, so scale 0.95 gives 1.74m student height
        const scale = 0.95;
        model.scale.set(scale, scale, scale);
        model.position.set(0, 0, 0);

        // 3. Attach a 3D Student Backpack to the spine bone
        const spineBone =
          model.getObjectByName('mixamorigSpine1') ||
          model.getObjectByName('mixamorig:Spine1') ||
          model.getObjectByName('mixamorigSpine') ||
          model.getObjectByName('mixamorig:Spine');
        if (spineBone) {
          const backpack = this.createSpineBackpackMesh();
          spineBone.add(backpack);
        }

        // 4. Initialize AnimationMixer
        this.mixer = new THREE.AnimationMixer(model);

        gltf.animations.forEach((clip) => {
          if (this.mixer) {
            const action = this.mixer.clipAction(clip);
            this.animations.set(clip.name, action);
          }
        });

        // Set initial idle animation
        const idleAction = this.animations.get('Idle');
        if (idleAction) {
          idleAction.play();
          this.currentAction = idleAction;
        }

        this.isGltfLoaded = true;

        // Swap out procedural mesh smoothly
        this.mesh.remove(this.proceduralGroup);
        this.mesh.add(model);
      },
      undefined,
      (err) => {
        console.warn('Could not load student.glb, using procedural articulated student:', err);
      }
    );
  }

  /**
   * Builds a stylish 3D backpack mesh sized for attachment to the skeletal spine bone
   */
  private createSpineBackpackMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'StudentBackpack';

    const backpackMat = new THREE.MeshStandardMaterial({
      color: 0xe67e22, // Orange student backpack
      roughness: 0.7,
      metalness: 0.1,
    });
    const pocketMat = new THREE.MeshStandardMaterial({
      color: 0xd35400, // Darker orange front pocket
      roughness: 0.75,
    });
    const strapMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937, // Black nylon straps
      roughness: 0.8,
    });
    const zipperMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      metalness: 0.85,
      roughness: 0.3,
    });

    // Main backpack compartment
    const mainMesh = new THREE.Mesh(new THREE.BoxGeometry(32, 40, 18), backpackMat);
    mainMesh.castShadow = true;
    group.add(mainMesh);

    // Front zipper pocket
    const pocketMesh = new THREE.Mesh(new THREE.BoxGeometry(26, 22, 10), pocketMat);
    pocketMesh.position.set(0, -6, -12);
    pocketMesh.castShadow = true;
    group.add(pocketMesh);

    // Silver zipper pull
    const zipperMesh = new THREE.Mesh(new THREE.BoxGeometry(18, 2, 2), zipperMat);
    zipperMesh.position.set(0, 5, -17);
    group.add(zipperMesh);

    // Left and Right straps
    const strapGeo = new THREE.BoxGeometry(5, 38, 4);
    const leftStrap = new THREE.Mesh(strapGeo, strapMat);
    leftStrap.position.set(-11, 2, 8);
    group.add(leftStrap);

    const rightStrap = new THREE.Mesh(strapGeo, strapMat);
    rightStrap.position.set(11, 2, 8);
    group.add(rightStrap);

    // Position behind upper back in Spine1 local coordinates
    group.position.set(0, 6, -14);
    group.rotation.x = 0.1;

    return group;
  }

  /**
   * Procedural articulated student character (immediate fallback)
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
    this.leftLegGroup.position.set(-0.15, 0.58, 0);
    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.52, 0.18), pantsMat);
    leftLegMesh.position.set(0, -0.26, 0);
    leftLegMesh.castShadow = true;
    this.leftLegGroup.add(leftLegMesh);
    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.12, 0.26), shoeMat);
    leftShoe.position.set(0, -0.48, 0.04);
    leftShoe.castShadow = true;
    this.leftLegGroup.add(leftShoe);
    root.add(this.leftLegGroup);

    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.15, 0.58, 0);
    const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.52, 0.18), pantsMat);
    rightLegMesh.position.set(0, -0.26, 0);
    rightLegMesh.castShadow = true;
    this.rightLegGroup.add(rightLegMesh);
    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.12, 0.26), shoeMat);
    rightShoe.position.set(0, -0.48, 0.04);
    rightShoe.castShadow = true;
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
  }

  public getRotationY(): number {
    return this.mesh.rotation.y;
  }

  private checkGrounded(): boolean {
    const pos = this.rigidBody.translation();
    const rayOrigin = {
      x: pos.x,
      y: pos.y - this.capsuleHalfHeight,
      z: pos.z,
    };
    const rayDir = { x: 0, y: -1, z: 0 };
    const maxDistance = this.capsuleRadius + 0.12;

    const hit = this.physics.castRay(rayOrigin, rayDir, maxDistance, true, this.rigidBody);
    return hit !== null && hit.timeOfImpact <= maxDistance;
  }

  public physicsUpdate(dt: number, cameraAzimuth: number): void {
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

    this.isGrounded = this.checkGrounded();

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

      const worldDirX = nx * cosA - nz * sinA;
      const worldDirZ = -nx * sinA - nz * cosA;

      targetVx = worldDirX * targetSpeed;
      targetVz = worldDirZ * targetSpeed;

      const targetAngle = Math.atan2(worldDirX, worldDirZ);
      let angleDiff = targetAngle - this.mesh.rotation.y;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      this.mesh.rotation.y += angleDiff * Math.min(1.0, 14.0 * dt);
    }

    const lerpRate = hasInput ? this.acceleration * dt : 20.0 * dt;
    const newVx = THREE.MathUtils.lerp(currentVel.x, targetVx, Math.min(1.0, lerpRate));
    const newVz = THREE.MathUtils.lerp(currentVel.z, targetVz, Math.min(1.0, lerpRate));

    let newVy = currentVel.y;
    if (this.keys['Space'] && this.isGrounded) {
      newVy = this.jumpVelocity;
      this.isGrounded = false;
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
   * Smoothly cross-fades rigged GLTF animations (Idle <-> Walk <-> Run)
   */
  private updateGLTFAnimation(dt: number, hasInput: boolean): void {
    if (!this.mixer) return;

    let targetActionName = 'Idle';
    let timeScale = 1.0;

    if (!this.isGrounded) {
      targetActionName = 'Idle';
    } else if (hasInput && this.currentSpeed > 0.3) {
      if (this.isSprinting) {
        targetActionName = 'Run';
        timeScale = Math.min(this.currentSpeed / 8.0, 1.4);
      } else {
        targetActionName = 'Walk';
        timeScale = Math.min(this.currentSpeed / 4.5, 1.25);
      }
    }

    const targetAction = this.animations.get(targetActionName);
    if (targetAction && targetAction !== this.currentAction) {
      targetAction.reset();
      targetAction.timeScale = timeScale;
      targetAction.fadeIn(0.2);
      targetAction.play();

      if (this.currentAction) {
        this.currentAction.fadeOut(0.2);
      }
      this.currentAction = targetAction;
    } else if (this.currentAction) {
      this.currentAction.timeScale = timeScale;
    }

    this.mixer.update(dt);
  }

  private animateProceduralLimbs(dt: number, hasInput: boolean): void {
    if (this.isGrounded && hasInput && this.currentSpeed > 0.4) {
      const frequency = this.isSprinting ? 14.0 : 9.0;
      this.walkCycle += dt * frequency;

      const swingAmp = this.isSprinting ? 0.65 : 0.45;
      const armSwing = Math.sin(this.walkCycle) * swingAmp;
      const legSwing = Math.sin(this.walkCycle) * swingAmp;

      this.leftArmGroup.rotation.x = -armSwing * 0.9;
      this.rightArmGroup.rotation.x = armSwing * 0.9;
      this.leftLegGroup.rotation.x = legSwing;
      this.rightLegGroup.rotation.x = -legSwing;

      this.torsoGroup.position.y = 0.85 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.04;
      this.torsoGroup.rotation.z = Math.sin(this.walkCycle) * 0.04;
    } else {
      this.walkCycle += dt * 2.0;
      this.leftLegGroup.rotation.x = THREE.MathUtils.lerp(this.leftLegGroup.rotation.x, 0, dt * 10);
      this.rightLegGroup.rotation.x = THREE.MathUtils.lerp(this.rightLegGroup.rotation.x, 0, dt * 10);
      this.leftArmGroup.rotation.x = THREE.MathUtils.lerp(this.leftArmGroup.rotation.x, 0, dt * 10);
      this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(this.rightArmGroup.rotation.x, 0, dt * 10);
      this.torsoGroup.position.y = 0.85 + Math.sin(this.walkCycle) * 0.01;
      this.torsoGroup.rotation.z = 0;
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

  public dispose(): void {
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
  }
}
