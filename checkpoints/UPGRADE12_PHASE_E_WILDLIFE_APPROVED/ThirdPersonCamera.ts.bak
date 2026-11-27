import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from './PhysicsWorld';

export class ThirdPersonCamera {
  public camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private physics?: PhysicsWorld;

  // Camera Angles
  // theta = horizontal azimuth angle (PI = behind player looking South down 12M Spine toward +Z)
  public theta = Math.PI;
  // pitch = vertical pitch in radians (positive = looking up at sky, negative = looking down at road)
  public pitch = 0.12; // ~7° slight upward cinematic framing at spawn

  // Backward compatibility getter/setter for phi (polar angle from zenith)
  public get phi(): number {
    return Math.PI / 2 - this.pitch;
  }
  public set phi(val: number) {
    this.pitch = THREE.MathUtils.clamp(Math.PI / 2 - val, this.minPitch, this.maxPitch);
  }

  public distance = 5.2; // Current zoom distance
  private targetDistance = 5.2;
  private collisionDistance = 5.2; // Smoothed spring-arm distance after obstruction recovery

  public readonly minDistance = 1.2;
  public readonly maxDistance = 14.0;

  // Pitch limits: allow looking from -60° down at road to +79° steep up into sky
  public readonly minPitch = -1.05; // ~-60° (looking down at character and road pavement)
  public readonly maxPitch = 1.38; // ~+79° (looking almost vertically upward at clouds and birds)
  public readonly minGroundY = 0.45; // Camera eye never dips below 0.45m above ground

  // Damping positions
  private currentFocus = new THREE.Vector3(25.0, 1.42, -184.0);
  private currentPosition = new THREE.Vector3(25.0, 2.20, -189.15);
  private currentLookTarget = new THREE.Vector3(25.0, 2.20, -160.0);

  // Mouse / Pointer State
  public isPointerLocked = false;
  private isMouseDown = false;
  private prevMouseX = 0;
  private prevMouseY = 0;

  // Bound Event Listeners for clean disposal
  private onMouseMoveBound: (e: MouseEvent) => void;
  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseUpBound: (e: MouseEvent) => void;
  private onWheelBound: (e: WheelEvent) => void;
  private onPointerLockChangeBound: () => void;

  constructor(domElement: HTMLElement, physics?: PhysicsWorld) {
    this.domElement = domElement;
    this.physics = physics;

    // Perspective Camera (49° FOV for natural third-person cinematic perspective)
    this.camera = new THREE.PerspectiveCamera(
      49,
      window.innerWidth / window.innerHeight,
      0.1,
      1200
    );

    // Initial position behind default spawn (spawn at z=-184, camera behind at z=-189.2)
    this.currentPosition.set(25.0, 2.0, -189.2);
    this.camera.position.copy(this.currentPosition);
    this.currentLookTarget.set(25.0, 2.0, -160.0);
    this.camera.lookAt(this.currentLookTarget);

    // Event Listeners Setup
    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onMouseUpBound = this.onMouseUp.bind(this);
    this.onWheelBound = this.onWheel.bind(this);
    this.onPointerLockChangeBound = this.onPointerLockChange.bind(this);

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    window.addEventListener('mousemove', this.onMouseMoveBound);
    this.domElement.addEventListener('mousedown', this.onMouseDownBound);
    window.addEventListener('mouseup', this.onMouseUpBound);
    this.domElement.addEventListener('wheel', this.onWheelBound, { passive: true });
    document.addEventListener('pointerlockchange', this.onPointerLockChangeBound);
  }

  private onPointerLockChange(): void {
    this.isPointerLocked = document.pointerLockElement === this.domElement;
  }

  public requestPointerLock(): void {
    if (!this.isPointerLocked) {
      this.domElement.requestPointerLock?.();
    }
  }

  public exitPointerLock(): void {
    if (this.isPointerLocked) {
      document.exitPointerLock?.();
    }
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.isMouseDown = true;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    }
  }

  private onMouseUp(): void {
    this.isMouseDown = false;
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isPointerLocked) {
      // Standard GTA / FPS camera controls:
      // Mouse RIGHT (movementX > 0) -> theta decreases -> camera turns RIGHT -> reference object shifts LEFT on screen
      // Mouse LEFT (movementX < 0)  -> theta increases -> camera turns LEFT -> reference object shifts RIGHT on screen
      // Mouse UP (movementY < 0)    -> pitch increases -> camera looks UP toward sky
      // Mouse DOWN (movementY > 0)  -> pitch decreases -> camera looks DOWN toward ground
      const sensitivity = 0.0024;
      this.theta -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch, this.minPitch, this.maxPitch);
    } else if (this.isMouseDown) {
      // Click & Drag orbit fallback (trackpad-friendly)
      const deltaX = e.clientX - this.prevMouseX;
      const deltaY = e.clientY - this.prevMouseY;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;

      const sensitivity = 0.004;
      this.theta -= deltaX * sensitivity;
      this.pitch -= deltaY * sensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch, this.minPitch, this.maxPitch);
    }
  }

  private onWheel(e: WheelEvent): void {
    const zoomSensitivity = 0.005;
    this.targetDistance += e.deltaY * zoomSensitivity;
    this.targetDistance = THREE.MathUtils.clamp(
      this.targetDistance,
      this.minDistance,
      this.maxDistance
    );
  }

  /**
   * Smooth update called every frame
   */
  public update(
    dt: number,
    targetPos: { x: number; y: number; z: number },
    targetHeightOffset = 1.25,
    distanceOverride?: number,
    excludeCollider?: RAPIER.Collider
  ): void {
    // 1. Focus point at character chest/head height
    const desiredFocus = new THREE.Vector3(
      targetPos.x,
      targetPos.y + targetHeightOffset,
      targetPos.z
    );

    // Smoothly damp focus following (single responsive spring-arm damper to prevent sprint-backward compression)
    const targetLerp = 1 - Math.exp(-32.0 * dt);
    this.currentFocus.lerp(desiredFocus, THREE.MathUtils.clamp(targetLerp, 0, 1));

    // 2. Smooth zoom damping
    const zoomLerp = 1 - Math.exp(-12.0 * dt);
    const targetDist = distanceOverride !== undefined ? distanceOverride : this.targetDistance;
    this.distance = THREE.MathUtils.lerp(
      this.distance,
      targetDist,
      THREE.MathUtils.clamp(zoomLerp, 0, 1)
    );

    // 3. Forward line-of-sight vector (direction camera looks):
    // In our coordinate system where theta=PI faces South (+Z):
    // forwardX = -sin(theta) * cos(pitch)
    // forwardY = sin(pitch)
    // forwardZ = -cos(theta) * cos(pitch)
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinTheta = Math.sin(this.theta);
    const cosTheta = Math.cos(this.theta);

    const forwardX = -sinTheta * cosPitch;
    const forwardY = sinPitch;
    const forwardZ = -cosTheta * cosPitch;

    // 4. Desired unobstructed camera position (with ground clipping guard)
    const unobstructedX = this.currentFocus.x - forwardX * this.distance;
    const unobstructedY = Math.max(this.minGroundY, this.currentFocus.y - forwardY * this.distance);
    const unobstructedZ = this.currentFocus.z - forwardZ * this.distance;

    // 5. Spring-arm collision detection: raycast from actual desiredFocus toward unobstructed camera,
    // excluding the player/vehicle collider so sprint-backward focus lag never triggers self-hits.
    let targetCollisionDist = this.distance;
    if (this.physics) {
      const toCamX = unobstructedX - desiredFocus.x;
      const toCamY = unobstructedY - desiredFocus.y;
      const toCamZ = unobstructedZ - desiredFocus.z;
      const rayLen = Math.hypot(toCamX, toCamY, toCamZ);

      if (rayLen > 0.2) {
        const invLen = 1 / rayLen;
        const rayDir = {
          x: toCamX * invLen,
          y: toCamY * invLen,
          z: toCamZ * invLen,
        };
        const hit = this.physics.castRay(desiredFocus, rayDir, rayLen, true, excludeCollider);
        if (hit && hit.timeOfImpact < rayLen) {
          targetCollisionDist = Math.max(this.minDistance, hit.timeOfImpact - 0.25);
        }
      }
    }

    // Pull in fast on genuine obstacle hit, recover smoothly once obstruction clears
    const collisionLerpRate = targetCollisionDist < this.collisionDistance ? 24.0 : 8.0;
    const collisionLerp = THREE.MathUtils.clamp(1 - Math.exp(-collisionLerpRate * dt), 0, 1);
    this.collisionDistance = THREE.MathUtils.lerp(this.collisionDistance, targetCollisionDist, collisionLerp);

    // 6. Final camera position placed BEHIND character along line of sight (no secondary position lag)
    this.currentPosition.set(
      this.currentFocus.x - forwardX * this.collisionDistance,
      Math.max(this.minGroundY, this.currentFocus.y - forwardY * this.collisionDistance),
      this.currentFocus.z - forwardZ * this.collisionDistance
    );

    // 7. Look-at target extends forward along line-of-sight
    this.currentLookTarget.set(
      this.currentFocus.x + forwardX * 25.0,
      this.currentFocus.y + forwardY * 25.0,
      this.currentFocus.z + forwardZ * 25.0
    );

    // Apply to Three.js camera
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookTarget);
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public getAzimuth(): number {
    return this.theta;
  }

  /**
   * Snaps camera immediately to specified view angles and distance
   */
  public snapView(
    theta: number,
    phiOrPitch: number,
    distance: number,
    target?: { x: number; y: number; z: number }
  ): void {
    this.theta = theta;

    // Auto-detect whether phi (polar angle, typically 1.15 to 2.5 rad) or direct pitch (-1.05 to +1.15) was passed
    if (phiOrPitch > 1.15 && phiOrPitch < 3.0) {
      this.pitch = THREE.MathUtils.clamp(Math.PI / 2 - phiOrPitch, this.minPitch, this.maxPitch);
    } else {
      this.pitch = THREE.MathUtils.clamp(phiOrPitch, this.minPitch, this.maxPitch);
    }

    this.distance = THREE.MathUtils.clamp(distance, this.minDistance, this.maxDistance);
    this.targetDistance = this.distance;
    this.collisionDistance = this.distance;

    if (target) {
      this.currentFocus.set(target.x, target.y + 0.8, target.z);
    }

    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinTheta = Math.sin(this.theta);
    const cosTheta = Math.cos(this.theta);

    const forwardX = -sinTheta * cosPitch;
    const forwardY = sinPitch;
    const forwardZ = -cosTheta * cosPitch;

    const camY = Math.max(this.minGroundY, this.currentFocus.y - forwardY * this.distance);
    this.currentPosition.set(
      this.currentFocus.x - forwardX * this.distance,
      camY,
      this.currentFocus.z - forwardZ * this.distance
    );
    this.currentLookTarget.set(
      this.currentFocus.x + forwardX * 25.0,
      this.currentFocus.y + forwardY * 25.0,
      this.currentFocus.z + forwardZ * 25.0
    );

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookTarget);
  }

  public dispose(): void {
    window.removeEventListener('mousemove', this.onMouseMoveBound);
    this.domElement.removeEventListener('mousedown', this.onMouseDownBound);
    window.removeEventListener('mouseup', this.onMouseUpBound);
    this.domElement.removeEventListener('wheel', this.onWheelBound);
    document.removeEventListener('pointerlockchange', this.onPointerLockChangeBound);
  }
}
