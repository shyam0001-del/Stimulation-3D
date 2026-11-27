# Third-Party 3D Assets & Attributions

This document records third-party 3D models, textures, animations, and sound assets used in the **CVR College of Engineering 3D Campus Sandbox**, along with their respective authors, sources, licenses, and technical modifications.

---

## 1. Low-Poly Tree Asset (Controlled Avenue Upgrade)

- **Asset Title**: Tree low poly lowpoly
- **Author**: 00amza ([Sketchfab Profile](https://sketchfab.com/00amza))
- **Source**: [Sketchfab 3D Model](https://sketchfab.com/3d-models/tree-low-poly-lowpoly-73201f05280d48dcb10ed4ca362d69f8)
- **License**: [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- **Summary of Asset**:
  - Contains two distinct tree variants (Variant 1: Spreading mature crown, 816 triangles; Variant 2: Upright pyramidal crown, 813 triangles).
  - Single shared $256 \times 256$ RGBA texture atlas (`Tree_1_baseColor.png`) covering bark and leaf cards.
- **Modifications Applied**:
  1. **Hierarchy Separation**: Separated the dual-tree combined scene into two standalone origin-aligned GLB models (`tree_variant_1.glb` and `tree_variant_2.glb`).
  2. **Coordinate Alignment**: Normalized coordinates to metric units (1 unit = 1 meter), with the trunk base centered at ground level $(X=0, Y=0, Z=0)$.
  3. **Material & Foliage Optimization**:
     - Converted material alpha mode from transparent blending (`alphaMode: "BLEND"`) to alpha cutout masking (`alphaTest: 0.5`, `depthWrite: true`, `alphaToCoverage: true`).
     - Enabled two-sided rendering (`side: THREE.DoubleSide`) for natural foliage density and visibility from below.
     - Preserved shadow casting and shadow receiving on both trunk and canopy.
  4. **Instanced Rendering Integration**:
     - Deployed via `THREE.InstancedMesh` along the Central 12M Spine Avenue for minimal draw call overhead.

---

## 2. Streetlight Props

- **Asset Title**: Streetlight Single / Double
- **Author**: Quaternius ([Quaternius CC0 Library](https://quaternius.com/))
- **License**: CC0 1.0 Universal (Public Domain)
- **Modifications**: Rescaled to 6.5m metric height; added Rapier static cylinder colliders.

---

## 3. Vehicles

- **Asset Titles**: Sedan, Van, Delivery Truck, Scooter
- **Author**: Kenney / Quaternius
- **License**: CC0 1.0 Universal (Public Domain)
- **Modifications**: Fitted with Rapier wheel raycast physics and custom campus liveries.

---

## 4. Campus Wildlife — Pigeon (Upgrade 10A)

- **Asset Title**: Animated Bird, Pigeon
- **Author**: dudecon ([Sketchfab Profile](https://sketchfab.com/dudecon))
- **Source**: [Sketchfab 3D Model](https://sketchfab.com/3d-models/animated-bird-pigeon-797d27b68af3453e865149435df6aa30)
- **License**: [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- **Summary of Asset**:
  - Single rigged `SkinnedMesh` (`1,482` vertices, `710` triangles) with 5 skeletal animations (`BirdRig|Flapping`, `BirdRig|Gliding`, `BirdRig|Landing`, `BirdRig|Standing Idle`, `BirdRig|Takeoff`) and natural pigeon plumage texture (`Material.002`).
- **Modifications Applied**:
  - Normalized scale dynamically to real-world Indian Rock Pigeon (*Columba livia*) wingspan (`~0.62 m`) and standing body length (`~0.337 m`), preserved natural plumage colors with sRGB texture calibration and matte feather roughness, and integrated multi-bird flight, branch landing, perching, and takeoff lifecycles in `BirdWildlifeSystem.ts`.

---

## 5. Campus Wildlife — Soaring Eagle (Upgrade 10B)

- **Asset Title**: Animated Eagle
- **Author**: Clement Abai ([Sketchfab Profile](https://sketchfab.com/clement.abai))
- **Source**: [Sketchfab 3D Model](https://sketchfab.com/3d-models/animated-eagle-de73b663acbc426e8e6c107fd25e08cd)
- **License**: [Creative Commons Attribution 4.0 International (CC BY 4.0)](http://creativecommons.org/licenses/by/4.0/)
- **Summary of Asset**:
  - Single rigged `SkinnedMesh` (`3,858` triangles, `87` bones) with flapping/soaring animation (`motion4`) and realistic raptor feather texture.
- **Modifications Applied**:
  - Recentered mesh pivot, switched feather transparency to crisp `alphaTest` cutout, calibrated wingspan to `~1.85 m`, and integrated high-altitude thermal soaring in `BirdWildlifeSystem.ts`.

---

## 6. Spatial Environmental & Wildlife Audio (Upgrade 13 Phase B)

All runtime audio files are stored locally under `public/audio/environment/` in Mono AAC-LC (`.m4a`, 44.1 kHz, 96 kbps) trimmed, smoothly loop-crossfaded, and gain-normalized without remote streaming.

### 6.1 Pigeon Cooing (`pigeon_coo_1.m4a`)
- **Asset Title**: Blue rock pigeon song recorded in May 2012 at Sangli.wav (*Columba livia*)
- **Author**: Sharadapte
- **Source**: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3ABlue_rock_pigeon_song_recorded_in_May_2012_at_Sangli.wav)
- **License**: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)
- **Modifications**: Trimmed clean 3.55s vocal phrase, edge-faded (60 ms), normalized, encoded to mono AAC (`pigeon_coo_1.m4a`).

### 6.2 Pigeon Cooing Variant 2 (`pigeon_coo_2.m4a`)
- **Asset Title**: Dove cooing.ogg
- **Author**: mary905 (via PDSounds / Fæ)
- **Source**: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3ADove_cooing.ogg)
- **License**: Public Domain
- **Modifications**: Trimmed clean 5.10s phrase, edge-faded, encoded to mono AAC (`pigeon_coo_2.m4a`).

### 6.3 Pigeon Cooing Variant 3 (`pigeon_coo_3.m4a`)
- **Asset Title**: Wood pigeon call 128.ogg
- **Author**: Crunchysaviour
- **Source**: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3AWood_pigeon_call_128.ogg)
- **License**: Public Domain
- **Modifications**: Trimmed clean 2.85s call, edge-faded, encoded to mono AAC (`pigeon_coo_3.m4a`).

### 6.4 Natural Eagle Call (`eagle_call.m4a`)
- **Asset Title**: Golden eagle.ogg (*Aquila chrysaetos*)
- **Author**: Bubulcus
- **Source**: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3AGolden_eagle.ogg)
- **License**: [CC BY 3.0](https://creativecommons.org/licenses/by/3.0)
- **Modifications**: Edge-faded, normalized, encoded to mono AAC (`eagle_call.m4a`) for high-altitude thermal eagle calls (*Aquila* raptor matching the brown eagle model).

### 6.5 Gentle Outdoor Wind (`wind_gentle.m4a`)
- **Asset Title**: Vento fisterra.ogg
- **Author**: Escoitar.org
- **Source**: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3AVento_fisterra.ogg)
- **License**: Public Domain
- **Modifications**: Extracted 14.0s calm coastal/open-air breeze segment with 1.5s equal-power crossfade loop (`wind_gentle.m4a`).

### 6.6 Moderate Wind Gusts (`wind_gust.m4a`)
- **Asset Title**: Bourne woods windy 2020-05-05 0753.mp3
- **Author**: Robert EA Harvey
- **Source**: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3ABourne_woods_windy_2020-05-05_0753.mp3)
- **License**: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)
- **Modifications**: Extracted 14.0s breeze/gust swell segment with 1.5s equal-power crossfade loop (`wind_gust.m4a`).

### 6.7 Daytime Outdoor Woodland Ambience (`daytime_ambience.m4a`)
- **Asset Title**: Bourne woods windy 2020-05-05 0806.mp3
- **Author**: Robert EA Harvey
- **Source**: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3ABourne_woods_windy_2020-05-05_0806.mp3)
- **License**: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)
- **Modifications**: Extracted 15.0s calm outdoor parkland air segment with 1.5s equal-power crossfade loop (`daytime_ambience.m4a`).

### 6.8 Rustling Tree Leaves (`leaves_rustle.m4a`)
- **Asset Title**: Rustling leaves (Gravity Sound).wav
- **Author**: Gravity Sound (`https://www.gravitysound.studio/`)
- **Source**: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3ARustling_leaves_%28Gravity_Sound%29.wav)
- **License**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0)
- **Modifications**: Extracted 14.5s leaf foliage rustle segment with 1.5s equal-power crossfade loop (`leaves_rustle.m4a`).

### 6.9 Quiet Nighttime Insect Ambience (`night_insects_1.m4a`, `night_insects_2.m4a`)
- **Asset Title 1**: Field cricket *Gryllus pennsylvanicus*.ogg
  - **Author**: Thatcher | **Source**: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3AField_cricket_Gryllus_pennsylvanicus.ogg) | **License**: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0)
- **Asset Title 2**: Audio Hörbild Grillenzirpen - nachts um 3 im Föhrenwald Mödling.ogg
  - **Author**: DrTrumpet | **Source**: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3AAudio_H%C3%B6rbild_Grillenzirpen_-_nachts_um_3_im_F%C3%B6hrenwald_M%C3%B6dling.ogg) | **License**: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)
- **Modifications**: Extracted 8.5s and 14.0s steady nocturnal cricket chorus segments with equal-power loop crossfades and gentle low-level normalization.
