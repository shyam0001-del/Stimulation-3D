# UPGRADE11_CINEMATIC_LIGHTING_APPROVED — Recovery Checkpoint

Created after Upgrade 11 (Cinematic Visual Realism & Balanced/Morning/Afternoon Daylight Presets) and manual visual verification before starting Upgrade 12 (Real-Time Dynamic Day and Night Cycle).

Preserves:
- Approved Upgrade 11 PBR material calibrations (`CVRCampusMap.ts`, `VehicleController.ts`, `GameEngine.ts`)
- Balanced HDR `LivingSky` shader (`1.8` scale) and dynamic `setSkyPalette(...)`
- Synchronized per-preset outdoor IBL environment map caching (`balanced`, `morning`, `afternoon`)
- All 3 approved daylight presets (`A Balanced`, `B Morning`, `C Afternoon`) + verified temporary comparison selector (`SandboxHUD.tsx`, `App.tsx`)
- Approved Upgrade 10B living wildlife (9 pigeons + 1 eagle) and Upgrade 9 performance optimizations (~60 FPS)
- Byte-for-byte locked `ThirdPersonCamera.ts` and `PlayerController.ts`
- All prior checkpoints (`UPGRADE8_CONTROLS_APPROVED`, `PRE_UPGRADE9_OPTIMIZATION`, `PRE_CAMERA_DISTANCE_FIX`, `UPGRADE9_PERFORMANCE_AND_CAMERA_APPROVED`, `UPGRADE10A_SINGLE_PIGEON_APPROVED`, `UPGRADE10B_LIVING_WILDLIFE_APPROVED`).

## Locked Baseline Checksums (`shasum -a 256`)
- `ThirdPersonCamera.ts`: `17f40abead26fd6fe5497307cf182dafd7fbdb7a742bab03ee957f0a643fffe0`
- `PlayerController.ts`: `f67e8d9f7e85a85ba23940ff0440ca0c45c16f5b23264b4f9807e913096753c8`
- `GameEngine.ts`: `9346376440655c918a009edc60585f8bf1996963867d09984d89575550d59a50`
- `LivingSky.ts`: `656374c746d13f9a4b62526e77870eeaeeb0637faa0a92b3eb5bd495afe6ed90`
- `CVRCampusMap.ts`: `8d80a853e1b979ec2ce9d9dd7f6cf6965d795e043e4540d4c8494645cd5a1197`
- `VehicleController.ts`: `83edaa5304a7841145d795e043e4540d4c8494645cd5a1197`

## Verified Upgrade 11 Preset Telemetry (`lighting_selector_verification.json`)
- **Preset A (`balanced`)**: `60.18 FPS` avg, `59.52` 1% low, `176` draw calls, `815,328` tris
- **Preset B (`morning`)**: `60.09 FPS` avg, `59.52` 1% low, `175` draw calls, `811,928` tris
- **Preset C (`afternoon`)**: `60.06 FPS` avg, `59.52` 1% low, `177` draw calls, `812,060` tris
- `npm run build` (`10.12s`) and `npm run test:controls` (11/11) passed.

## Restoration Instructions
```bash
cp checkpoints/UPGRADE11_CINEMATIC_LIGHTING_APPROVED/GameEngine.ts.bak src/game/GameEngine.ts
cp checkpoints/UPGRADE11_CINEMATIC_LIGHTING_APPROVED/LivingSky.ts.bak src/game/LivingSky.ts
cp checkpoints/UPGRADE11_CINEMATIC_LIGHTING_APPROVED/CVRCampusMap.ts.bak src/game/CVRCampusMap.ts
cp checkpoints/UPGRADE11_CINEMATIC_LIGHTING_APPROVED/VehicleController.ts.bak src/game/VehicleController.ts
cp checkpoints/UPGRADE11_CINEMATIC_LIGHTING_APPROVED/BirdWildlifeSystem.ts.bak src/game/BirdWildlifeSystem.ts
cp checkpoints/UPGRADE11_CINEMATIC_LIGHTING_APPROVED/PhysicsWorld.ts.bak src/game/PhysicsWorld.ts
cp checkpoints/UPGRADE11_CINEMATIC_LIGHTING_APPROVED/PlayerController.ts.bak src/game/PlayerController.ts
cp checkpoints/UPGRADE11_CINEMATIC_LIGHTING_APPROVED/ThirdPersonCamera.ts.bak src/game/ThirdPersonCamera.ts
cp checkpoints/UPGRADE11_CINEMATIC_LIGHTING_APPROVED/App.tsx.bak src/App.tsx
cp checkpoints/UPGRADE11_CINEMATIC_LIGHTING_APPROVED/SandboxHUD.tsx.bak src/components/SandboxHUD.tsx
cp checkpoints/UPGRADE11_CINEMATIC_LIGHTING_APPROVED/game.ts.bak src/types/game.ts
cp checkpoints/UPGRADE11_CINEMATIC_LIGHTING_APPROVED/THIRD_PARTY_ASSETS.md.bak THIRD_PARTY_ASSETS.md
npm run build && npm run test:controls
```
