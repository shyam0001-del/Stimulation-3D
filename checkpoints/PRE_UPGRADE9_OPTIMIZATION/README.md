# Local Recovery Checkpoint: PRE_UPGRADE9_OPTIMIZATION

- **Created**: 2026-11-24
- **State**: Baseline established prior to Stage B optimization (buses batching).
- **Control Status**: 100% Verified and Protected (`UPGRADE8_CONTROLS_APPROVED`). `npm run test:controls` passed all 11 stages.
- **Wildlife Status**: `phoenix_bird.glb` disabled completely from live campus. Phase C wildlife disabled.

---

## 1. Measured 60-Second Interactive Baseline Performance

Interactive simulation across 60 seconds (3,600 dense frames sampled at 60 Hz) simulating full player locomotion (walking, sprinting), camera yaw rotation ($0^\circ, 90^\circ, 180^\circ, 270^\circ, 360^\circ$), strafing, and looking upward at the sky (+60° pitch).

| Metric | Measured Baseline Value | Target (Upgrade 9) |
| :--- | :---: | :---: |
| **Total Frames Sampled** | **3,600 frames** (60.0s continuous) | 3,600 frames |
| **Average FPS** | **124.9 FPS** (unthrottled raw GPU) | $\ge 60$ FPS rock-solid |
| **1% Low FPS** | **51.8 FPS** | $\ge 58$ FPS |
| **0.1% Low FPS** | **31.9 FPS** | $\ge 50$ FPS |
| **Minimum FPS (Worst Frame Drop)** | **15.0 FPS** (66.7 ms spike) | $\ge 45$ FPS |
| **Average Frame Time** | **8.01 ms** | $< 10.0$ ms |
| **99th Percentile Frame Time (p99)** | **19.3 ms** | $< 16.6$ ms |
| **99.9th Percentile Frame Time (p999)** | **31.3 ms** | $< 20.0$ ms |
| **Average Draw Calls / Frame** | **2,029 calls** | $< 350$ calls |
| **Peak Draw Calls / Frame** | **3,316 calls** | $< 450$ calls |
| **Minimum Draw Calls / Frame (Sky)** | **408 calls** | $< 100$ calls |
| **Average Triangles Rendered** | **1,357,466 tris** | $< 900,000$ tris |
| **Peak Triangles Rendered** | **1,571,671 tris** | $< 1,000,000$ tris |
| **Geometries in Memory** | **962** | $< 150$ |
| **Textures in Memory** | **197** | $< 100$ |

---

## 2. Scene Geometry & Mesh Distribution Audit

Total scene meshes: **2,071 meshes**

1. **60 Buses**:
   - **797 individual meshes**
   - 124 shadow-casting sub-meshes
   - 26,996 triangles
   - *Target (Stage B)*: Batch into `THREE.InstancedMesh` for chassis, wheels, windows, reducing bus draw calls from 797 to $\le 15$.
2. **Road Infrastructure & Curbs**:
   - **1,231 meshes**
   - 275 shadow-casting sub-meshes
   - 383,641 triangles
   - *Target (Stage C)*: Batch black/yellow curbs, road pavement blocks, and lane markings with `InstancedMesh` or merged geometry, reducing infrastructure draw calls from 1,231 to $< 50$.
3. **Living Sky Shader**:
   - 14 procedural simplex noise octaves evaluated per pixel on 4K Retina displays ($3840 \times 2160 = 8.3\text{M pixels} \times 14 = 116\text{M noise calls/frame}$).
   - *Target (Stage D)*: Clamp pixel ratio, optimize octaves, and billinear upsampling.
4. **Trees & Foliage**:
   - 27 mesh nodes, 9,252 triangles.
   - *Target (Stage E)*: Tree instancing and shadow-caster pruning.

---

## 3. Preserved Files in Checkpoint

- `ThirdPersonCamera.ts.bak` (Camera controller with protected pitch clamp, pointer-lock, yaw calculation)
- `PlayerController.ts.bak` (Player movement, physics, animations)
- `GameEngine.ts.bak` (Engine loop, renderer configuration)
- `CVRCampusMap.ts.bak` (Campus architecture, buses, roads, gates)
- `LivingSky.ts.bak` (Atmospheric sky shader)
- `BirdWildlifeSystem.ts.bak` (Wildlife manager with phoenix & Phase C disabled)
- `PRE_UPGRADE9_OPTIMIZATION.patch` (Full git diff patch)
- `stageA_baseline_metrics.json` (Raw 3,600 frame metrics)
- `baseline_stageA_normal_gameplay.png` (Visual baseline - entrance)
- `baseline_stageA_sky_looking_up.png` (Visual baseline - sky)
