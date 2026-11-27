import RAPIER from '@dimforge/rapier3d-compat';

export interface RayHit {
  timeOfImpact: number;
  collider: RAPIER.Collider;
  point?: { x: number; y: number; z: number };
}

export class PhysicsWorld {
  private world: RAPIER.World;
  private static initPromise: Promise<void> | null = null;

  private constructor(world: RAPIER.World) {
    this.world = world;
  }

  public static async create(gravity = { x: 0.0, y: -9.81, z: 0.0 }): Promise<PhysicsWorld> {
    if (!PhysicsWorld.initPromise) {
      PhysicsWorld.initPromise = RAPIER.init();
    }
    await PhysicsWorld.initPromise;
    const world = new RAPIER.World(gravity);
    return new PhysicsWorld(world);
  }

  public get rawWorld(): RAPIER.World {
    return this.world;
  }

  /**
   * Creates a static box obstacle with half-extents calculated from width, height, depth.
   */
  public createStaticBox(
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    rotationY: number = 0
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    const halfX = Math.max(width / 2, 0.01);
    const halfY = Math.max(height / 2, 0.01);
    const halfZ = Math.max(depth / 2, 0.01);

    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
    if (rotationY !== 0) {
      const halfAngle = rotationY / 2;
      bodyDesc.setRotation({
        x: 0,
        y: Math.sin(halfAngle),
        z: 0,
        w: Math.cos(halfAngle),
      });
    }

    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(halfX, halfY, halfZ)
      .setFriction(0.6)
      .setRestitution(0.0);
    const collider = this.world.createCollider(colliderDesc, body);

    return { body, collider };
  }

  /**
   * Creates a static cylinder obstacle (for pillars, light poles, tree trunks).
   */
  public createStaticCylinder(
    x: number,
    y: number,
    z: number,
    height: number,
    radius: number
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cylinder(height / 2, radius)
      .setFriction(0.6)
      .setRestitution(0.0);
    const collider = this.world.createCollider(colliderDesc, body);

    return { body, collider };
  }

  /**
   * Creates a dynamic capsule for player physics.
   */
  public createDynamicCapsule(
    x: number,
    y: number,
    z: number,
    halfHeight: number,
    radius: number,
    mass: number = 70.0
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .lockRotations() // Lock rotational degrees to prevent tipping over
      .setLinearDamping(0.2)
      .setCanSleep(false);

    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.capsule(halfHeight, radius)
      .setFriction(0.2)
      .setRestitution(0.0)
      .setMass(mass);

    const collider = this.world.createCollider(colliderDesc, body);
    return { body, collider };
  }

  /**
   * Creates a dynamic box for vehicle physics.
   */
  public createDynamicBox(
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    mass: number = 1000.0
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    const halfX = Math.max(width / 2, 0.05);
    const halfY = Math.max(height / 2, 0.05);
    const halfZ = Math.max(depth / 2, 0.05);

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .lockRotations() // Lock pitch & roll to prevent vehicle cartwheeling, yaw managed by controller
      .setLinearDamping(0.5)
      .setCanSleep(false);

    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(halfX, halfY, halfZ)
      .setFriction(0.3)
      .setRestitution(0.0)
      .setMass(mass);

    const collider = this.world.createCollider(colliderDesc, body);
    return { body, collider };
  }

  /**
   * Downward or directional raycast with exclusion of the specified rigid body.
   */
  public castRay(
    origin: { x: number; y: number; z: number },
    direction: { x: number; y: number; z: number },
    maxToi: number,
    solid: boolean = true,
    excludeCollider?: RAPIER.Collider
  ): RayHit | null {
    if (this.isDisposed) return null;
    try {
      const ray = new RAPIER.Ray(origin, direction);
      const hit = this.world.castRay(
        ray,
        maxToi,
        solid,
        undefined,
        undefined,
        excludeCollider
      );

      if (hit) {
        return {
          timeOfImpact: hit.timeOfImpact,
          collider: hit.collider,
          point: {
            x: origin.x + direction.x * hit.timeOfImpact,
            y: origin.y + direction.y * hit.timeOfImpact,
            z: origin.z + direction.z * hit.timeOfImpact,
          },
        };
      }
    } catch (e) {
      console.warn('castRay error suppressed:', e);
    }
    return null;
  }

  private isDisposed = false;

  public step(): void {
    if (this.isDisposed) return;
    try {
      this.world.step();
    } catch (e) {
      console.warn('PhysicsWorld.step suppressed during transition:', e);
    }
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    try {
      this.world.free();
    } catch (e) {
      // ignore if already cleaned
    }
  }
}
