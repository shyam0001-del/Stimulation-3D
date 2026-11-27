import * as THREE from 'three';

export interface EnvironmentalWindUniforms {
  uWindEnabled: { value: number };
  uWindPhase: { value: number };
  uGustPhase: { value: number };
  uLeafPhase: { value: number };
  uWindDir: { value: THREE.Vector2 };
  uWindStrength: { value: number };
}

export interface EnvironmentalWindState {
  enabled: boolean;
  windAngleRad: number;
  windDirX: number;
  windDirZ: number;
  windStrength: number;
  gustLevel: number;
  cloudSpeed: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * EnvironmentalWind — Lightweight shared wind simulation (Upgrade 13 Phase A)
 *
 * Drives continuous gentle ambient breeze, slow direction shifts, non-repetitive
 * traveling gusts, GPU vegetation uniforms, cloud drift coordination, and exact
 * CPU-matched tree branch displacement for perched bird synchronization.
 */
export class EnvironmentalWind {
  public enabled = true;
  private elapsed = 0;
  private windAngle = 0.49; // ~28 deg ENE prevailing wind aligned with sky clouds
  public readonly windDir = new THREE.Vector2(Math.cos(0.49), Math.sin(0.49)).normalize();
  public windStrength = 0.65;
  public gustLevel = 0.0;
  public cloudSpeed = 0.018;

  public readonly uniforms: EnvironmentalWindUniforms = {
    uWindEnabled: { value: 1.0 },
    uWindPhase: { value: 0.0 },
    uGustPhase: { value: 0.0 },
    uLeafPhase: { value: 0.0 },
    uWindDir: { value: new THREE.Vector2(Math.cos(0.49), Math.sin(0.49)).normalize() },
    uWindStrength: { value: 0.65 },
  };

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.uniforms.uWindEnabled.value = enabled ? 1.0 : 0.0;
  }

  public update(deltaTime: number): void {
    const dt = Math.min(Math.max(deltaTime, 0.0), 0.05);
    if (!this.enabled || dt <= 0) {
      this.uniforms.uWindEnabled.value = this.enabled ? 1.0 : 0.0;
      return;
    }

    this.elapsed += dt;

    // Gradual multi-harmonic shift in prevailing wind direction (frame-rate independent)
    this.windAngle =
      0.49 +
      0.24 * Math.sin(this.elapsed * 0.043) +
      0.11 * Math.sin(this.elapsed * 0.019 + 1.3);
    this.windDir.set(Math.cos(this.windAngle), Math.sin(this.windAngle)).normalize();

    // Gentle ambient breeze + occasional soft gusts (cubic-shaped waves avoid repetitive pulsing)
    const baseBreeze =
      0.58 +
      0.14 * Math.sin(this.elapsed * 0.17) +
      0.08 * Math.cos(this.elapsed * 0.29 + 0.7);
    const gustRaw = 0.5 + 0.5 * Math.sin(this.elapsed * 0.23 + 0.4 * Math.sin(this.elapsed * 0.071));
    const gustMod = 0.5 + 0.5 * Math.sin(this.elapsed * 0.13 + 2.1);
    const targetGust = Math.pow(gustRaw, 3.0) * (0.45 + 0.55 * gustMod);

    const smoothLerp = 1.0 - Math.exp(-dt * 2.4);
    this.gustLevel += (targetGust - this.gustLevel) * smoothLerp;
    const targetStrength = baseBreeze + this.gustLevel * 0.68;
    this.windStrength += (targetStrength - this.windStrength) * smoothLerp;

    // Integrated phase accumulators avoid phase-jump flicker when wind strength changes
    this.uniforms.uWindPhase.value += dt * (1.05 + 0.55 * this.windStrength);
    this.uniforms.uGustPhase.value += dt * (0.62 + 0.45 * this.windStrength);
    this.uniforms.uLeafPhase.value += dt * (2.65 + 1.45 * this.windStrength);
    this.uniforms.uWindDir.value.copy(this.windDir);
    this.uniforms.uWindStrength.value = this.windStrength;
    this.uniforms.uWindEnabled.value = 1.0;

    // Coordinate cloud drift gently with wind envelope
    this.cloudSpeed = 0.014 + 0.008 * this.windStrength;
  }

  /**
   * Computes the EXACT world-space macro branch displacement applied on the GPU vertex shader
   * for any point `(localPos)` inside an InstancedMesh tree at `(treeX, 0, treeZ)`.
   * Guaranteed identical to `buildRealisticUpgradeTrees` so perched pigeon claws never slide or float.
   */
  public evaluateTreeBranchOffset(
    treeX: number,
    treeZ: number,
    localX: number,
    localY: number,
    localZ: number,
    treeScale: number,
    out: THREE.Vector3
  ): THREE.Vector3 {
    const enabledVal = this.uniforms.uWindEnabled.value;
    if (enabledVal <= 0.001) {
      return out.set(0, 0, 0);
    }

    const heightFactor = smoothstep(2.2, 6.2, localY);
    if (heightFactor <= 0.0) {
      return out.set(0, 0, 0);
    }

    const radialDist = Math.hypot(localX, localZ);
    const radialFactor = smoothstep(0.12, 0.72, radialDist + Math.max(0.0, localY - 3.8) * 0.25);
    const branchWeight = heightFactor * radialFactor;
    if (branchWeight <= 0.0001) {
      return out.set(0, 0, 0);
    }

    const uWindPhase = this.uniforms.uWindPhase.value;
    const uGustPhase = this.uniforms.uGustPhase.value;
    const wx = this.uniforms.uWindDir.value.x;
    const wz = this.uniforms.uWindDir.value.y;
    const str = this.uniforms.uWindStrength.value * enabledVal;

    const treePhase = treeX * 0.13 + treeZ * 0.19;
    const gustWave = Math.sin(uGustPhase - (treeX * wx + treeZ * wz) * 0.045);

    const localSwayScalar =
      (0.55 * Math.sin(uWindPhase + treePhase) +
        0.30 * Math.cos(uWindPhase * 0.71 - treePhase * 1.37) +
        0.55 * (0.5 + 0.5 * gustWave)) *
      str;
    const crossScalar =
      0.22 * Math.sin(uWindPhase * 1.18 + treePhase * 1.7 + 0.9) * str;

    const amp = 0.095 * branchWeight;
    const branchDx = (wx * localSwayScalar - wz * crossScalar) * amp;
    const branchDz = (wz * localSwayScalar + wx * crossScalar) * amp;
    const branchDy = (-0.28 * (branchDx * branchDx + branchDz * branchDz)) / Math.max(treeScale * 2.0, 1.0);

    return out.set(branchDx, branchDy, branchDz);
  }

  public getState(): EnvironmentalWindState {
    return {
      enabled: this.enabled,
      windAngleRad: Number(this.windAngle.toFixed(4)),
      windDirX: Number(this.windDir.x.toFixed(4)),
      windDirZ: Number(this.windDir.y.toFixed(4)),
      windStrength: Number(this.windStrength.toFixed(4)),
      gustLevel: Number(this.gustLevel.toFixed(4)),
      cloudSpeed: Number(this.cloudSpeed.toFixed(5)),
    };
  }
}
