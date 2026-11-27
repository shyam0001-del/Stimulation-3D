# UPGRADE10B_LIVING_WILDLIFE_APPROVED — Recovery Checkpoint

Created before Upgrade 11 (Cinematic Visual Realism).
Preserves the complete Upgrade 10B 10-bird campus wildlife system (9 realistic Rock Pigeons `animated_bird_pigeon.glb` with full branch landing/perching/takeoff lifecycle + 1 realistic soaring eagle `animated_eagle.glb`, `animated_parrot.glb` & `phoenix_bird.glb` omitted/disabled), locked `ThirdPersonCamera.ts` & `PlayerController.ts`, Upgrade 9 optimizations, and all prior checkpoints (`UPGRADE8_CONTROLS_APPROVED`, `PRE_UPGRADE9_OPTIMIZATION`, `PRE_CAMERA_DISTANCE_FIX`, `UPGRADE9_PERFORMANCE_AND_CAMERA_APPROVED`, `UPGRADE10A_SINGLE_PIGEON_APPROVED`).

## Locked Baseline Checksums (`shasum -a 256`)
- `ThirdPersonCamera.ts`: `17f40abead26fd6fe5497307cf182dafd7fbdb7a742bab03ee957f0a643fffe0`
- `PlayerController.ts`: `f67e8d9f7e85a85ba23940ff0440ca0c45c16f5b23264b4f9807e913096753c8`

## Preserved Upgrade 10B Performance
- **0 Birds (60s)**: Avg `59.93 FPS`, 1% low `59.52 FPS`, `220` draw calls, `1,029,758` tris.
- **6 Birds (60s)**: Avg `60.01 FPS`, 1% low `59.52 FPS`, `235` draw calls, `1,040,653` tris, `0.3143 ms` anim CPU.
- **10 Birds (60s)**: Avg `60.01 FPS`, 1% low `59.52 FPS`, `0` spikes >20ms, `245` draw calls, `1,055,424` tris, `0.4061 ms` anim CPU, `0` obstacle overlaps.
- `npm run build` & `npm run test:controls` (11/11) passed.

## Restoration Instructions
```bash
cp checkpoints/UPGRADE10B_LIVING_WILDLIFE_APPROVED/BirdWildlifeSystem.ts.bak src/game/BirdWildlifeSystem.ts
cp checkpoints/UPGRADE10B_LIVING_WILDLIFE_APPROVED/GameEngine.ts.bak src/game/GameEngine.ts
cp checkpoints/UPGRADE10B_LIVING_WILDLIFE_APPROVED/ThirdPersonCamera.ts.bak src/game/ThirdPersonCamera.ts
cp checkpoints/UPGRADE10B_LIVING_WILDLIFE_APPROVED/PlayerController.ts.bak src/game/PlayerController.ts
cp checkpoints/UPGRADE10B_LIVING_WILDLIFE_APPROVED/PhysicsWorld.ts.bak src/game/PhysicsWorld.ts
cp checkpoints/UPGRADE10B_LIVING_WILDLIFE_APPROVED/VehicleController.ts.bak src/game/VehicleController.ts
cp checkpoints/UPGRADE10B_LIVING_WILDLIFE_APPROVED/CVRCampusMap.ts.bak src/game/CVRCampusMap.ts
cp checkpoints/UPGRADE10B_LIVING_WILDLIFE_APPROVED/LivingSky.ts.bak src/game/LivingSky.ts
cp checkpoints/UPGRADE10B_LIVING_WILDLIFE_APPROVED/THIRD_PARTY_ASSETS.md.bak THIRD_PARTY_ASSETS.md
npm run build && npm run test:controls
```
