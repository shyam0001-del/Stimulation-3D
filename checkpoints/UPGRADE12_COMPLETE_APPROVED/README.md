# UPGRADE12_COMPLETE_APPROVED

Complete verified recovery checkpoint for **Upgrade 12 (Real-Time Dynamic Day & Night Cycle — Phases A through H)**, approved for restoration prior to **Upgrade 13 — Phase A: Realistic Vegetation Movement**.

## Approved Features Preserved
- **Phases A & B**: Real-world `Asia/Kolkata` (IST) astronomical synchronization (`17.3389° N, 78.5738° E`), compass-aligned East/West solar trajectory, 12 pre-filtered PMREM cubemap reflections, dusk light shader pre-warming (`119` invariant shader programs).
- **Phase C**: Proportional `~0.52°` angular moon with astronomical phase lighting/position, twinkling twilight stars, and scrolling volumetric clouds with moon/star occlusion.
- **Phase D**: Automatic dusk-to-dawn campus illumination (CVR emblem, Entrance sandstone/wood/metallic lettering, streetlights, roads/walkways, bus bay, facades, bus headlights/taillights).
- **Phase E**: Time-aware circadian wildlife (`9` animated pigeons + `1` soaring eagle), staggered dawn takeoffs, quiet night branch resting, zero-teleport jump handling, and horizon departure for single-clip eagle.
- **Phases F–H**: Manual time preview controls (`Real Time`, `00:00–23:59` slider, `60× Cycle`, `Reset IST`), full 9-period 60s verification benchmarks (`59.98–60.00 FPS`), 3 consecutive accelerated 24h cycles (`0` leaks), `npm run build`, and `11/11` control regression pass.

## Locked Files (SHA-256)
- `ThirdPersonCamera.ts`: `17f40abead26fd6fe5497307cf182dafd7fbdb7a742bab03ee957f0a643fffe0`
- `PlayerController.ts`: `f67e8d9f7e85a85ba23940ff0440ca0c45c16f5b23264b4f9807e913096753c8`

## Restoration
Verify file checksums:
```sh
shasum -a 256 -c checkpoints/UPGRADE12_COMPLETE_APPROVED/checksums.sha256
```
Restore any file from its `.bak` copy or apply `UPGRADE12_COMPLETE_APPROVED.patch`.
