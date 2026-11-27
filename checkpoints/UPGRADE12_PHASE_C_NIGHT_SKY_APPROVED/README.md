# UPGRADE12_PHASE_C_NIGHT_SKY_APPROVED — Recovery Checkpoint

Created after Upgrade 12 Phase A, Phase B, Phase C (Realistic Night Sky), and Phase F (Manual Time & Preview HUD Controls) before implementing Phase D (Automatic Campus Lighting).

Preserves:
- Real-time Hyderabad IST (`Asia/Kolkata`, `17.1964° N, 78.5972° E`) solar & lunar ephemeris (`DayNightCycle.ts`)
- 24 pre-baked outdoor IBL stops (`0.00–0.0125` max boundary step) and continuous 12-keyframe C1 atmosphere transitions (`GameEngine.ts`, `LivingSky.ts`)
- Realistic Moon phases, Gaussian pinpoint starfield with gradual twilight emergence, cloud occlusion, and phase-aware moonlight (`LivingSky.ts`)
- Compact Time & Preview Controls (`Real Time`, `Preview`, `00:00–23:59` slider, `60× Cycle`, `Reset IST`) in `SandboxHUD.tsx` & `App.tsx`
- Byte-for-byte locked `ThirdPersonCamera.ts` and `PlayerController.ts`
- All prior checkpoints intact.

## Locked Baseline Checksums (`shasum -a 256`)
- `ThirdPersonCamera.ts`: `17f40abead26fd6fe5497307cf182dafd7fbdb7a742bab03ee957f0a643fffe0`
- `PlayerController.ts`: `f67e8d9f7e85a85ba23940ff0440ca0c45c16f5b23264b4f9807e913096753c8`
- `DayNightCycle.ts`: checked in `checksums.sha256`
- `LivingSky.ts`: checked in `checksums.sha256`
- `GameEngine.ts`: checked in `checksums.sha256`

## Verified Phase C Benchmarks & Control Tests
- **Night Sky 60s (`3,601` frames)**: Avg `60.01 FPS`, 1% low `59.52 FPS`, `0` spikes `>20ms`
- **Full 24h Cycle 60s (`1440×`, `3,601` frames)**: Avg `60.01 FPS`, 1% low `59.52 FPS`, `0` spikes `>20ms`
- `npm run build` (`9.39s`) and `npm run test:controls` (11/11) passed.
