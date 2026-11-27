import * as THREE from 'three';

/**
 * Geographic location: CVR College of Engineering, Vastunagar (Mangalpalli),
 * Ibrahimpatnam, Hyderabad, Telangana, India.
 */
export const CAMPUS_GEO = {
  name: 'Hyderabad, Telangana (CVR Campus)',
  timeZone: 'Asia/Kolkata',
  latitudeDeg: 17.1964,
  longitudeDeg: 78.5972,
  utcOffsetMinutes: 330, // IST (+05:30)
} as const;

export type DayNightMode = 'REAL_TIME' | 'PREVIEW' | 'ACCELERATED';

export type DayPhaseName =
  | 'Midnight'
  | 'Night'
  | 'Pre-dawn'
  | 'Dawn'
  | 'Sunrise'
  | 'Soft Morning'
  | 'Balanced Daylight'
  | 'Midday'
  | 'Afternoon'
  | 'Sunset'
  | 'Blue Hour';

export type MoonPhaseName =
  | 'New Moon'
  | 'Waxing Crescent'
  | 'First Quarter'
  | 'Waxing Gibbous'
  | 'Full Moon'
  | 'Waning Gibbous'
  | 'Last Quarter'
  | 'Waning Crescent';

export interface LunarMetrics {
  elevationDeg: number;
  azimuthDeg: number;
  illumination: number; // 0..1 fraction
  illuminationPct: number; // 0..100 integer
  ageDays: number; // 0..29.53 synodic days
  phaseName: MoonPhaseName;
  isUp: boolean;
}

export interface SolarMetrics {
  mode: DayNightMode;
  year: number;
  month: number;
  day: number;
  dayOfYear: number;
  hour: number;
  minute: number;
  second: number;
  fractionalHours: number;
  minutesSinceMidnight: number;
  formattedTime24: string;
  formattedTime12: string;
  formattedDate: string;
  elevationDeg: number;
  azimuthDeg: number;
  sunriseMinutes: number;
  sunsetMinutes: number;
  solarNoonMinutes: number;
  sunriseFormatted: string;
  sunsetFormatted: string;
  phase: DayPhaseName;
  lunar: LunarMetrics;
}

export interface AtmosphereKeyframe {
  id: string;
  label: DayPhaseName;
  minutes: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiSkyColor: THREE.Color;
  hemiGroundColor: THREE.Color;
  hemiIntensity: number;
  ambientIntensity: number;
  envIntensity: number;
  exposure: number;
  fogColor: THREE.Color;
  fogDensity: number;
  zenith: THREE.Vector3;
  midSky: THREE.Vector3;
  horizon: THREE.Vector3;
  sunSkyColor: THREE.Vector3;
  cloudLitTint: THREE.Vector3;
  cloudShadeTint: THREE.Vector3;
}

export interface AtmosphereFrame {
  solar: SolarMetrics;
  /** True astronomical solar direction vector (North = -Z, East = +X, Up = +Y) */
  sunDirection: THREE.Vector3;
  /** True astronomical lunar direction vector (North = -Z, East = +X, Up = +Y) */
  moonDirection: THREE.Vector3;
  /** Clamped directional shadow light direction (Sun by day, Moon by moonlit night, calm fill if moonless) */
  shadowLightDirection: THREE.Vector3;
  shadowLightColor: THREE.Color;
  shadowLightIntensity: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiSkyColor: THREE.Color;
  hemiGroundColor: THREE.Color;
  hemiIntensity: number;
  ambientIntensity: number;
  envIntensity: number;
  exposure: number;
  fogColor: THREE.Color;
  fogDensity: number;
  zenith: THREE.Vector3;
  midSky: THREE.Vector3;
  horizon: THREE.Vector3;
  sunSkyColor: THREE.Vector3;
  cloudLitTint: THREE.Vector3;
  cloudShadeTint: THREE.Vector3;
  /** Smooth 0..1 visibility of solar disc/corona as sun rises above/sets below horizon */
  sunDiscVisibility: number;
  /** Smooth 0..1 nighttime star visibility governed by solar depression (-2° to -12.5°) */
  starVisibility: number;
  /** Smooth 0..1 moon disc horizon visibility */
  moonVisibility: number;
  /** Effective moonlight strength (moon elevation x lunar phase) for sky clouds & ground light */
  moonlightStrength: number;
  /** Nearest pre-baked IBL stop index (0..23) matching current lighting state */
  iblStopIndex: number;
}

export interface IBLStopDescriptor {
  index: number;
  id: string;
  horizon: THREE.Vector3;
  zenith: THREE.Vector3;
  sunSkyColor: THREE.Vector3;
  sunDirection: THREE.Vector3;
}

interface ISTComponents {
  year: number;
  month: number;
  day: number;
  dayOfYear: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  fractionalHours: number;
  minutesSinceMidnight: number;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function formatHHMM24(totalMinutes: number): string {
  const wrapped = ((Math.floor(totalMinutes) % 1440) + 1440) % 1440;
  const hh = Math.floor(wrapped / 60);
  const mm = wrapped % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function formatHHMMSS12(hour: number, minute: number, second: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')} ${period}`;
}

/**
 * Convert geographic compass azimuth (clockwise from North: 0=N/-Z, 90=E/+X, 180=S/+Z, 270=W/-X)
 * and astronomical elevation (-90..+90 deg) to Three.js world unit direction.
 */
export function compassToWorldDirection(
  elevationDeg: number,
  azimuthDeg: number,
  out = new THREE.Vector3()
): THREE.Vector3 {
  const el = THREE.MathUtils.degToRad(elevationDeg);
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const cosEl = Math.cos(el);
  return out
    .set(cosEl * Math.sin(az), Math.sin(el), -cosEl * Math.cos(az))
    .normalize();
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * DayNightCycle — Phases A, B & C
 * Real-world IST (Asia/Kolkata) solar & lunar ephemeris for Hyderabad (17.1964°N, 78.5972°E),
 * astronomical sunrise/sunset & moonrise/moonset/phase, visibilitychange tab resync,
 * smooth 24-hour atmosphere interpolation, natural star/twilight transition, and phase-accurate moonlight.
 */
export class DayNightCycle {
  private mode: DayNightMode = 'REAL_TIME';
  private acceleratedSpeed = 60; // 60x => 24h completes in 24 real minutes
  private simulatedEpochMs: number = Date.now();
  private previewDate: { year: number; month: number; day: number } | null = null;
  private previewMinutes = 10 * 60 + 30;
  private onResyncCallbacks: Array<() => void> = [];
  private onVisibilityChangeBound: () => void;

  private readonly istFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAMPUS_GEO.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  // Base Upgrade 11 + Twilight/Night keyframe templates (anchor minutes updated daily from sunrise/sunset)
  private readonly keyframes: AtmosphereKeyframe[];
  private cachedSolarDateKey = '';
  private cachedSunriseMinutes = 385;
  private cachedSunsetMinutes = 1061;
  private cachedSolarNoonMinutes = 723;

  // Pre-allocated output buffers (zero per-frame allocations)
  private readonly outFrame: AtmosphereFrame;
  private readonly nightStarlightDir = new THREE.Vector3(-0.25, 0.88, 0.40).normalize();
  private readonly moonLightColor = new THREE.Color(0xcbdaf0); // Neutral silver-cool pale moonlight
  private readonly starFillColor = new THREE.Color(0x637aa6);
  private readonly moonHemiSkyBoost = new THREE.Color(0x526e9e);
  private readonly tempVec = new THREE.Vector3();

  constructor() {
    this.keyframes = [
      // 0: Midnight (deep natural blue-slate night sky, comfortable base readability even without full moon)
      {
        id: 'midnight',
        label: 'Midnight',
        minutes: 0,
        sunColor: new THREE.Color(0x4b6ba8),
        sunIntensity: 0.0,
        hemiSkyColor: new THREE.Color(0x344e7d),
        hemiGroundColor: new THREE.Color(0x161b26),
        hemiIntensity: 0.34,
        ambientIntensity: 0.09,
        envIntensity: 0.18,
        exposure: 0.88,
        fogColor: new THREE.Color(0x0b1325),
        fogDensity: 0.0021,
        zenith: new THREE.Vector3(0.011, 0.022, 0.058),
        midSky: new THREE.Vector3(0.022, 0.044, 0.102),
        horizon: new THREE.Vector3(0.046, 0.076, 0.148),
        sunSkyColor: new THREE.Vector3(0.25, 0.30, 0.45),
        cloudLitTint: new THREE.Vector3(0.11, 0.15, 0.24),
        cloudShadeTint: new THREE.Vector3(0.06, 0.09, 0.15),
      },
      // 1: Pre-dawn (astronomical to nautical twilight)
      {
        id: 'predawn',
        label: 'Pre-dawn',
        minutes: 320,
        sunColor: new THREE.Color(0x7d8ec2),
        sunIntensity: 0.0,
        hemiSkyColor: new THREE.Color(0x4a68a0),
        hemiGroundColor: new THREE.Color(0x212430),
        hemiIntensity: 0.44,
        ambientIntensity: 0.08,
        envIntensity: 0.23,
        exposure: 0.90,
        fogColor: new THREE.Color(0x222f4b),
        fogDensity: 0.00225,
        zenith: new THREE.Vector3(0.024, 0.058, 0.165),
        midSky: new THREE.Vector3(0.072, 0.122, 0.268),
        horizon: new THREE.Vector3(0.23, 0.23, 0.33),
        sunSkyColor: new THREE.Vector3(0.70, 0.56, 0.52),
        cloudLitTint: new THREE.Vector3(0.30, 0.32, 0.44),
        cloudShadeTint: new THREE.Vector3(0.15, 0.18, 0.28),
      },
      // 2: Civil Dawn (first horizon rose-gold glow before sunrise)
      {
        id: 'dawn',
        label: 'Dawn',
        minutes: 356,
        sunColor: new THREE.Color(0xffac72),
        sunIntensity: 0.22,
        hemiSkyColor: new THREE.Color(0x6e90cf),
        hemiGroundColor: new THREE.Color(0x37302d),
        hemiIntensity: 0.54,
        ambientIntensity: 0.06,
        envIntensity: 0.27,
        exposure: 0.93,
        fogColor: new THREE.Color(0x888496),
        fogDensity: 0.0024,
        zenith: new THREE.Vector3(0.058, 0.155, 0.39),
        midSky: new THREE.Vector3(0.18, 0.28, 0.52),
        horizon: new THREE.Vector3(0.68, 0.50, 0.45),
        sunSkyColor: new THREE.Vector3(1.0, 0.66, 0.42),
        cloudLitTint: new THREE.Vector3(0.76, 0.56, 0.50),
        cloudShadeTint: new THREE.Vector3(0.36, 0.35, 0.44),
      },
      // 3: Sunrise (sun clears eastern horizon, warm golden rays)
      {
        id: 'sunrise',
        label: 'Sunrise',
        minutes: 390,
        sunColor: new THREE.Color(0xffc78a),
        sunIntensity: 1.55,
        hemiSkyColor: new THREE.Color(0x8fb9ed),
        hemiGroundColor: new THREE.Color(0x4f443a),
        hemiIntensity: 0.66,
        ambientIntensity: 0.05,
        envIntensity: 0.32,
        exposure: 0.96,
        fogColor: new THREE.Color(0xdcb99c),
        fogDensity: 0.0024,
        zenith: new THREE.Vector3(0.11, 0.30, 0.62),
        midSky: new THREE.Vector3(0.28, 0.48, 0.76),
        horizon: new THREE.Vector3(0.84, 0.72, 0.63),
        sunSkyColor: new THREE.Vector3(1.0, 0.78, 0.54),
        cloudLitTint: new THREE.Vector3(1.0, 0.80, 0.66),
        cloudShadeTint: new THREE.Vector3(0.62, 0.58, 0.64),
      },
      // 4: Soft Morning Daylight — EXACT Upgrade 11 Preset B reference
      {
        id: 'morning',
        label: 'Soft Morning',
        minutes: 480,
        sunColor: new THREE.Color(0xffe6bd),
        sunIntensity: 2.20,
        hemiSkyColor: new THREE.Color(0xa5ccfa),
        hemiGroundColor: new THREE.Color(0x5b5044),
        hemiIntensity: 0.74,
        ambientIntensity: 0.04,
        envIntensity: 0.36,
        exposure: 1.00,
        fogColor: new THREE.Color(0xd8e4ee),
        fogDensity: 0.0023,
        zenith: new THREE.Vector3(0.15, 0.40, 0.72),
        midSky: new THREE.Vector3(0.35, 0.58, 0.84),
        horizon: new THREE.Vector3(0.74, 0.81, 0.88),
        sunSkyColor: new THREE.Vector3(1.0, 0.91, 0.78),
        cloudLitTint: new THREE.Vector3(0.98, 0.97, 0.96),
        cloudShadeTint: new THREE.Vector3(0.96, 0.96, 0.98),
      },
      // 5: Balanced Natural Daylight — EXACT Upgrade 11 Preset A reference
      {
        id: 'balanced',
        label: 'Balanced Daylight',
        minutes: 630,
        sunColor: new THREE.Color(0xfff6e6),
        sunIntensity: 2.55,
        hemiSkyColor: new THREE.Color(0x93c5fd),
        hemiGroundColor: new THREE.Color(0x635545),
        hemiIntensity: 0.68,
        ambientIntensity: 0.03,
        envIntensity: 0.35,
        exposure: 0.98,
        fogColor: new THREE.Color(0xcce0f2),
        fogDensity: 0.0017,
        zenith: new THREE.Vector3(0.11, 0.34, 0.69),
        midSky: new THREE.Vector3(0.24, 0.50, 0.81),
        horizon: new THREE.Vector3(0.64, 0.76, 0.88),
        sunSkyColor: new THREE.Vector3(1.0, 0.95, 0.86),
        cloudLitTint: new THREE.Vector3(1.0, 1.0, 1.0),
        cloudShadeTint: new THREE.Vector3(1.0, 1.0, 1.0),
      },
      // 6: Midday High Sun (crisp high sun without overexposing campus surfaces)
      {
        id: 'midday',
        label: 'Midday',
        minutes: 735,
        sunColor: new THREE.Color(0xfffaf0),
        sunIntensity: 2.65,
        hemiSkyColor: new THREE.Color(0x8ec4fc),
        hemiGroundColor: new THREE.Color(0x675948),
        hemiIntensity: 0.65,
        ambientIntensity: 0.03,
        envIntensity: 0.34,
        exposure: 0.96,
        fogColor: new THREE.Color(0xc7ddf0),
        fogDensity: 0.0015,
        zenith: new THREE.Vector3(0.095, 0.32, 0.68),
        midSky: new THREE.Vector3(0.22, 0.49, 0.81),
        horizon: new THREE.Vector3(0.60, 0.74, 0.88),
        sunSkyColor: new THREE.Vector3(1.0, 0.97, 0.91),
        cloudLitTint: new THREE.Vector3(1.0, 1.0, 1.0),
        cloudShadeTint: new THREE.Vector3(1.0, 1.0, 1.0),
      },
      // 7: Early Afternoon transition toward warm directional sunlight
      {
        id: 'early_afternoon',
        label: 'Balanced Daylight',
        minutes: 900,
        sunColor: new THREE.Color(0xffe9c7),
        sunIntensity: 2.68,
        hemiSkyColor: new THREE.Color(0x88bafa),
        hemiGroundColor: new THREE.Color(0x5a4c3e),
        hemiIntensity: 0.61,
        ambientIntensity: 0.025,
        envIntensity: 0.33,
        exposure: 0.96,
        fogColor: new THREE.Color(0xced9e6),
        fogDensity: 0.00165,
        zenith: new THREE.Vector3(0.10, 0.32, 0.67),
        midSky: new THREE.Vector3(0.23, 0.48, 0.79),
        horizon: new THREE.Vector3(0.67, 0.75, 0.84),
        sunSkyColor: new THREE.Vector3(1.0, 0.91, 0.78),
        cloudLitTint: new THREE.Vector3(1.0, 0.97, 0.92),
        cloudShadeTint: new THREE.Vector3(0.96, 0.95, 0.95),
      },
      // 8: Cinematic Afternoon Daylight — EXACT Upgrade 11 Preset C reference
      {
        id: 'afternoon',
        label: 'Afternoon',
        minutes: 990,
        sunColor: new THREE.Color(0xffd99c),
        sunIntensity: 2.75,
        hemiSkyColor: new THREE.Color(0x80b2f0),
        hemiGroundColor: new THREE.Color(0x4d3f31),
        hemiIntensity: 0.56,
        ambientIntensity: 0.02,
        envIntensity: 0.32,
        exposure: 0.95,
        fogColor: new THREE.Color(0xd0d8e4),
        fogDensity: 0.0018,
        zenith: new THREE.Vector3(0.09, 0.30, 0.65),
        midSky: new THREE.Vector3(0.22, 0.47, 0.78),
        horizon: new THREE.Vector3(0.72, 0.76, 0.82),
        sunSkyColor: new THREE.Vector3(1.0, 0.86, 0.68),
        cloudLitTint: new THREE.Vector3(1.0, 0.93, 0.82),
        cloudShadeTint: new THREE.Vector3(0.90, 0.87, 0.86),
      },
      // 9: Sunset (low golden sun dipping into western horizon haze)
      {
        id: 'sunset',
        label: 'Sunset',
        minutes: 1057,
        sunColor: new THREE.Color(0xff9b52),
        sunIntensity: 1.15,
        hemiSkyColor: new THREE.Color(0x6483c4),
        hemiGroundColor: new THREE.Color(0x3a2b22),
        hemiIntensity: 0.52,
        ambientIntensity: 0.04,
        envIntensity: 0.28,
        exposure: 0.93,
        fogColor: new THREE.Color(0xbf8f7e),
        fogDensity: 0.0022,
        zenith: new THREE.Vector3(0.065, 0.165, 0.42),
        midSky: new THREE.Vector3(0.22, 0.30, 0.54),
        horizon: new THREE.Vector3(0.84, 0.53, 0.39),
        sunSkyColor: new THREE.Vector3(1.0, 0.58, 0.30),
        cloudLitTint: new THREE.Vector3(0.96, 0.60, 0.42),
        cloudShadeTint: new THREE.Vector3(0.46, 0.38, 0.46),
      },
      // 10: Blue Hour (deep twilight indigo/violet sky before nightfall)
      {
        id: 'blue_hour',
        label: 'Blue Hour',
        minutes: 1092,
        sunColor: new THREE.Color(0x8ca2dc),
        sunIntensity: 0.0,
        hemiSkyColor: new THREE.Color(0x4869b0),
        hemiGroundColor: new THREE.Color(0x1f222e),
        hemiIntensity: 0.44,
        ambientIntensity: 0.075,
        envIntensity: 0.23,
        exposure: 0.90,
        fogColor: new THREE.Color(0x25304d),
        fogDensity: 0.0022,
        zenith: new THREE.Vector3(0.022, 0.055, 0.165),
        midSky: new THREE.Vector3(0.062, 0.112, 0.265),
        horizon: new THREE.Vector3(0.22, 0.20, 0.33),
        sunSkyColor: new THREE.Vector3(0.62, 0.44, 0.42),
        cloudLitTint: new THREE.Vector3(0.24, 0.27, 0.40),
        cloudShadeTint: new THREE.Vector3(0.12, 0.15, 0.24),
      },
      // 11: Nightfall (settles calmly into deep blue night sky matching Midnight stop across 00:00)
      {
        id: 'nightfall',
        label: 'Night',
        minutes: 1132,
        sunColor: new THREE.Color(0x4b6ba8),
        sunIntensity: 0.0,
        hemiSkyColor: new THREE.Color(0x344e7d),
        hemiGroundColor: new THREE.Color(0x161b26),
        hemiIntensity: 0.34,
        ambientIntensity: 0.09,
        envIntensity: 0.18,
        exposure: 0.88,
        fogColor: new THREE.Color(0x0b1325),
        fogDensity: 0.0021,
        zenith: new THREE.Vector3(0.011, 0.022, 0.058),
        midSky: new THREE.Vector3(0.022, 0.044, 0.102),
        horizon: new THREE.Vector3(0.046, 0.076, 0.148),
        sunSkyColor: new THREE.Vector3(0.25, 0.30, 0.45),
        cloudLitTint: new THREE.Vector3(0.11, 0.15, 0.24),
        cloudShadeTint: new THREE.Vector3(0.06, 0.09, 0.15),
      },
    ];

    this.outFrame = {
      solar: this.computeSolarMetrics(Date.now()),
      sunDirection: new THREE.Vector3(0.46, 0.70, 0.54),
      moonDirection: new THREE.Vector3(-0.3, 0.75, 0.58),
      shadowLightDirection: new THREE.Vector3(0.46, 0.70, 0.54),
      shadowLightColor: new THREE.Color(0xfff6e6),
      shadowLightIntensity: 2.55,
      sunColor: new THREE.Color(0xfff6e6),
      sunIntensity: 2.55,
      hemiSkyColor: new THREE.Color(0x93c5fd),
      hemiGroundColor: new THREE.Color(0x635545),
      hemiIntensity: 0.68,
      ambientIntensity: 0.03,
      envIntensity: 0.35,
      exposure: 0.98,
      fogColor: new THREE.Color(0xcce0f2),
      fogDensity: 0.0017,
      zenith: new THREE.Vector3(0.11, 0.34, 0.69),
      midSky: new THREE.Vector3(0.24, 0.50, 0.81),
      horizon: new THREE.Vector3(0.64, 0.76, 0.88),
      sunSkyColor: new THREE.Vector3(1.0, 0.95, 0.86),
      cloudLitTint: new THREE.Vector3(1.0, 1.0, 1.0),
      cloudShadeTint: new THREE.Vector3(1.0, 1.0, 1.0),
      sunDiscVisibility: 1.0,
      starVisibility: 0.0,
      moonVisibility: 0.0,
      moonlightStrength: 0.0,
      iblStopIndex: 5,
    };

    this.onVisibilityChangeBound = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        if (this.mode === 'REAL_TIME') {
          this.simulatedEpochMs = Date.now();
          for (const cb of this.onResyncCallbacks) cb();
        }
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChangeBound);
    }

    this.update(0);
  }

  public onResync(cb: () => void): void {
    this.onResyncCallbacks.push(cb);
  }

  public getMode(): DayNightMode {
    return this.mode;
  }

  public getAcceleratedSpeed(): number {
    return this.acceleratedSpeed;
  }

  public setRealTimeMode(): void {
    this.mode = 'REAL_TIME';
    this.previewDate = null;
    this.simulatedEpochMs = Date.now();
    this.update(0);
    for (const cb of this.onResyncCallbacks) cb();
  }

  /**
   * Pin a specific IST time-of-day (00:00..23:59) for manual inspection without changing player/camera/vehicles.
   */
  public setPreviewTime(hours: number, minutes = 0, seconds = 0): void {
    this.mode = 'PREVIEW';
    const clampedTotalSeconds = THREE.MathUtils.clamp(
      hours * 3600 + minutes * 60 + seconds,
      0,
      86399.999
    );
    this.previewMinutes = clampedTotalSeconds / 60;
    if (!this.previewDate) {
      const nowIST = this.extractISTComponents(Date.now());
      this.previewDate = { year: nowIST.year, month: nowIST.month, day: nowIST.day };
    }
    this.update(0);
  }

  /**
   * Pin exact calendar date and IST time (useful for checking seasonal sun & full/quarter/new moon phases).
   */
  public setPreviewDateTime(
    year: number,
    month: number,
    day: number,
    hours: number,
    minutes = 0,
    seconds = 0
  ): void {
    this.previewDate = { year, month, day };
    this.setPreviewTime(hours, minutes, seconds);
  }

  /**
   * Enable continuous accelerated cycle (default 60x: 24h in 24 real minutes).
   */
  public setAcceleratedMode(speedMultiplier = 60, startFromHour?: number): void {
    this.mode = 'ACCELERATED';
    this.acceleratedSpeed = Math.max(1, speedMultiplier);
    if (startFromHour !== undefined) {
      const nowIST = this.extractISTComponents(Date.now());
      const startTotalSeconds = (((startFromHour % 24) + 24) % 24) * 3600;
      const wholeSec = Math.floor(startTotalSeconds);
      const hh = Math.floor(wholeSec / 3600);
      const mm = Math.floor((wholeSec % 3600) / 60);
      const ss = wholeSec % 60;
      this.simulatedEpochMs =
        Date.UTC(nowIST.year, nowIST.month - 1, nowIST.day, hh, mm, ss, 0) -
        CAMPUS_GEO.utcOffsetMinutes * 60_000;
    } else if (this.previewDate) {
      this.simulatedEpochMs =
        Date.UTC(this.previewDate.year, this.previewDate.month - 1, this.previewDate.day, 0, 0, 0, 0) +
        this.previewMinutes * 60_000 -
        CAMPUS_GEO.utcOffsetMinutes * 60_000;
    } else {
      this.simulatedEpochMs = Date.now();
    }
    this.update(0);
  }

  /**
   * Build 24 lightweight IBL stops (12 keyframes + 12 interpolated midpoints) for ultra-smooth
   * reflections across dawn, sunset, and blue hour with 0ms runtime rebuild cost.
   */
  public getIBLStopDescriptors(): IBLStopDescriptor[] {
    const nowIST = this.extractISTComponents(Date.now());
    this.ensureDailyKeyframeAnchors(nowIST.year, nowIST.month, nowIST.day, nowIST.dayOfYear);

    const stops: IBLStopDescriptor[] = [];
    const count = this.keyframes.length;

    for (let i = 0; i < count; i++) {
      const k0 = this.keyframes[i];
      const k1 = this.keyframes[(i + 1) % count];
      const m0 = k0.minutes;
      const m1 = i === count - 1 ? 1440 + k1.minutes : k1.minutes;

      for (let sub = 0; sub < 2; sub++) {
        const subAlpha = sub === 0 ? 0 : 0.5;
        const mStop = THREE.MathUtils.lerp(m0, m1, subAlpha) % 1440;
        const epochForStop =
          Date.UTC(nowIST.year, nowIST.month - 1, nowIST.day, 0, 0, 0, 0) +
          mStop * 60_000 -
          CAMPUS_GEO.utcOffsetMinutes * 60_000;
        const solar = this.computeSolarMetrics(epochForStop);
        const reflEl = Math.max(solar.elevationDeg, 8);
        const sunDir = compassToWorldDirection(reflEl, solar.azimuthDeg);

        stops.push({
          index: stops.length,
          id: sub === 0 ? k0.id : `${k0.id}_mid_${k1.id}`,
          horizon: k0.horizon.clone().lerp(k1.horizon, subAlpha),
          zenith: k0.zenith.clone().lerp(k1.zenith, subAlpha),
          sunSkyColor: k0.sunSkyColor.clone().lerp(k1.sunSkyColor, subAlpha),
          sunDirection: sunDir,
        });
      }
    }

    return stops;
  }

  public getCurrentFrame(): AtmosphereFrame {
    return this.outFrame;
  }

  /**
   * Advance clock (real-time IST, accelerated cycle, or preview) and interpolate all atmospheric & lunar channels.
   */
  public update(deltaSeconds: number): AtmosphereFrame {
    let targetEpochMs: number;
    if (this.mode === 'REAL_TIME') {
      targetEpochMs = Date.now();
      this.simulatedEpochMs = targetEpochMs;
    } else if (this.mode === 'ACCELERATED') {
      this.simulatedEpochMs += Math.max(0, deltaSeconds) * this.acceleratedSpeed * 1000;
      targetEpochMs = this.simulatedEpochMs;
    } else {
      const baseDate = this.previewDate ?? this.extractISTComponents(Date.now());
      targetEpochMs =
        Date.UTC(baseDate.year, baseDate.month - 1, baseDate.day, 0, 0, 0, 0) +
        this.previewMinutes * 60_000 -
        CAMPUS_GEO.utcOffsetMinutes * 60_000;
    }

    const solar = this.computeSolarMetrics(targetEpochMs);
    this.outFrame.solar = solar;

    const m = solar.minutesSinceMidnight;

    // Locate wrapping bracket [k0, k1] along the 12 daily keyframes [0..1440)
    const count = this.keyframes.length;
    let idx0 = count - 1;
    let idx1 = 0;
    let span = 1440 - this.keyframes[count - 1].minutes + this.keyframes[0].minutes;
    let offset =
      m >= this.keyframes[count - 1].minutes
        ? m - this.keyframes[count - 1].minutes
        : 1440 - this.keyframes[count - 1].minutes + m;

    for (let i = 0; i < count - 1; i++) {
      if (m >= this.keyframes[i].minutes && m < this.keyframes[i + 1].minutes) {
        idx0 = i;
        idx1 = i + 1;
        span = Math.max(0.001, this.keyframes[i + 1].minutes - this.keyframes[i].minutes);
        offset = m - this.keyframes[i].minutes;
        break;
      }
    }

    const linearAlpha = THREE.MathUtils.clamp(offset / span, 0, 1);
    const t = linearAlpha * linearAlpha * (3 - 2 * linearAlpha); // C1 Hermite smoothstep

    const a = this.keyframes[idx0];
    const b = this.keyframes[idx1];

    // True solar & lunar sky positions
    compassToWorldDirection(solar.elevationDeg, solar.azimuthDeg, this.outFrame.sunDirection);
    compassToWorldDirection(solar.lunar.elevationDeg, solar.lunar.azimuthDeg, this.outFrame.moonDirection);

    this.outFrame.sunDiscVisibility = smoothstep(-2.5, 4.0, solar.elevationDeg);
    // Gradual realistic twilight star emergence as solar depression deepens from -2° to -12.5°
    this.outFrame.starVisibility = smoothstep(-2.0, -12.5, solar.elevationDeg);
    this.outFrame.moonVisibility = smoothstep(-1.5, 2.5, solar.lunar.elevationDeg);

    // Moonlight directional/sky contribution depends on BOTH lunar elevation AND lunar phase illumination
    const moonAltitudeFactor = smoothstep(0.0, 18.0, solar.lunar.elevationDeg);
    const nightWeight = smoothstep(2.0, -7.0, solar.elevationDeg);
    const phaseCurve = Math.pow(THREE.MathUtils.clamp(solar.lunar.illumination, 0, 1), 0.9);
    const moonlightStrength = moonAltitudeFactor * phaseCurve * nightWeight;
    this.outFrame.moonlightStrength = moonlightStrength;

    // Smoothly interpolate all photometric & atmospheric parameters
    this.outFrame.sunColor.copy(a.sunColor).lerp(b.sunColor, t);
    this.outFrame.sunIntensity = THREE.MathUtils.lerp(a.sunIntensity, b.sunIntensity, t);
    this.outFrame.hemiSkyColor.copy(a.hemiSkyColor).lerp(b.hemiSkyColor, t);
    this.outFrame.hemiGroundColor.copy(a.hemiGroundColor).lerp(b.hemiGroundColor, t);
    this.outFrame.hemiIntensity = THREE.MathUtils.lerp(a.hemiIntensity, b.hemiIntensity, t);
    this.outFrame.ambientIntensity = THREE.MathUtils.lerp(a.ambientIntensity, b.ambientIntensity, t);
    this.outFrame.envIntensity = THREE.MathUtils.lerp(a.envIntensity, b.envIntensity, t);
    this.outFrame.exposure = THREE.MathUtils.lerp(a.exposure, b.exposure, t);
    this.outFrame.fogColor.copy(a.fogColor).lerp(b.fogColor, t);
    this.outFrame.fogDensity = THREE.MathUtils.lerp(a.fogDensity, b.fogDensity, t);

    // Boost subtle natural cool-silver sky bounce when bright Moon is high at night
    if (moonlightStrength > 0.01) {
      this.outFrame.hemiIntensity += 0.14 * moonlightStrength;
      this.outFrame.hemiSkyColor.lerp(this.moonHemiSkyBoost, 0.35 * moonlightStrength);
      this.outFrame.ambientIntensity += 0.025 * moonlightStrength;
      this.outFrame.envIntensity += 0.04 * moonlightStrength;
    }

    this.outFrame.zenith.lerpVectors(a.zenith, b.zenith, t);
    this.outFrame.midSky.lerpVectors(a.midSky, b.midSky, t);
    this.outFrame.horizon.lerpVectors(a.horizon, b.horizon, t);
    this.outFrame.sunSkyColor.lerpVectors(a.sunSkyColor, b.sunSkyColor, t);
    this.outFrame.cloudLitTint.lerpVectors(a.cloudLitTint, b.cloudLitTint, t);
    this.outFrame.cloudShadeTint.lerpVectors(a.cloudShadeTint, b.cloudShadeTint, t);

    // Directional shadow-casting light: Sun by day -> real Moon by moonlit night -> subtle zenith fill if moonless
    const solarShadowFade = smoothstep(-1.5, 3.5, solar.elevationDeg);
    const dayShadowIntensity = this.outFrame.sunIntensity * solarShadowFade;
    const moonShadowIntensity = 0.36 * moonlightStrength;

    if (dayShadowIntensity >= moonShadowIntensity && dayShadowIntensity > 0.02) {
      const clampedSunEl = Math.max(solar.elevationDeg, 4.5);
      compassToWorldDirection(clampedSunEl, solar.azimuthDeg, this.outFrame.shadowLightDirection);
      this.outFrame.shadowLightColor.copy(this.outFrame.sunColor);
      this.outFrame.shadowLightIntensity = dayShadowIntensity;
    } else if (moonShadowIntensity > 0.03) {
      const clampedMoonEl = Math.max(solar.lunar.elevationDeg, 6.0);
      compassToWorldDirection(
        clampedMoonEl,
        solar.lunar.azimuthDeg,
        this.outFrame.shadowLightDirection
      );
      this.outFrame.shadowLightColor.copy(this.moonLightColor);
      // Crossfade smoothly when sunlight dips toward 0 and moonlight dominates
      this.outFrame.shadowLightIntensity = moonShadowIntensity;
    } else {
      // Dark/new-moon or transition trough: gentle soft zenith starlight without fake horizontal shadows
      this.tempVec.copy(this.nightStarlightDir);
      this.outFrame.shadowLightDirection.copy(this.tempVec);
      this.outFrame.shadowLightColor.copy(this.starFillColor);
      this.outFrame.shadowLightIntensity = 0.05 * smoothstep(-2.0, -7.0, solar.elevationDeg);
    }

    // Map continuous linearAlpha along [0..1) into 24 IBL stops (nearest among 24)
    const stop24 = Math.round((idx0 + linearAlpha) * 2) % 24;
    this.outFrame.iblStopIndex = stop24;
    return this.outFrame;
  }

  public computeSolarMetrics(epochMs: number): SolarMetrics {
    const ist = this.extractISTComponents(epochMs);
    this.ensureDailyKeyframeAnchors(ist.year, ist.month, ist.day, ist.dayOfYear);

    const { elevationDeg, azimuthDeg } = this.evaluateSolarAngles(
      ist.year,
      ist.dayOfYear,
      ist.fractionalHours
    );

    const lunar = this.evaluateLunarEphemeris(epochMs);
    const phase = this.classifyPhase(ist.minutesSinceMidnight, elevationDeg);

    return {
      mode: this.mode,
      year: ist.year,
      month: ist.month,
      day: ist.day,
      dayOfYear: ist.dayOfYear,
      hour: ist.hour,
      minute: ist.minute,
      second: ist.second,
      fractionalHours: ist.fractionalHours,
      minutesSinceMidnight: ist.minutesSinceMidnight,
      formattedTime24: `${String(ist.hour).padStart(2, '0')}:${String(ist.minute).padStart(2, '0')}:${String(ist.second).padStart(2, '0')}`,
      formattedTime12: formatHHMMSS12(ist.hour, ist.minute, ist.second),
      formattedDate: `${ist.year}-${String(ist.month).padStart(2, '0')}-${String(ist.day).padStart(2, '0')}`,
      elevationDeg,
      azimuthDeg,
      sunriseMinutes: this.cachedSunriseMinutes,
      sunsetMinutes: this.cachedSunsetMinutes,
      solarNoonMinutes: this.cachedSolarNoonMinutes,
      sunriseFormatted: formatHHMM24(this.cachedSunriseMinutes),
      sunsetFormatted: formatHHMM24(this.cachedSunsetMinutes),
      phase,
      lunar,
    };
  }

  private extractISTComponents(epochMs: number): ISTComponents {
    const parts = this.istFormatter.formatToParts(new Date(epochMs));
    let year = 2026;
    let month = 1;
    let day = 1;
    let hour = 0;
    let minute = 0;
    let second = 0;

    for (const part of parts) {
      const val = Number(part.value);
      if (part.type === 'year') year = val;
      else if (part.type === 'month') month = val;
      else if (part.type === 'day') day = val;
      else if (part.type === 'hour') hour = val === 24 ? 0 : val;
      else if (part.type === 'minute') minute = val;
      else if (part.type === 'second') second = val;
    }

    const millisecond = ((epochMs % 1000) + 1000) % 1000;
    const dayOfYear =
      Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86_400_000) + 1;
    const fractionalHours = hour + minute / 60 + (second + millisecond / 1000) / 3600;
    const minutesSinceMidnight = fractionalHours * 60;

    return {
      year,
      month,
      day,
      dayOfYear,
      hour,
      minute,
      second,
      millisecond,
      fractionalHours,
      minutesSinceMidnight,
    };
  }

  /**
   * NOAA Spencer solar declination + equation of time algorithm for Hyderabad campus.
   */
  private evaluateSolarAngles(
    year: number,
    dayOfYear: number,
    fractionalHoursIST: number
  ): { elevationDeg: number; azimuthDeg: number } {
    const daysInYear = isLeapYear(year) ? 366 : 365;
    const gamma =
      ((2 * Math.PI) / daysInYear) * (dayOfYear - 1 + (fractionalHoursIST - 12) / 24);

    const eotMinutes =
      229.18 *
      (0.000075 +
        0.001868 * Math.cos(gamma) -
        0.032077 * Math.sin(gamma) -
        0.014615 * Math.cos(2 * gamma) -
        0.040849 * Math.sin(2 * gamma));

    const declRad =
      0.006918 -
      0.399912 * Math.cos(gamma) +
      0.070257 * Math.sin(gamma) -
      0.006758 * Math.cos(2 * gamma) +
      0.000907 * Math.sin(2 * gamma) -
      0.002697 * Math.cos(3 * gamma) +
      0.00148 * Math.sin(3 * gamma);

    const timeOffsetMinutes =
      eotMinutes + 4 * CAMPUS_GEO.longitudeDeg - CAMPUS_GEO.utcOffsetMinutes;
    const trueSolarTimeMinutes =
      (((fractionalHoursIST * 60 + timeOffsetMinutes) % 1440) + 1440) % 1440;
    const hourAngleDeg = trueSolarTimeMinutes / 4 - 180;
    const haRad = THREE.MathUtils.degToRad(hourAngleDeg);
    const latRad = THREE.MathUtils.degToRad(CAMPUS_GEO.latitudeDeg);

    const cosZenith = THREE.MathUtils.clamp(
      Math.sin(latRad) * Math.sin(declRad) +
        Math.cos(latRad) * Math.cos(declRad) * Math.cos(haRad),
      -1,
      1
    );
    const zenithRad = Math.acos(cosZenith);
    const elevationDeg = 90 - THREE.MathUtils.radToDeg(zenithRad);

    const sinZenith = Math.sin(zenithRad);
    let azimuthDeg = 180;
    if (sinZenith > 1e-4) {
      const cosAzFromNorth = THREE.MathUtils.clamp(
        (Math.sin(declRad) - Math.sin(latRad) * cosZenith) /
          (Math.cos(latRad) * sinZenith),
        -1,
        1
      );
      const fromNorthDeg = THREE.MathUtils.radToDeg(Math.acos(cosAzFromNorth));
      azimuthDeg = hourAngleDeg <= 0 ? fromNorthDeg : 360 - fromNorthDeg;
    }

    return { elevationDeg, azimuthDeg };
  }

  /**
   * Astronomical Lunar Ephemeris (Schlyter orbital elements + major lunar perturbations
   * & horizontal parallax for Hyderabad topocentric altitude, azimuth & phase illumination).
   */
  private evaluateLunarEphemeris(epochMs: number): LunarMetrics {
    const d = epochMs / 86_400_000 - 10957.5; // Days since J2000.0 (2000-01-01 12:00 UT)

    // Sun ecliptic longitude for phase elongation
    const LsDeg = normalizeDeg(280.460 + 0.9856474 * d);
    const MsRad = THREE.MathUtils.degToRad(normalizeDeg(357.528 + 0.9856003 * d));
    const lambdaSunDeg = normalizeDeg(
      LsDeg + 1.915 * Math.sin(MsRad) + 0.020 * Math.sin(2 * MsRad)
    );

    // Moon orbital elements
    const NmDeg = normalizeDeg(125.1228 - 0.0529538083 * d);
    const imRad = THREE.MathUtils.degToRad(5.1454);
    const wmDeg = normalizeDeg(318.0634 + 0.1643573223 * d);
    const am = 60.2666;
    const em = 0.054900;
    const MmDeg = normalizeDeg(115.3654 + 13.0649929509 * d);

    const MmRad = THREE.MathUtils.degToRad(MmDeg);
    let EmRad = MmRad + em * Math.sin(MmRad) * (1.0 + em * Math.cos(MmRad));
    EmRad -= (EmRad - em * Math.sin(EmRad) - MmRad) / (1.0 - em * Math.cos(EmRad));

    const xv = am * (Math.cos(EmRad) - em);
    const yv = am * Math.sqrt(1 - em * em) * Math.sin(EmRad);
    const rm = Math.hypot(xv, yv);
    const vmDeg = THREE.MathUtils.radToDeg(Math.atan2(yv, xv));

    const NmRad = THREE.MathUtils.degToRad(NmDeg);
    const vPlusWRad = THREE.MathUtils.degToRad(vmDeg + wmDeg);

    const xec =
      rm *
      (Math.cos(NmRad) * Math.cos(vPlusWRad) -
        Math.sin(NmRad) * Math.sin(vPlusWRad) * Math.cos(imRad));
    const yec =
      rm *
      (Math.sin(NmRad) * Math.cos(vPlusWRad) +
        Math.cos(NmRad) * Math.sin(vPlusWRad) * Math.cos(imRad));
    const zec = rm * (Math.sin(vPlusWRad) * Math.sin(imRad));

    let lambdaMoonDeg = normalizeDeg(THREE.MathUtils.radToDeg(Math.atan2(yec, xec)));
    let betaMoonDeg = THREE.MathUtils.radToDeg(Math.atan2(zec, Math.hypot(xec, yec)));

    // Principal periodic lunar perturbations (Evection, Variation, Annual Equation)
    const LmDeg = normalizeDeg(NmDeg + wmDeg + MmDeg);
    const DRad = THREE.MathUtils.degToRad(normalizeDeg(LmDeg - LsDeg));
    const FRad = THREE.MathUtils.degToRad(normalizeDeg(LmDeg - NmDeg));

    lambdaMoonDeg = normalizeDeg(
      lambdaMoonDeg -
        1.274 * Math.sin(MmRad - 2 * DRad) +
        0.658 * Math.sin(2 * DRad) -
        0.186 * Math.sin(MsRad) -
        0.059 * Math.sin(2 * MmRad - 2 * DRad) -
        0.057 * Math.sin(MmRad - 2 * DRad + MsRad) +
        0.053 * Math.sin(MmRad + 2 * DRad) +
        0.046 * Math.sin(2 * DRad - MsRad) +
        0.041 * Math.sin(MmRad - MsRad) -
        0.035 * Math.sin(DRad) -
        0.031 * Math.sin(MmRad + MsRad)
    );
    betaMoonDeg += -0.173 * Math.sin(FRad - 2 * DRad) - 0.055 * Math.sin(MmRad - FRad - 2 * DRad);

    // Ecliptic -> Equatorial (mean obliquity)
    const epsRad = THREE.MathUtils.degToRad(23.4393 - 3.563e-7 * d);
    const lRad = THREE.MathUtils.degToRad(lambdaMoonDeg);
    const bRad = THREE.MathUtils.degToRad(betaMoonDeg);

    const xe = Math.cos(bRad) * Math.cos(lRad);
    const ye = Math.cos(bRad) * Math.sin(lRad);
    const ze = Math.sin(bRad);

    const xEq = xe;
    const yEq = ye * Math.cos(epsRad) - ze * Math.sin(epsRad);
    const zEq = ye * Math.sin(epsRad) + ze * Math.cos(epsRad);

    const raMoonDeg = normalizeDeg(THREE.MathUtils.radToDeg(Math.atan2(yEq, xEq)));
    const decMoonRad = Math.asin(THREE.MathUtils.clamp(zEq, -1, 1));

    // Local Sidereal Time at Hyderabad
    const gmstDeg = normalizeDeg(280.46061837 + 360.98564736629 * d);
    const lstDeg = normalizeDeg(gmstDeg + CAMPUS_GEO.longitudeDeg);
    const haRad = THREE.MathUtils.degToRad(normalizeDeg(lstDeg - raMoonDeg));
    const latRad = THREE.MathUtils.degToRad(CAMPUS_GEO.latitudeDeg);

    const sinAltGeo = THREE.MathUtils.clamp(
      Math.sin(latRad) * Math.sin(decMoonRad) +
        Math.cos(latRad) * Math.cos(decMoonRad) * Math.cos(haRad),
      -1,
      1
    );
    const altGeoDeg = THREE.MathUtils.radToDeg(Math.asin(sinAltGeo));
    // Lunar horizontal parallax (~0.95 deg) shifts topocentric altitude slightly downward
    const parallaxDeg =
      THREE.MathUtils.radToDeg(Math.asin(1 / Math.max(54, rm))) *
      Math.cos(THREE.MathUtils.degToRad(Math.max(0, altGeoDeg)));
    const elevationDeg = altGeoDeg - parallaxDeg;

    const azNum = -Math.sin(haRad) * Math.cos(decMoonRad);
    const azDen =
      Math.cos(latRad) * Math.sin(decMoonRad) -
      Math.sin(latRad) * Math.cos(decMoonRad) * Math.cos(haRad);
    const azimuthDeg = normalizeDeg(THREE.MathUtils.radToDeg(Math.atan2(azNum, azDen)));

    // Elongation from Sun -> lunar phase illumination fraction & age
    const phaseDiffDeg = normalizeDeg(lambdaMoonDeg - lambdaSunDeg);
    const elongationCos = THREE.MathUtils.clamp(
      Math.cos(THREE.MathUtils.degToRad(phaseDiffDeg)) * Math.cos(bRad),
      -1,
      1
    );
    const illumination = THREE.MathUtils.clamp((1 - elongationCos) * 0.5, 0, 1);
    const ageDays = (phaseDiffDeg / 360) * 29.530588;

    let phaseName: MoonPhaseName = 'New Moon';
    if (phaseDiffDeg < 11 || phaseDiffDeg >= 349) phaseName = 'New Moon';
    else if (phaseDiffDeg < 79) phaseName = 'Waxing Crescent';
    else if (phaseDiffDeg < 101) phaseName = 'First Quarter';
    else if (phaseDiffDeg < 169) phaseName = 'Waxing Gibbous';
    else if (phaseDiffDeg < 191) phaseName = 'Full Moon';
    else if (phaseDiffDeg < 259) phaseName = 'Waning Gibbous';
    else if (phaseDiffDeg < 281) phaseName = 'Last Quarter';
    else phaseName = 'Waning Crescent';

    return {
      elevationDeg,
      azimuthDeg,
      illumination,
      illuminationPct: Math.round(illumination * 100),
      ageDays,
      phaseName,
      isUp: elevationDeg > -0.5,
    };
  }

  /**
   * Compute daily astronomical sunrise/sunset/solar noon and anchor twilight/day keyframes smoothly.
   */
  private ensureDailyKeyframeAnchors(
    year: number,
    month: number,
    day: number,
    dayOfYear: number
  ): void {
    const key = `${year}-${month}-${day}`;
    if (key === this.cachedSolarDateKey) return;
    this.cachedSolarDateKey = key;

    const daysInYear = isLeapYear(year) ? 366 : 365;
    const gamma = ((2 * Math.PI) / daysInYear) * (dayOfYear - 1);
    const eotMinutes =
      229.18 *
      (0.000075 +
        0.001868 * Math.cos(gamma) -
        0.032077 * Math.sin(gamma) -
        0.014615 * Math.cos(2 * gamma) -
        0.040849 * Math.sin(2 * gamma));
    const declRad =
      0.006918 -
      0.399912 * Math.cos(gamma) +
      0.070257 * Math.sin(gamma) -
      0.006758 * Math.cos(2 * gamma) +
      0.000907 * Math.sin(2 * gamma) -
      0.002697 * Math.cos(3 * gamma) +
      0.00148 * Math.sin(3 * gamma);

    const latRad = THREE.MathUtils.degToRad(CAMPUS_GEO.latitudeDeg);
    const zenithRiseRad = THREE.MathUtils.degToRad(90.833);
    const cosHaSunrise = THREE.MathUtils.clamp(
      Math.cos(zenithRiseRad) / (Math.cos(latRad) * Math.cos(declRad)) -
        Math.tan(latRad) * Math.tan(declRad),
      -1,
      1
    );
    const haSunriseDeg = THREE.MathUtils.radToDeg(Math.acos(cosHaSunrise));

    const solarNoonMin =
      720 - 4 * CAMPUS_GEO.longitudeDeg - eotMinutes + CAMPUS_GEO.utcOffsetMinutes;
    const sunriseMin = solarNoonMin - 4 * haSunriseDeg;
    const sunsetMin = solarNoonMin + 4 * haSunriseDeg;

    this.cachedSolarNoonMinutes = solarNoonMin;
    this.cachedSunriseMinutes = sunriseMin;
    this.cachedSunsetMinutes = sunsetMin;

    this.keyframes[0].minutes = 0; // Midnight
    this.keyframes[1].minutes = sunriseMin - 65; // Pre-dawn
    this.keyframes[2].minutes = sunriseMin - 28; // Dawn
    this.keyframes[3].minutes = sunriseMin + 5; // Sunrise
    this.keyframes[4].minutes = Math.max(sunriseMin + 90, 480); // ~08:00 Soft Morning (Upgrade 11 B)
    this.keyframes[5].minutes = 630; // ~10:30 Balanced Daylight (Upgrade 11 A)
    this.keyframes[6].minutes = Math.max(solarNoonMin + 12, 725); // Midday
    this.keyframes[7].minutes = (735 + Math.min(990, sunsetMin - 65)) * 0.5; // Early afternoon
    this.keyframes[8].minutes = Math.min(990, sunsetMin - 65); // ~16:30 Afternoon (Upgrade 11 C)
    this.keyframes[9].minutes = sunsetMin - 4; // Sunset
    this.keyframes[10].minutes = sunsetMin + 30; // Blue Hour
    this.keyframes[11].minutes = sunsetMin + 70; // Nightfall
  }

  private classifyPhase(minutes: number, elevationDeg: number): DayPhaseName {
    const sr = this.cachedSunriseMinutes;
    const ss = this.cachedSunsetMinutes;

    if (minutes < sr - 60) return minutes < 120 ? 'Midnight' : 'Night';
    if (minutes < sr - 25) return 'Pre-dawn';
    if (minutes < sr - 5) return 'Dawn';
    if (elevationDeg < 12 && minutes < sr + 55) return 'Sunrise';
    if (minutes < 570) return 'Soft Morning';
    if (minutes < 690) return 'Balanced Daylight';
    if (minutes < 855) return 'Midday';
    if (minutes < ss - 25) return 'Afternoon';
    if (minutes < ss + 14) return 'Sunset';
    if (minutes < ss + 55) return 'Blue Hour';
    return minutes > 1320 ? 'Midnight' : 'Night';
  }

  public dispose(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChangeBound);
    }
    this.onResyncCallbacks = [];
  }
}
