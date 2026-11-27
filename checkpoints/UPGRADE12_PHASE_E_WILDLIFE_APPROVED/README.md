# UPGRADE12_PHASE_E_WILDLIFE_APPROVED

Complete local recovery checkpoint created after manual visual approval of **Upgrade 12 — Phase E: Time-Aware Natural Wildlife**, prior to final Upgrade 12 Phases G & H verification.

## Preserved Baseline
- **Upgrade 12 Phases A–E**: Real-world Asia/Kolkata (IST) `DayNightCycle`, astronomical sun/moon + lunar phases (`~0.52°` angular moon size), `LivingSky` twinkling stars and scrolling nighttime clouds with occlusion, automatic campus nighttime illumination, and time-aware circadian wildlife (`9` pigeons + `1` eagle, staggered dawn/dusk transitions, quiet night branch resting, horizon departure for single-clip eagle, zero-teleport jump handling).
- **Approved Controls & Camera (LOCKED)**:
  - `ThirdPersonCamera.ts` SHA-256: `17f40abead26fd6fe5497307cf182dafd7fbdb7a742bab03ee957f0a643fffe0`
  - `PlayerController.ts` SHA-256: `f67e8d9f7e85a85ba23940ff0440ca0c45c16f5b23264b4f9807e913096753c8`

## Restoration
Verify integrity with:
```sh
shasum -a 256 -c checkpoints/UPGRADE12_PHASE_E_WILDLIFE_APPROVED/checksums.sha256
```
To restore any source file, copy its `.bak` snapshot back to `src/` or apply `UPGRADE12_PHASE_E_WILDLIFE_APPROVED.patch`.
