# Local Recovery Checkpoint: UPGRADE9_PERFORMANCE_AND_CAMERA_APPROVED

- **Created**: 2026-11-25
- **Status**: Manually Approved by User
- **Branch**: `feature/remy-two-characters` (uncommitted local working tree)
- **Strict Invariant**:
  > `ThirdPersonCamera.ts` (corrected spring-arm distance & exclusion) and `PlayerController.ts` (identical to `UPGRADE8_CONTROLS_APPROVED`) are now the **approved baseline**. Do NOT modify them during future wildlife, sky, or campus development.

---

## 1. Preserved Contents

### Source Backups
- `ThirdPersonCamera.ts.bak` — Corrected spring-arm raycast starting at `desiredFocus` with `excludeCollider`, smooth `collisionDistance` pull-in (`24.0`) & recovery (`8.0`), and single responsive focus damping (`32.0`).
- `PlayerController.ts.bak` — Byte-for-byte identical to `UPGRADE8_CONTROLS_APPROVED` (`SHA-256: f67e8d9f7e85a85ba23940ff0440ca0c45c16f5b23264b4f9807e913096753c8`).
- `GameEngine.ts.bak` — Passes `player.collider` / `activeVehicle.collider` to `cameraController.update(...)`, clamps pixel ratio (`<= 1.5`), passes `renderer` to `LivingSky.update(...)`, disposes `PMREMGenerator`.
- `PhysicsWorld.ts.bak` — Caches `initPromise` for `RAPIER.init()` to prevent React StrictMode concurrent WASM initialization corruption.
- `VehicleController.ts.bak` — Merges `car.glb` 51 static sub-meshes by material/shadow flag (`Campus_Car_Merged`) and enables `frustumCulled = true` on `car.glb` & `scooter.glb`.
- `CVRCampusMap.ts.bak` — Stage B (59 static buses in 7 `InstancedMesh`es + 2 texture atlases), Stage C (`mergeGeometries` static batching for roads, curbs, dashes, crosswalks, wrought-iron gates, props), Stage E (`Streetlight_Single.glb` instancing + foliage shadow pruning).
- `LivingSky.ts.bak` — Stage D (stereographic `768x768` cloud `WebGLRenderTarget` with bilinear upsampling updated every 2nd frame; full-res clear sky gradient & sun disc).
- `BirdWildlifeSystem.ts.bak` — Fantasy `phoenix_bird.glb` and Phase C wildlife disabled.

### Patch, Untracked Inventory & Test Suites
- `UPGRADE9_PERFORMANCE_AND_CAMERA_APPROVED.patch` — Full `git diff` of tracked modified files.
- `untracked_and_modified_files.txt` — Inventory of modified and untracked files (notably untracked `src/game/LivingSky.ts`, `src/game/BirdWildlifeSystem.ts`, `public/models/trees/*`, `public/fonts/*`, `public/textures/*`, `src/assets/*`).
- `test_controls_regression.cjs` — 11-stage controls regression suite.
- `verify_camera_distance_fix.cjs` — Directional, curb/tree/bus/wall, obstruction recovery, and Remy/Aarav camera distance verification.
- `verify_wallclock_60s_and_gameplay.cjs` — 60s real wall-clock `requestAnimationFrame` + mandatory gameplay verification.
- `camera_distance_fix_results.json` — Raw verified camera distance & obstruction recovery metrics.
- `full_verification_report.json` — Raw 60.01s wall-clock `rAF` performance and gameplay verification JSON.

---

## 2. Verified Performance Measurements

- **Real 60.01-Second Wall-Clock `requestAnimationFrame` (`1280x720`, `DPR = 1`, Chrome 60 Hz vsync)**:
  - **Frames Sampled**: 3,601 `rAF` frames over 60.01 s
  - **Average FPS**: **60.0 FPS** (`16.67 ms` avg frame time)
  - **1% Low / Min FPS**: **59.5 FPS** (`16.8 ms` p99 / max frame time)
  - **Average Draw Calls**: **155** (min `88`, max `284` vs baseline `2,029` avg / `3,316` peak)
  - **Average Triangles**: **682,226** (min `416,282`, max `1,308,659` vs baseline `1,357,466` avg)
  - **Memory**: `150` geometries, `80` textures (vs baseline `962` geometries, `197` textures)
- **Resolution Comparison (10s `rAF`, 600 frames each)**:
  - `DPR = 2.0` (`2560x1440`): `60.0 FPS` avg, `59.5 FPS` 1% low, `16.67 ms` avg / `16.8 ms` p99.
  - `DPR = 1.5` (`1920x1080`): `60.0 FPS` avg, `59.5 FPS` 1% low, `16.67 ms` avg / `16.8 ms` p99 (43.75% fewer fragment pixels).

---

## 3. Verified Camera Distance Results

- **Sprint Backward (`Shift+S`)**:
  - Remy Open Forecourt: `3.259 – 3.399 m` (`0` self-hits; previously collapsed to `0.876 m`)
  - Remy Near Curb / Avenue Trees / Parked Buses Aisle: `3.259 – 3.399 m` (`0` self-hits)
  - Aarav Open Forecourt: `3.259 – 3.399 m` (`0` self-hits)
- **All Other Directions (Remy & Aarav)**:
  - Walk Forward/Backward: `3.341 – 3.459 m`
  - Sprint Forward: `3.399 – 3.541 m`
  - Sprint Strafe (`A`/`D`): `3.399 – 3.403 m`
  - Sprint Diagonals: `3.302 – 3.501 m`
- **Genuine Obstruction & Smooth Recovery**:
  - East Gate Pillar obstruction: pulled in to `1.261 m`; smoothly recovered `1.261 -> 2.494 -> 3.088 -> 3.293 -> 3.363 -> 3.387 -> 3.396 -> 3.398 m`.

---

## 4. Restoration Instructions

To restore the exact `UPGRADE9_PERFORMANCE_AND_CAMERA_APPROVED` source state without overwriting earlier checkpoints (`UPGRADE8_CONTROLS_APPROVED`, `PRE_UPGRADE9_OPTIMIZATION`, `PRE_CAMERA_DISTANCE_FIX`):

```bash
cp checkpoints/UPGRADE9_PERFORMANCE_AND_CAMERA_APPROVED/ThirdPersonCamera.ts.bak src/game/ThirdPersonCamera.ts
cp checkpoints/UPGRADE9_PERFORMANCE_AND_CAMERA_APPROVED/PlayerController.ts.bak src/game/PlayerController.ts
cp checkpoints/UPGRADE9_PERFORMANCE_AND_CAMERA_APPROVED/GameEngine.ts.bak src/game/GameEngine.ts
cp checkpoints/UPGRADE9_PERFORMANCE_AND_CAMERA_APPROVED/PhysicsWorld.ts.bak src/game/PhysicsWorld.ts
cp checkpoints/UPGRADE9_PERFORMANCE_AND_CAMERA_APPROVED/VehicleController.ts.bak src/game/VehicleController.ts
cp checkpoints/UPGRADE9_PERFORMANCE_AND_CAMERA_APPROVED/CVRCampusMap.ts.bak src/game/CVRCampusMap.ts
cp checkpoints/UPGRADE9_PERFORMANCE_AND_CAMERA_APPROVED/LivingSky.ts.bak src/game/LivingSky.ts
cp checkpoints/UPGRADE9_PERFORMANCE_AND_CAMERA_APPROVED/BirdWildlifeSystem.ts.bak src/game/BirdWildlifeSystem.ts
npm run build
```

Verify controls after restoration:
```bash
npm run test:controls
```
