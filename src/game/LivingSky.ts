import * as THREE from 'three';

export interface LivingSkyOptions {
  sunDirection?: THREE.Vector3;
  windDirection?: THREE.Vector2;
  windSpeed?: number;
  cloudCoverage?: number;
  fogColor?: THREE.Color;
}

/**
 * LivingSky — Physically inspired atmospheric sky dome with seamless continuous
 * procedural cloud simulation, dual-layer cloud formations (cumulus & cirrus),
 * domain-warped fluid evolution, solar forward scattering (silver lining),
 * and soft horizon-fog integration.
 */
export class LivingSky {
  public mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private cloudPassMaterial: THREE.ShaderMaterial;
  private cloudRT: THREE.WebGLRenderTarget;
  private cloudScene: THREE.Scene;
  private cloudCamera: THREE.OrthographicCamera;
  private cloudQuadGeo: THREE.PlaneGeometry;
  private simTime = 0;
  private frameCounter = 0;
  private hasRenderedClouds = false;
  private sunDirection: THREE.Vector3;

  constructor(options: LivingSkyOptions = {}) {
    this.sunDirection = (options.sunDirection || new THREE.Vector3(0.65, 0.45, -0.6)).clone().normalize();
    const wind = options.windDirection || new THREE.Vector2(0.55, 0.35);
    const windSpeed = options.windSpeed ?? 0.018;
    const cloudCoverage = options.cloudCoverage ?? 0.46;
    const fogCol = options.fogColor || new THREE.Color(0xcfdde8);

    const zenithCol = new THREE.Vector3(0.11, 0.34, 0.69);
    const midSkyCol = new THREE.Vector3(0.24, 0.49, 0.80);
    const horizonCol = new THREE.Vector3(0.62, 0.74, 0.86);
    const sunCol = new THREE.Vector3(1.0, 0.94, 0.84);

    // Offscreen Stereographic Upper-Hemisphere Cloud RenderTarget (768x768 with bilinear upsampling)
    this.cloudRT = new THREE.WebGLRenderTarget(768, 768, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    });

    this.cloudScene = new THREE.Scene();
    this.cloudCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.cloudQuadGeo = new THREE.PlaneGeometry(2, 2);

    this.cloudPassMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uSunDirection: { value: this.sunDirection },
        uWind: { value: wind.clone().normalize() },
        uWindSpeed: { value: windSpeed },
        uCloudCoverage: { value: cloudCoverage },
        uZenithColor: { value: zenithCol },
        uMidSkyColor: { value: midSkyCol },
        uHorizonColor: { value: horizonCol },
        uSunColor: { value: sunCol },
        uCloudLitTint: { value: new THREE.Vector3(1, 1, 1) },
        uCloudShadeTint: { value: new THREE.Vector3(1, 1, 1) },
        uSunVisibility: { value: 1.0 },
        uMoonDirection: { value: new THREE.Vector3(-0.3, 0.75, 0.58) },
        uMoonIntensity: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uSunDirection;
        uniform vec2 uWind;
        uniform float uWindSpeed;
        uniform float uCloudCoverage;
        uniform vec3 uZenithColor;
        uniform vec3 uMidSkyColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunColor;
        uniform vec3 uCloudLitTint;
        uniform vec3 uCloudShadeTint;
        uniform float uSunVisibility;
        uniform vec3 uMoonDirection;
        uniform float uMoonIntensity;

        varying vec2 vUv;

        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187,
                              0.366025403784439,
                             -0.577350269189626,
                              0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy));
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
            + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
          m = m * m;
          m = m * m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        // Fast 3-octave FBM for domain warp flow
        float fbmWarp(vec2 p) {
          float total = 0.52 * snoise(p);
          mat2 rot = mat2(1.6, 1.2, -1.2, 1.6);
          p = rot * p * 1.03;
          total += 0.26 * snoise(p);
          p = rot * p * 1.03;
          total += 0.13 * snoise(p);
          return total;
        }

        // 4-octave FBM for crisp cumulus morphology
        float fbm4(vec2 p) {
          float total = 0.0;
          float amp = 0.500;
          mat2 rot = mat2(1.6, 1.2, -1.2, 1.6);
          for (int i = 0; i < 4; i++) {
            total += amp * snoise(p);
            p = rot * p * 1.03;
            amp *= 0.5;
          }
          return total;
        }

        vec2 domainWarp(vec2 p, float t) {
          float qx = fbmWarp(p + vec2(3.7, t * 0.035));
          float qy = fbmWarp(p + vec2(8.9, 5.3 - t * 0.028));
          return vec2(qx, qy);
        }

        void main() {
          // Inverse stereographic hemisphere projection
          vec2 p = (vUv - 0.5) / 0.48;
          float r2 = dot(p, p);
          if (r2 > 1.05) {
            gl_FragColor = vec4(0.0);
            return;
          }
          float y = (1.0 - r2) / (1.0 + r2);
          if (y <= 0.015) {
            gl_FragColor = vec4(0.0);
            return;
          }

          vec2 xz = (2.0 * p) / (1.0 + r2);
          vec3 dir = normalize(vec3(xz.x, y, xz.y));

          float h = clamp(y, 0.0, 1.0);
          float hazeFactor = exp(-h * 4.5);
          float zenithFactor = pow(h, 0.75);
          vec3 skyBase = mix(uHorizonColor, uMidSkyColor, smoothstep(0.02, 0.45, h));
          skyBase = mix(skyBase, uZenithColor, zenithFactor);
          skyBase = mix(skyBase, uHorizonColor, hazeFactor * 0.75);

          float sunCos = dot(dir, uSunDirection);

          // Spherical atmospheric shell projection (offset away from noise origin to avoid simplex lattice alignment)
          float domeProjection = 1.0 / (sqrt(y * y + 0.065) + 0.18 * y);
          vec2 cloudUV = dir.xz * domeProjection * 0.32 + vec2(17.3, 31.7);
          float t = uTime * uWindSpeed;

          // LAYER 1: Cumulus Clouds with Domain Warping
          vec2 cumulusUV = cloudUV * 0.85 + uWind * t;
          vec2 warpOffset = domainWarp(cumulusUV * 1.1, uTime * 0.04);
          float cumulusNoise = fbm4(cumulusUV + warpOffset * 0.42);
          float cumulusRaw = cumulusNoise * 0.5 + 0.5;

          float coverage = uCloudCoverage;
          float cumulusDensity = smoothstep(coverage - 0.12, coverage + 0.28, cumulusRaw);

          // LAYER 2: Wispy High-Altitude Cirrus Clouds (skip if occluded by thick cumulus)
          float cirrusDensity = 0.0;
          if (cumulusDensity < 0.96) {
            vec2 cirrusUV = cloudUV * 2.2 + (uWind * 1.45 + vec2(0.12, -0.06)) * (t * 1.35);
            float c1 = snoise(vec2(cirrusUV.x * 2.5 + cirrusUV.y * 0.7, cirrusUV.y * 0.55));
            float c2 = snoise(vec2(cirrusUV.x * 4.0, cirrusUV.y * 1.1 + uTime * 0.015));
            float cirrusRaw = (c1 * 0.65 + c2 * 0.35) * 0.5 + 0.5;
            cirrusDensity = smoothstep(0.48, 0.82, cirrusRaw) * 0.42;
          }

          // Light Scattering & Volumetric Shading (balanced HDR roll-off)
          float sunAlignment = max(sunCos, 0.0);
          float silverLining = pow(sunAlignment, 6.0) * 0.55 + pow(sunAlignment, 18.0) * 0.85;
          float moonAlignment = max(dot(dir, uMoonDirection), 0.0);
          float moonSilver = (pow(moonAlignment, 8.0) * 0.30 + pow(moonAlignment, 24.0) * 0.42) * uMoonIntensity;
          vec3 moonCloudGlow = vec3(0.74, 0.82, 0.96) * moonSilver;

          float coreDensity = smoothstep(coverage, coverage + 0.35, cumulusRaw);
          vec3 cloudBaseShade = mix(vec3(0.46, 0.53, 0.64) * uCloudShadeTint, skyBase, 0.28);
          vec3 cloudSunlit = vec3(0.92, 0.94, 0.96) * uCloudLitTint + uSunColor * (silverLining * 0.45 * uSunVisibility) + moonCloudGlow;
          vec3 cumulusColor = mix(cloudBaseShade, cloudSunlit, clamp(1.0 - coreDensity * 0.50 + silverLining * 0.28 * uSunVisibility + moonSilver * 0.25, 0.0, 1.35));
          vec3 cirrusColor = vec3(0.90, 0.93, 0.96) * uCloudLitTint + uSunColor * (silverLining * 0.3 * uSunVisibility) + moonCloudGlow * 0.7;

          float horizonFade = smoothstep(0.015, 0.22, y);
          cumulusDensity *= horizonFade;
          cirrusDensity *= horizonFade * (1.0 - cumulusDensity * 0.8);

          float a1 = cumulusDensity * 0.96;
          float a2 = cirrusDensity * horizonFade;
          float totalAlpha = 1.0 - (1.0 - a1) * (1.0 - a2);

          vec3 cloudRGB = vec3(0.0);
          if (totalAlpha > 0.001) {
            cloudRGB = (cumulusColor * a1 * (1.0 - a2) + cirrusColor * a2) / totalAlpha;
          }

          // Pack HDR cloud color (up to 1.8) into RGBA8
          gl_FragColor = vec4(clamp(cloudRGB / 1.8, 0.0, 1.0), clamp(totalAlpha, 0.0, 1.0));
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    const quadMesh = new THREE.Mesh(this.cloudQuadGeo, this.cloudPassMaterial);
    this.cloudScene.add(quadMesh);

    // Lightweight inverted sky dome (32x20 segments is smooth for fragment sky gradient + bilinear cloud lookup)
    const geometry = new THREE.SphereGeometry(420, 32, 20);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uCloudMap: { value: this.cloudRT.texture },
        uSunDirection: { value: this.sunDirection },
        uFogColor: { value: new THREE.Vector3(fogCol.r, fogCol.g, fogCol.b) },
        uZenithColor: { value: zenithCol },
        uMidSkyColor: { value: midSkyCol },
        uHorizonColor: { value: horizonCol },
        uSunColor: { value: sunCol },
        uCloudLitTint: { value: new THREE.Vector3(1, 1, 1) },
        uCloudShadeTint: { value: new THREE.Vector3(1, 1, 1) },
        uSunVisibility: { value: 1.0 },
        uMoonDirection: { value: new THREE.Vector3(-0.3, 0.75, 0.58) },
        uMoonIntensity: { value: 0.0 },
        uTime: { value: 0.0 },
        uStarVisibility: { value: 0.0 },
        uMoonVisibility: { value: 0.0 },
        uMoonPhaseIllum: { value: 0.0 },
      },
      vertexShader: `
        varying vec3 vWorldDirection;

        void main() {
          vWorldDirection = normalize(position);
          // Standard skybox far-plane trick: depth = 1.0 (far plane)
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = (projectionMatrix * mvPosition).xyww;
        }
      `,
      fragmentShader: `
        uniform sampler2D uCloudMap;
        uniform vec3 uSunDirection;
        uniform vec3 uMoonDirection;
        uniform vec3 uFogColor;
        uniform vec3 uZenithColor;
        uniform vec3 uMidSkyColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunColor;
        uniform float uSunVisibility;
        uniform float uStarVisibility;
        uniform float uMoonVisibility;
        uniform float uMoonPhaseIllum;
        uniform float uMoonIntensity;
        uniform float uTime;

        varying vec3 vWorldDirection;

        vec3 hash33(vec3 p3) {
          p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
          p3 += dot(p3, p3.yxz + 33.33);
          return fract((p3.xxy + p3.yxx) * p3.zyx);
        }

        float moonSurfaceNoise(vec2 p) {
          float n1 = sin(p.x * 2.1 + cos(p.y * 1.7)) * 0.5 + 0.5;
          float n2 = cos(p.y * 3.8 - sin(p.x * 3.1)) * 0.5 + 0.5;
          float n3 = sin((p.x + p.y) * 6.4) * 0.5 + 0.5;
          return n1 * 0.5 + n2 * 0.35 + n3 * 0.15;
        }

        vec3 sampleStarLayer(vec3 d, float scale, float threshold, float maxRadius, float intensityScale) {
          vec3 p = d * scale;
          vec3 cell = floor(p);
          vec3 local = fract(p) - 0.5;
          vec3 h = hash33(cell);
          if (h.z < threshold) return vec3(0.0);

          vec3 starCenter = (h - 0.5) * 0.44;
          float dist = length(local - starCenter);
          float radius = mix(maxRadius * 0.58, maxRadius, fract(h.y * 7.3));
          // Sub-pixel safe Gaussian pinpoint PSF so stars stay crisp across 720p-4K without aliasing out
          float normD = dist / max(radius, 0.001);
          if (normD > 1.35) return vec3(0.0);
          float core = exp(-normD * normD * 3.4);

          float twinkle = 0.86 + 0.14 * sin(uTime * (1.1 + h.x * 2.5) + h.y * 62.83);
          float mag = pow(fract(h.z * 19.7), 1.25) * 0.80 + 0.20;

          // Realistic blackbody stellar tint: warm amber K-stars to neutral/cool white
          vec3 warmStar = vec3(1.0, 0.86, 0.68);
          vec3 whiteStar = vec3(0.96, 0.98, 1.0);
          vec3 blueStar = vec3(0.76, 0.87, 1.0);
          vec3 tint = mix(warmStar, mix(whiteStar, blueStar, smoothstep(0.45, 0.92, h.x)), smoothstep(0.15, 0.52, h.x));

          return tint * (core * twinkle * mag * intensityScale);
        }

        void main() {
          vec3 dir = normalize(vWorldDirection);
          float y = dir.y;

          // Early-out below horizon fog blend
          if (y <= -0.04) {
            gl_FragColor = vec4(uFogColor, 1.0);
            return;
          }

          // 1. Physically-inspired atmospheric sky gradient
          float h = clamp(y, 0.0, 1.0);
          float hazeFactor = exp(-h * 4.5);
          float zenithFactor = pow(h, 0.75);

          vec3 skyBase = mix(uHorizonColor, uMidSkyColor, smoothstep(0.02, 0.45, h));
          skyBase = mix(skyBase, uZenithColor, zenithFactor);
          skyBase = mix(skyBase, uHorizonColor, hazeFactor * 0.75);

          // 2. Solar disc and Mie corona
          float sunCos = dot(dir, uSunDirection);
          float sunDisc = smoothstep(0.9992, 0.9998, sunCos);
          float sunCorona = pow(max(sunCos, 0.0), 32.0) * 0.42 + pow(max(sunCos, 0.0), 4.5) * 0.14;
          vec3 clearSky = skyBase + uSunColor * (sunDisc * 3.2 + sunCorona * 1.15) * uSunVisibility;

          // 3. Natural stars with gradual twilight visibility & horizon extinction
          float moonCos = dot(dir, uMoonDirection);
          if (uStarVisibility > 0.002 && y > 0.02) {
            float starHorizonFade = smoothstep(0.02, 0.24, y);
            float moonGlareDim = 1.0 - smoothstep(0.994, 0.9996, moonCos) * uMoonPhaseIllum * uMoonVisibility * 0.85;
            // Tilted secondary star lattice prevents cardinal grid symmetry
            vec3 dRot = normalize(vec3(
              dir.x * 0.819 + dir.z * 0.573,
              dir.y * 0.866 - dir.x * 0.287 + dir.z * 0.410,
              dir.z * 0.710 - dir.x * 0.496 - dir.y * 0.500
            ));
            vec3 stars = sampleStarLayer(dir, 32.0, 0.895, 0.105, 2.45)
                       + sampleStarLayer(dRot, 62.0, 0.835, 0.115, 1.05);
            clearSky += stars * (uStarVisibility * starHorizonFade * moonGlareDim);
          }

          // 4. Realistically sized Moon (~0.68 deg radius) with true spherical phase terminator & subtle maria
          if (uMoonVisibility > 0.002 && y > -0.02) {
            float moonHorizonFade = smoothstep(-0.015, 0.06, y);
            float moonGlowFade = moonHorizonFade * uMoonVisibility;
            // Subtle pale lunar halo around illuminated moon only when sky darkens
            float lunarHalo = (pow(max(moonCos, 0.0), 420.0) * 0.22 + pow(max(moonCos, 0.0), 32.0) * 0.032) * uMoonPhaseIllum;
            clearSky += vec3(0.78, 0.86, 0.98) * (lunarHalo * moonGlowFade * (0.15 + 0.85 * uStarVisibility));

            if (moonCos > 0.9999) {
              vec3 upRef = abs(uMoonDirection.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
              vec3 moonRight = normalize(cross(upRef, uMoonDirection));
              vec3 moonUp = cross(uMoonDirection, moonRight);
              float moonRadiusSin = 0.0047; // ~0.27 deg angular radius (~0.54 deg real astronomical diameter)
              vec2 mxy = vec2(dot(dir, moonRight), dot(dir, moonUp)) / moonRadiusSin;
              float r2 = dot(mxy, mxy);
              if (r2 < 1.0) {
                float discAlpha = (1.0 - smoothstep(0.72, 1.0, r2)) * moonHorizonFade * uMoonVisibility;
                float mz = sqrt(max(0.0, 1.0 - r2));
                vec3 moonNormal = normalize(mxy.x * moonRight + mxy.y * moonUp - mz * uMoonDirection);
                float sunOnMoon = max(dot(moonNormal, uSunDirection), 0.0);
                float litSide = pow(sunOnMoon, 0.58);
                float mariaAlbedo = mix(0.72, 1.06, moonSurfaceNoise(mxy * 1.9 + vec2(0.8, 1.4)));
                vec3 moonLitCol = vec3(0.96, 0.98, 1.0) * mariaAlbedo * mix(1.25, 2.35, uStarVisibility);
                vec3 moonDarkCol = skyBase + vec3(0.012, 0.016, 0.026) * uStarVisibility;
                vec3 moonSurface = mix(moonDarkCol, max(skyBase, moonLitCol), litSide);
                clearSky = mix(clearSky, moonSurface, discAlpha);
              }
            }
          }

          // 5. Bilinearly upsampled stereographic cloud layer lookup (naturally occludes Moon & Stars)
          vec3 cloudComposite = clearSky;
          if (y > 0.015) {
            vec2 skyUV = dir.xz / (1.0 + y) * 0.48 + 0.5;
            vec4 cloudSample = texture2D(uCloudMap, skyUV);
            cloudComposite = mix(clearSky, cloudSample.rgb * 1.8, cloudSample.a);
          }

          // 6. Horizon fog blending
          float groundFogBlend = smoothstep(-0.04, 0.06, y);
          vec3 finalColor = mix(uFogColor, cloudComposite, groundFogBlend);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = -1000;
  }

  /**
   * Update the sky dome simulation.
   * Keeps the dome centered on the camera, advances continuous cloud evolution,
   * and renders the stereographic cloud layer into the bilinearly-upsampled RT.
   */
  public update(deltaTime: number, cameraPosition: THREE.Vector3, renderer?: THREE.WebGLRenderer): void {
    this.mesh.position.copy(cameraPosition);
    const dt = Math.min(deltaTime, 0.1);
    this.simTime += dt;
    this.cloudPassMaterial.uniforms.uTime.value = this.simTime;
    this.material.uniforms.uTime.value = this.simTime;

    if (renderer && (!this.hasRenderedClouds || this.frameCounter % 2 === 0)) {
      const prevTarget = renderer.getRenderTarget();
      const prevAutoClear = renderer.autoClear;
      renderer.autoClear = true;
      renderer.setRenderTarget(this.cloudRT);
      renderer.render(this.cloudScene, this.cloudCamera);
      renderer.setRenderTarget(prevTarget);
      renderer.autoClear = prevAutoClear;
      this.hasRenderedClouds = true;
    }
    this.frameCounter++;
  }

  /**
   * Update sun direction vector.
   */
  public setSunDirection(sunDir: THREE.Vector3): void {
    this.sunDirection.copy(sunDir).normalize();
    this.material.uniforms.uSunDirection.value.copy(this.sunDirection);
    this.cloudPassMaterial.uniforms.uSunDirection.value.copy(this.sunDirection);
    this.hasRenderedClouds = false;
  }

  /**
   * Adjust wind parameters dynamically.
   */
  public setWind(speed: number, direction?: THREE.Vector2): void {
    this.cloudPassMaterial.uniforms.uWindSpeed.value = speed;
    if (direction) {
      this.cloudPassMaterial.uniforms.uWind.value.copy(direction).normalize();
    }
    this.hasRenderedClouds = false;
  }

  /**
   * Synchronize continuous cloud wind seamlessly every frame without forcing full offscreen RT resets.
   */
  public syncWind(speed: number, direction: THREE.Vector2): void {
    this.cloudPassMaterial.uniforms.uWindSpeed.value = speed;
    this.cloudPassMaterial.uniforms.uWind.value.copy(direction).normalize();
  }

  /**
   * Adjust cloud coverage fraction (0.0 = clear sky, 1.0 = heavy overcast).
   * Default calibrated at 0.46 for authentic pleasant summer day with blue openings.
   */
  public setCloudCoverage(coverage: number): void {
    this.cloudPassMaterial.uniforms.uCloudCoverage.value = THREE.MathUtils.clamp(coverage, 0.1, 0.9);
    this.hasRenderedClouds = false;
  }

  /**
   * Adjust sky atmospheric palette for continuous 24-hour day/night transitions (zero allocation).
   */
  public setAtmosphere(params: {
    sunDirection: THREE.Vector3;
    moonDirection: THREE.Vector3;
    zenith: THREE.Vector3;
    midSky: THREE.Vector3;
    horizon: THREE.Vector3;
    sunColor: THREE.Vector3;
    fogColor: THREE.Color;
    cloudLitTint: THREE.Vector3;
    cloudShadeTint: THREE.Vector3;
    sunDiscVisibility: number;
    starVisibility: number;
    moonVisibility: number;
    moonPhaseIllumination: number;
    moonlightStrength: number;
    forceCloudRefresh?: boolean;
  }): void {
    this.sunDirection.copy(params.sunDirection).normalize();
    this.material.uniforms.uSunDirection.value.copy(this.sunDirection);
    this.cloudPassMaterial.uniforms.uSunDirection.value.copy(this.sunDirection);

    this.material.uniforms.uMoonDirection.value.copy(params.moonDirection).normalize();
    this.cloudPassMaterial.uniforms.uMoonDirection.value.copy(params.moonDirection).normalize();

    this.material.uniforms.uZenithColor.value.copy(params.zenith);
    this.material.uniforms.uMidSkyColor.value.copy(params.midSky);
    this.material.uniforms.uHorizonColor.value.copy(params.horizon);
    this.material.uniforms.uSunColor.value.copy(params.sunColor);
    this.material.uniforms.uFogColor.value.set(params.fogColor.r, params.fogColor.g, params.fogColor.b);
    this.material.uniforms.uSunVisibility.value = params.sunDiscVisibility;
    this.material.uniforms.uStarVisibility.value = params.starVisibility;
    this.material.uniforms.uMoonVisibility.value = params.moonVisibility;
    this.material.uniforms.uMoonPhaseIllum.value = params.moonPhaseIllumination;
    this.material.uniforms.uMoonIntensity.value = params.moonlightStrength;

    this.cloudPassMaterial.uniforms.uZenithColor.value.copy(params.zenith);
    this.cloudPassMaterial.uniforms.uMidSkyColor.value.copy(params.midSky);
    this.cloudPassMaterial.uniforms.uHorizonColor.value.copy(params.horizon);
    this.cloudPassMaterial.uniforms.uSunColor.value.copy(params.sunColor);
    this.cloudPassMaterial.uniforms.uCloudLitTint.value.copy(params.cloudLitTint);
    this.cloudPassMaterial.uniforms.uCloudShadeTint.value.copy(params.cloudShadeTint);
    this.cloudPassMaterial.uniforms.uSunVisibility.value = params.sunDiscVisibility;
    this.cloudPassMaterial.uniforms.uMoonIntensity.value = params.moonlightStrength;

    if (params.forceCloudRefresh) {
      this.hasRenderedClouds = false;
    }
  }

  /**
   * Adjust sky atmospheric palette for calibrated daylight presets.
   */
  public setSkyPalette(palette: {
    zenith: THREE.Vector3;
    midSky: THREE.Vector3;
    horizon: THREE.Vector3;
    sunColor: THREE.Vector3;
    fogColor: THREE.Color;
  }): void {
    this.material.uniforms.uZenithColor.value.copy(palette.zenith);
    this.material.uniforms.uMidSkyColor.value.copy(palette.midSky);
    this.material.uniforms.uHorizonColor.value.copy(palette.horizon);
    this.material.uniforms.uSunColor.value.copy(palette.sunColor);
    this.material.uniforms.uFogColor.value.set(palette.fogColor.r, palette.fogColor.g, palette.fogColor.b);

    this.cloudPassMaterial.uniforms.uZenithColor.value.copy(palette.zenith);
    this.cloudPassMaterial.uniforms.uMidSkyColor.value.copy(palette.midSky);
    this.cloudPassMaterial.uniforms.uHorizonColor.value.copy(palette.horizon);
    this.cloudPassMaterial.uniforms.uSunColor.value.copy(palette.sunColor);
    this.hasRenderedClouds = false;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.cloudQuadGeo.dispose();
    this.cloudPassMaterial.dispose();
    this.cloudRT.dispose();
  }
}
