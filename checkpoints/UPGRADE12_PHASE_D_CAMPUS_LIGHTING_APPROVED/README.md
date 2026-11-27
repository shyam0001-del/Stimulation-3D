# UPGRADE12_PHASE_D_CAMPUS_LIGHTING_APPROVED

Complete local recovery checkpoint created before implementing **Upgrade 12 — Phase E: Time-Aware Natural Wildlife**.

## Preserved Baseline
- **Upgrade 12 Phases A–D**: Real-world Asia/Kolkata (IST) `DayNightCycle` (`17.3389° N, 78.5738° E`), continuous astronomical solar/lunar orbits (`~0.52°` angular moon diameter + phase lighting), `LivingSky` twinkling twilight stars & scrolling nighttime clouds with occlusion, automatic campus nighttime illumination (CVR emblem, Entrance sandstone/wood/metallic 3D lettering, streetlights, building facades, bus bay, auditorium, sports block, roundabout, bus headlights/taillights).
- **Approved Controls & Camera (LOCKED)**:
  - `ThirdPersonCamera.ts` SHA-256: `17f40abead26fd6fe5497307cf182dafd7fbdb7a742bab03ee957f0a643fffe0`
  - `PlayerController.ts` SHA-256: `f67e8d9f7e85a85ba23940ff0440ca0c45c16f5b23264b4f9807e913096753c8`
- **Approved Wildlife Baseline**: 9 realistic animated pigeons (`animated_bird_pigeon.glb`) + 1 soaring eagle (`animated_eagle.glb`), shared textures/geometry, mixer LOD.

## Contents
- `.bak` file backups for `DayNightCycle.ts`, `GameEngine.ts`, `LivingSky.ts`, `CVRCampusMap.ts`, `BirdWildlifeSystem.ts`, `VehicleController.ts`, `PhysicsWorld.ts`, `PlayerController.ts`, `ThirdPersonCamera.ts`, `App.tsx`, `SandboxHUD.tsx`, `game.ts`, and `test_controls_regression.cjs`.
- `UPGRADE12_PHASE_D_CAMPUS_LIGHTING_APPROVED.patch`
- `checksums.sha256`

## Restoration
Verify integrity with:
```sh
shasum -a 256 -c checkpoints/UPGRADE12_PHASE_D_CAMPUS_LIGHTING_APPROVED/checksums.sha256
```
To restore any file, copy the corresponding `.bak` back to its source path (or run `git apply checkpoints/UPGRADE12_PHASE_D_CAMPUS_LIGHTING_APPROVED/UPGRADE12_PHASE_D_CAMPUS_LIGHTING_APPROVED.patch`).
