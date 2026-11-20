import * as THREE from 'three';

export class ThirdPersonCamera {
  public camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  // Camera Spherical Angles
  public theta = Math.PI; // Horizontal azimuth angle (PI radians = behind player looking South down 12M Spine)
  public phi = 1.18; // Vertical elevation angle (radians, ~67 degrees)
  public distance = 7.5; // Current zoom distance
  private targetDistance = 7.5;

  private readonly minDistance = 4.5;
  private readonly maxDistance = 18.0;

  private readonly minPhi = 0.15; // Overhead limit
  private readonly maxPhi = 1.45; // Low-angle limit (prevents ground dip)
  private readonly minGroundY = 0.8; // Minimum absolute Y coordinate

  // Damping positions
  private currentTarget = new THREE.Vector3(25, 1.5, -168);
  private currentPosition = new THREE.Vector3(25, 4.2, -176);

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

  constructor(domElement: HTMLElement) {
    this.domElement = domElement;

    // 1. Perspective Camera
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );

    // Initial position behind default spawn (spawn is at x: 141, z: 48, camera behind at x: 149)
    this.currentPosition.set(149, 4.2, 48);
    this.camera.position.copy(this.currentPosition);

    // 2. Event Listeners Setup
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
      // Pointer lock direct look
      const sensitivity = 0.0024;
      this.theta -= e.movementX * sensitivity;
      this.phi += e.movementY * sensitivity;
      this.phi = THREE.MathUtils.clamp(this.phi, this.minPhi, this.maxPhi);
    } else if (this.isMouseDown) {
      // Click & Drag orbit fallback (MacBook trackpad-friendly)
      const deltaX = e.clientX - this.prevMouseX;
      const deltaY = e.clientY - this.prevMouseY;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;

      const sensitivity = 0.005;
      this.theta -= deltaX * sensitivity;
      this.phi += deltaY * sensitivity;
      this.phi = THREE.MathUtils.clamp(this.phi, this.minPhi, this.maxPhi);
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
    targetPos: { x: number; y: number; z: number }
  ): void {
    // 1. Character look-at target (focus slightly above player waist)
    const desiredTarget = new THREE.Vector3(
      targetPos.x,
      targetPos.y + 1.35,
      targetPos.z
    );

    // Smoothly damp target following
    const targetLerp = 1 - Math.exp(-18.0 * dt);
    this.currentTarget.lerp(desiredTarget, THREE.MathUtils.clamp(targetLerp, 0, 1));

    // 2. Smooth zoom damping
    const zoomLerp = 1 - Math.exp(-12.0 * dt);
    this.distance = THREE.MathUtils.lerp(
      this.distance,
      this.targetDistance,
      THREE.MathUtils.clamp(zoomLerp, 0, 1)
    );

    // 3. Compute spherical coordinate position relative to target
    const sinPhi = Math.sin(this.phi);
    const cosPhi = Math.cos(this.phi);
    const sinTheta = Math.sin(this.theta);
    const cosTheta = Math.cos(this.theta);

    const desiredCamX = this.currentTarget.x + this.distance * sinPhi * sinTheta;
    const desiredCamY = this.currentTarget.y + this.distance * cosPhi;
    const desiredCamZ = this.currentTarget.z + this.distance * sinPhi * cosTheta;

    const desiredPosition = new THREE.Vector3(
      desiredCamX,
      desiredCamY,
      desiredCamZ
    );

    // 4. Ground clipping guard: camera never dips below 0.8m above ground
    if (desiredPosition.y < this.minGroundY) {
      desiredPosition.y = this.minGroundY;
    }

    // 5. Smooth camera position damping
    const camLerp = 1 - Math.exp(-15.0 * dt);
    this.currentPosition.lerp(
      desiredPosition,
      THREE.MathUtils.clamp(camLerp, 0, 1)
    );

    // Apply to camera
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public getAzimuth(): number {
    return this.theta;
  }

  public snapView(
    theta: number,
    phi: number,
    distance: number,
    target?: { x: number; y: number; z: number }
  ): void {
    this.theta = theta;
    this.phi = THREE.MathUtils.clamp(phi, this.minPhi, this.maxPhi);
    this.distance = THREE.MathUtils.clamp(distance, this.minDistance, this.maxDistance);
    this.targetDistance = this.distance;
    if (target) {
      this.currentTarget.set(target.x, target.y, target.z);
      const sinPhi = Math.sin(this.phi);
      const cosPhi = Math.cos(this.phi);
      const sinTheta = Math.sin(this.theta);
      const cosTheta = Math.cos(this.theta);
      this.currentPosition.set(
        target.x + this.distance * sinPhi * sinTheta,
        Math.max(this.minGroundY, target.y + this.distance * cosPhi),
        target.z + this.distance * sinPhi * cosTheta
      );
      this.camera.position.copy(this.currentPosition);
      this.camera.lookAt(this.currentTarget);
    }
  }

  public dispose(): void {
    window.removeEventListener('mousemove', this.onMouseMoveBound);
    this.domElement.removeEventListener('mousedown', this.onMouseDownBound);
    window.removeEventListener('mouseup', this.onMouseUpBound);
    this.domElement.removeEventListener('wheel', this.onWheelBound);
    document.removeEventListener('pointerlockchange', this.onPointerLockChangeBound);
  }
}
