# Recovery Checkpoint: UPGRADE8_CONTROLS_APPROVED

**Timestamp:** 2026-11-24T18:58:00+05:30  
**Status:** Approved by User  
**Branch:** feature/remy-two-characters (uncommitted local working tree)

---

## 1. Scope & Purpose

This checkpoint preserves the verified, mathematically proven, and user-approved mouse and keyboard input and camera control pipeline for the CVR College of Engineering 3D Campus.

**Strict Invariant Rule:**
> Do NOT modify the approved camera or movement controls in `ThirdPersonCamera.ts` or `PlayerController.ts` during subsequent wildlife, sky, lighting, or campus development.

---

## 2. Approved Control Specification

### Mouse Controls (GTA / Standard 3D Orbit & Direct Look)
- **Mouse Right** (`movementX > 0`): Azimuth angle $\theta$ decreases $\to$ camera view turns RIGHT $\to$ stationary world objects shift LEFT on screen.
- **Mouse Left** (`movementX < 0`): Azimuth angle $\theta$ increases $\to$ camera view turns LEFT $\to$ stationary world objects shift RIGHT on screen.
- **Mouse Up** (`movementY < 0`): Pitch angle increases $\to$ camera looks UPWARD into sky/clouds (up to $+79^\circ$).
- **Mouse Down** (`movementY > 0`): Pitch angle decreases $\to$ camera looks DOWNWARD toward ground/road (down to $-60^\circ$).

### Keyboard Controls (Screen / Camera Relative Locomotion)
The campus main avenue extends along $+Z$ (South). With initial camera at yaw $\theta = \pi$ looking South:
- **`W` / `ArrowUp`**: Moves forward away from camera along line of sight ($\vec{v} \cdot \vec{f}_{\text{cam}} > 0$).
- **`S` / `ArrowDown`**: Moves backward toward camera ($\vec{v} \cdot (-\vec{f}_{\text{cam}}) > 0$).
- **`A` / `ArrowLeft`**: Strafes left along camera left ($\vec{v} \cdot \vec{l}_{\text{cam}} > 0$, toward screen-left).
- **`D` / `ArrowRight`**: Strafes right along camera right ($\vec{v} \cdot \vec{r}_{\text{cam}} > 0$, toward screen-right).
- **`Shift`**: Sprint (boosts speed from 3.0 m/s to 6.0 m/s).
- **`Space`**: Jump (vertical impulse 4.2 m/s, ~0.8m jump height).
- **`R`**: Reset Gate (teleports to $(25.0, 0.8, -184.0)$ facing South into campus, resetting camera view behind player).

---

## 3. Mathematical Coordinate Reference

In Three.js right-handed coordinate space:
- Line-of-sight forward vector: $\vec{f} = (-\sin\theta \cos(pitch), \, \sin(pitch), \, -\cos\theta \cos(pitch))$
- Horizontal camera forward vector: $\vec{f}_h = (-\sin\theta, \, -\cos\theta)$
- Horizontal camera right vector: $\vec{r}_h = (\cos\theta, \, -\sin\theta)$

Movement direction in `PlayerController.ts`:
```ts
const sinA = Math.sin(cameraAzimuth);
const cosA = Math.cos(cameraAzimuth);

// Camera forward vector in world: (-sinA, -cosA)
// Camera right vector in world:   (cosA, -sinA)
// worldDir = nx * right + nz * forward
const worldDirX = nx * cosA - nz * sinA;
const worldDirZ = -nx * sinA - nz * cosA;
```

---

## 4. Retained Regression Test Suite

The 11 automated live browser tests are retained in `test_controls_regression.cjs`.

### How to Run Regression Tests
```bash
# In headless Chrome or live browser environment:
node checkpoints/UPGRADE8_CONTROLS_APPROVED/test_controls_regression.cjs
```

### Verified Test Cases
1. `Test 1`: Mouse Right shifts world marker left on screen.
2. `Test 2`: Mouse Left shifts world marker right on screen.
3. `Test 3`: Mouse Up increases pitch and looks up toward sky.
4. `Test 4`: Mouse Down decreases pitch and looks down toward ground.
5. `Test 5`: Key `D` moves character along Camera Right (Screen-Right).
6. `Test 6`: Key `A` moves character along Camera Left (Screen-Left).
7. `Test 7`: Key `W` moves character forward into campus.
8. `Test 8`: Key `S` moves character backward toward camera.
9. `Test 9`: Directional consistency at all 4 cardinal angles ($0^\circ, 90^\circ, 180^\circ, 270^\circ$).
10. `Test 10`: Reset Gate (`KeyR`) cleanly restores spawn and camera alignment.
11. `Test 11`: Character switch to Aarav (`aarav-cse`) operates identically.

---

## 5. Checkpoint Files
- `ThirdPersonCamera.ts.bak`: Full source of approved camera controller.
- `PlayerController.ts.bak`: Full source of approved player controller.
- `UPGRADE8_CONTROLS_APPROVED.patch`: Full git diff patch of the approved state.
- `test_controls_regression.cjs`: Automated 11-test regression verification suite.
