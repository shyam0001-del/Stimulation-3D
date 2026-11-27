# UPGRADE10A_SINGLE_PIGEON_APPROVED — Recovery Checkpoint

Created before Upgrade 10B (Multi-Bird Living Campus Wildlife).
Preserves the manually approved single-pigeon implementation (`animated_bird_pigeon.glb`), calibrated dimensions, organic obstacle-aware flight, approved `ThirdPersonCamera.ts` and `PlayerController.ts` baselines, Upgrade 9 performance optimizations, and all earlier checkpoints (`UPGRADE8_CONTROLS_APPROVED`, `PRE_UPGRADE9_OPTIMIZATION`, `PRE_CAMERA_DISTANCE_FIX`, `UPGRADE9_PERFORMANCE_AND_CAMERA_APPROVED`).

## Locked Baseline Checksums (`shasum -a 256`)
- `ThirdPersonCamera.ts`: `17f40abead26fd6fe5497307cf182dafd7fbdb7a742bab03ee957f0a643fffe0`
- `PlayerController.ts`: `f67e8d9f7e85a85ba23940ff0440ca0c45c16f5b23264b4f9807e913096753c8`

## Preserved Upgrade 10A Performance & Verification
- **60s Baseline (Pigeon Disabled)**: Avg `60.01 FPS`, 1% low `59.52 FPS`, `16.66 ms` avg / `16.80 ms` max, `0` spikes >20ms, `199` draw calls, `969,470` tris.
- **60s Active (1 Calibrated Pigeon)**: Avg `60.01 FPS`, 1% low `59.52 FPS`, `16.66 ms` avg / `16.80 ms` max, `0` spikes >20ms, `0.0861 ms` avg animation CPU cost, `0` obstacle overlaps, `62.0 cm` wingspan, `33.7 cm` standing body length.
- `npm run build` & `npm run test:controls` (11/11) passed.

## Files Backed Up Here
- `BirdWildlifeSystem.ts.bak`
- `GameEngine.ts.bak`
- `ThirdPersonCamera.ts.bak`
- `PlayerController.ts.bak`
- `PhysicsWorld.ts.bak`
- `VehicleController.ts.bak`
- `CVRCampusMap.ts.bak`
- `LivingSky.ts.bak`
- `THIRD_PARTY_ASSETS.md.bak`
- `UPGRADE10A_SINGLE_PIGEON_APPROVED.patch`
- `untracked_and_modified_files.txt`
- `test_controls_regression.cjs`
- `upgrade10A_complete_report.json`
- `phaseA_bird_models_inspection.json`

## Restoration Instructions
To restore the exact `UPGRADE10A_SINGLE_PIGEON_APPROVED` state from repository root:
```bash
cp checkpoints/UPGRADE10A_SINGLE_PIGEON_APPROVED/BirdWildlifeSystem.ts.bak src/game/BirdWildlifeSystem.ts
cp checkpoints/UPGRADE10A_SINGLE_PIGEON_APPROVED/GameEngine.ts.bak src/game/GameEngine.ts
cp checkpoints/UPGRADE10A_SINGLE_PIGEON_APPROVED/ThirdPersonCamera.ts.bak src/game/ThirdPersonCamera.ts
cp checkpoints/UPGRADE10A_SINGLE_PIGEON_APPROVED/PlayerController.ts.bak src/game/PlayerController.ts
cp checkpoints/UPGRADE10A_SINGLE_PIGEON_APPROVED/PhysicsWorld.ts.bak src/game/PhysicsWorld.ts
cp checkpoints/UPGRADE10A_SINGLE_PIGEON_APPROVED/VehicleController.ts.bak src/game/VehicleController.ts
cp checkpoints/UPGRADE10A_SINGLE_PIGEON_APPROVED/CVRCampusMap.ts.bak src/game/CVRCampusMap.ts
cp checkpoints/UPGRADE10A_SINGLE_PIGEON_APPROVED/LivingSky.ts.bak src/game/LivingSky.ts
cp checkpoints/UPGRADE10A_SINGLE_PIGEON_APPROVED/THIRD_PARTY_ASSETS.md.bak THIRD_PARTY_ASSETS.md
npm run build && npm run test:controls
```
