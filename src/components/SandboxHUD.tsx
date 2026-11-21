import React, { useEffect, useRef, useState } from 'react';
import { GameState, CVR_LANDMARKS, LandmarkLocation } from '../types/game';
import {
  MapPin,
  Activity,
  Compass,
  RotateCcw,
  MousePointer,
  Gauge,
  Navigation2,
  ChevronDown,
  Navigation,
  Crosshair,
  Maximize2,
  Minimize2,
  Car,
  Zap,
  User,
  Sparkles,
} from 'lucide-react';

interface SandboxHUDProps {
  state: GameState;
  onResetPosition: () => void;
  onRequestPointerLock: () => void;
  onTeleport: (x: number, y: number, z: number) => void;
  onOpenCharacterSelect?: () => void;
}

export const SandboxHUD: React.FC<SandboxHUDProps> = ({
  state,
  onResetPosition,
  onRequestPointerLock,
  onTeleport,
  onOpenCharacterSelect,
}) => {
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isTeleportOpen, setIsTeleportOpen] = useState(false);
  const [isMinimapExpanded, setIsMinimapExpanded] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyC') {
        onOpenCharacterSelect?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenCharacterSelect]);

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (fps >= 30) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  // --- 2D Campus Minimap Rendering (CAD Master Blueprint) ---
  useEffect(() => {
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Campus is 420m x 420m, from -210 to +210 in world coords
    // World coordinates: North = -Z (Up on map), South = +Z (Down on map)
    // West = -X (Left on map), East = +X (Right on map)
    const mapExtent = 210;
    const worldToMapX = (wx: number) => ((wx + mapExtent) / (mapExtent * 2)) * w;
    const worldToMapY = (wz: number) => ((wz + mapExtent) / (mapExtent * 2)) * h;

    // Clear background (Deep slate void)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // 1. Campus Grounds Base (Dark lush green)
    const minX = worldToMapX(-200);
    const maxX = worldToMapX(200);
    const minY = worldToMapY(-200);
    const maxY = worldToMapY(200);
    ctx.fillStyle = '#142918';
    ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

    // 2. Racha Kalwa Rain Water Canal (Curving along East and South perimeter)
    ctx.fillStyle = '#0284c7'; // Sky/canal blue
    // East Canal Section (x: 148 to 156, z: -140 to 115)
    ctx.fillRect(
      worldToMapX(148),
      worldToMapY(-140),
      worldToMapX(156) - worldToMapX(148),
      worldToMapY(115) - worldToMapY(-140)
    );
    // South Canal Section (x: -160 to 156, z: 111 to 119)
    ctx.fillRect(
      worldToMapX(-160),
      worldToMapY(111),
      worldToMapX(156) - worldToMapX(-160),
      worldToMapY(119) - worldToMapY(111)
    );

    // 3. North Bus Bay (Earthen red soil)
    ctx.fillStyle = '#5c2d1b';
    ctx.fillRect(
      worldToMapX(50),
      worldToMapY(-172),
      worldToMapX(135) - worldToMapX(50),
      worldToMapY(-154) - worldToMapY(-172)
    );

    // 4. Landscape Garden (Rich green)
    ctx.fillStyle = '#15803d';
    ctx.fillRect(
      worldToMapX(34),
      worldToMapY(-130),
      worldToMapX(124) - worldToMapX(34),
      worldToMapY(-45) - worldToMapY(-130)
    );
    // HT Tower indicator in garden
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(worldToMapX(142), worldToMapY(-142), 3, 0, Math.PI * 2);
    ctx.fill();

    // 5. Road Network (Dark slate asphalt #334155)
    ctx.fillStyle = '#334155';

    // North Approach Highway (z: -182 to -168, width 14m)
    ctx.fillRect(minX, worldToMapY(-182), maxX - minX, worldToMapY(-168) - worldToMapY(-182));

    // 12M Spine Avenue (x: 19 to 31, z: -160 to 115, width 12m)
    ctx.fillRect(
      worldToMapX(19),
      worldToMapY(-160),
      worldToMapX(31) - worldToMapX(19),
      worldToMapY(115) - worldToMapY(-160)
    );

    // North Loop Road (z: -134.5 to -125.5, x: -86 to 140, width 9m)
    ctx.fillRect(
      worldToMapX(-86),
      worldToMapY(-134.5),
      worldToMapX(140) - worldToMapX(-86),
      worldToMapY(-125.5) - worldToMapY(-134.5)
    );

    // West Outer Road (x: -89.8 to -82.2, z: -130 to 78, width 7.6m)
    ctx.fillRect(
      worldToMapX(-89.8),
      worldToMapY(-130),
      worldToMapX(-82.2) - worldToMapX(-89.8),
      worldToMapY(78) - worldToMapY(-130)
    );

    // Main Block West Road (x: -37.8 to -30.2, z: -130 to -10, width 7.6m)
    ctx.fillRect(
      worldToMapX(-37.8),
      worldToMapY(-130),
      worldToMapX(-30.2) - worldToMapX(-37.8),
      worldToMapY(-10) - worldToMapY(-130)
    );

    // Central Cross Road (z: -50.8 to -43.2, x: -86 to 31, width 7.6m)
    ctx.fillRect(
      worldToMapX(-86),
      worldToMapY(-50.8),
      worldToMapX(31) - worldToMapX(-86),
      worldToMapY(-43.2) - worldToMapY(-50.8)
    );

    // South Loop Road (z: 14.2 to 21.8, x: -86 to 140, width 7.6m)
    ctx.fillRect(
      worldToMapX(-86),
      worldToMapY(14.2),
      worldToMapX(140) - worldToMapX(-86),
      worldToMapY(21.8) - worldToMapY(14.2)
    );

    // East Perimeter Road (x: 137 to 143, z: -130 to 105, width 6m)
    ctx.fillRect(
      worldToMapX(137),
      worldToMapY(-130),
      worldToMapX(143) - worldToMapX(137),
      worldToMapY(105) - worldToMapY(-130)
    );

    // South Road (z: 102 to 108, x: -86 to 140, width 6m)
    ctx.fillRect(
      worldToMapX(-86),
      worldToMapY(102),
      worldToMapX(140) - worldToMapX(-86),
      worldToMapY(108) - worldToMapY(102)
    );

    // 6. Cricket Stadium Oval
    const cOvalX = worldToMapX(82);
    const cOvalY = worldToMapY(72);
    const cRadiusX = (42 / (mapExtent * 2)) * w;
    const cRadiusY = (32 / (mapExtent * 2)) * h;
    ctx.beginPath();
    ctx.ellipse(cOvalX, cOvalY, cRadiusX, cRadiusY, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Central Cricket Pitch
    ctx.fillStyle = '#d97706';
    ctx.fillRect(cOvalX - 4, cOvalY - 2, 8, 4);

    // 7. Sports Courts
    // Basketball
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(worldToMapX(-16), worldToMapY(29), worldToMapX(12) - worldToMapX(-16), worldToMapY(43) - worldToMapY(29));
    // Volleyball
    ctx.fillStyle = '#eab308';
    ctx.fillRect(worldToMapX(-8), worldToMapY(60), worldToMapX(12) - worldToMapX(-8), worldToMapY(76) - worldToMapY(60));

    // 8. Building Footprints
    const buildings = [
      { name: 'GATE', x: 25, z: -160, w: 22, d: 6, color: '#f59e0b' },
      { name: 'MAIN', x: -12, z: -75, w: 44, d: 56, color: '#38bdf8' },
      { name: 'PORTICO', x: 14, z: -75, w: 8, d: 20, color: '#0284c7' },
      { name: 'PG', x: -65, z: -75, w: 42, d: 56, color: '#94a3b8' },
      { name: 'LIB', x: -12, z: -23, w: 42, d: 22, color: '#cbd5e1' },
      { name: 'FY', x: -65, z: -10, w: 42, d: 46, color: '#94a3b8' },
      { name: 'SSB', x: -8, z: 7, w: 36, d: 20, color: '#a78bfa' },
      { name: 'CSE', x: 76, z: -23, w: 84, d: 18, color: '#60a5fa' },
      { name: 'WS1', x: 76, z: 2, w: 80, d: 10, color: '#f87171' },
      { name: 'WS2', x: 76, z: 18, w: 80, d: 10, color: '#f87171' },
      { name: 'WS3', x: 76, z: 34, w: 80, d: 10, color: '#f87171' },
      { name: 'EXAM', x: -24, z: 68, w: 26, d: 16, color: '#94a3b8' },
      { name: 'XFMR', x: -56, z: 48, w: 14, d: 12, color: '#eab308' },
      { name: 'STP', x: -102, z: -5, w: 16, d: 16, color: '#06b6d4' },
      { name: 'HOSTEL', x: -155, z: 115, w: 45, d: 30, color: '#94a3b8' },
      { name: 'STORE', x: -132, z: 78, w: 20, d: 14, color: '#64748b' },
    ];

    buildings.forEach((b) => {
      const bx = worldToMapX(b.x - b.w / 2);
      const by = worldToMapY(b.z - b.d / 2);
      const bw = worldToMapX(b.x + b.w / 2) - bx;
      const bh = worldToMapY(b.z + b.d / 2) - by;

      ctx.fillStyle = b.color;
      ctx.fillRect(bx, by, Math.max(bw, 2), Math.max(bh, 2));
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(bx, by, Math.max(bw, 2), Math.max(bh, 2));

      // Building label (show if map is big enough)
      if (w >= 180 && b.name !== 'PORTICO') {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.name, bx + bw / 2, by + bh / 2);
      }
    });

    // 9. Perimeter Compound Wall
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

    // 10. Live Player Position & Rotating Directional Arrow
    const px = worldToMapX(state.playerPosition.x);
    const py = worldToMapY(state.playerPosition.z);

    // Player beacon glow
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Player Direction Arrow
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-state.playerRotationY - Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(3.5, 2);
    ctx.lineTo(-3.5, 2);
    ctx.closePath();
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.restore();

    // 11. North Indicator
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('▲ N', 6, 13);
  }, [state.playerPosition, state.playerRotationY, isMinimapExpanded]);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 md:p-5 select-none font-sans">
      {/* Top Bar: Header & Current Zone + 2D Campus Minimap */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 w-full">
        {/* Left: Project Badge & Active Zone */}
        <div className="flex flex-col gap-2 max-w-md">
          {/* Milestone Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-700/60 shadow-lg text-xs font-semibold tracking-wider text-slate-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-amber-400 font-bold">CVR CAMPUS SANDBOX</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 font-mono text-[11px]">MILESTONE 2</span>
          </div>

          {/* Dynamic Campus Zone Card */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-300">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
              <MapPin className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-widest text-slate-400 font-medium">
                  Current Campus Zone
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  ACTIVE
                </span>
              </div>
              <h1 className="text-base md:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                {state.currentZone}
              </h1>
              <p className="text-xs text-slate-300 font-medium line-clamp-1">
                {state.zoneDescription}
              </p>
            </div>
          </div>

          {/* Quick Action Pills: Character Select & Quick Teleport */}
          <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
            {/* Student Avatar Selector Button [C] */}
            <button
              onClick={onOpenCharacterSelect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-slate-900/90 to-amber-500/10 hover:from-amber-500/30 text-xs font-semibold text-amber-300 border border-amber-500/30 shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer"
              title="Change Student Character / Avatar (C)"
            >
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Avatar: <strong className="text-white">{state.activeCharacterName || 'Aarav'}</strong>
              </span>
              <kbd className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40 text-[10px] font-mono font-bold ml-0.5">
                C
              </kbd>
            </button>

            {/* Quick Landmark Teleporter (Interactive) */}
            <div className="relative">
              <button
                onClick={() => setIsTeleportOpen(!isTeleportOpen)}
                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-white/10 shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quick Landmark Teleport</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    isTeleportOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isTeleportOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-72 max-h-64 overflow-y-auto p-1.5 rounded-xl bg-slate-900/95 border border-white/15 shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-1">
                <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Select Campus Landmark
                </div>
                {CVR_LANDMARKS.map((landmark) => (
                  <button
                    key={landmark.name}
                    onClick={() => {
                      onTeleport(landmark.x, landmark.y, landmark.z);
                      setIsTeleportOpen(false);
                    }}
                    className={`flex items-start justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                      state.currentZone === landmark.name
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{landmark.shortLabel}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">
                        {landmark.description}
                      </div>
                    </div>
                    <span className="font-mono text-[9px] text-slate-500 shrink-0 ml-1">
                      {landmark.x},{landmark.z}
                    </span>
                  </button>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Right: Live 2D Campus Minimap & Telemetry */}
        <div className="flex flex-col items-end gap-2.5">
          {/* 2D Campus Minimap Card */}
          <div className="pointer-events-auto relative rounded-2xl overflow-hidden bg-slate-900/90 border border-white/15 shadow-2xl backdrop-blur-xl p-1.5">
            <div className="relative">
              <canvas
                ref={minimapCanvasRef}
                width={isMinimapExpanded ? 240 : 160}
                height={isMinimapExpanded ? 240 : 160}
                className="rounded-xl block"
              />
              <button
                onClick={() => setIsMinimapExpanded(!isMinimapExpanded)}
                title={isMinimapExpanded ? 'Minimize Map' : 'Expand Map'}
                className="absolute top-1 right-1 p-1 rounded-md bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-xs cursor-pointer shadow-md"
              >
                {isMinimapExpanded ? (
                  <Minimize2 className="w-3 h-3" />
                ) : (
                  <Maximize2 className="w-3 h-3" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between px-2 pt-1.5 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <Navigation className="w-2.5 h-2.5 text-amber-400" />
                <span>420m×420m</span>
              </span>
              <span className="text-white font-bold font-mono">
                {state.playerPosition.x}, {state.playerPosition.z}
              </span>
            </div>
          </div>

          {/* Telemetry Pills */}
          <div className="flex items-center gap-2">
            {/* FPS Pill */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-lg text-xs font-mono font-bold transition-colors ${getFpsColor(
                state.fps
              )}`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{state.fps} FPS</span>
            </div>

            {/* Coordinates & Speed */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-lg text-xs font-mono text-slate-200">
              <div className="flex items-center gap-1 text-slate-400">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  <strong className="text-white">{state.playerSpeed}</strong> m/s
                </span>
                {state.isSprinting && (
                  <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-sans font-bold">
                    SPRINT
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contextual Vehicle Interaction Prompt [F] */}
      {state.vehicleInteraction && (
        <div className="flex justify-center mb-3 pointer-events-auto">
          {state.vehicleInteraction.isDriving ? (
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900/95 to-emerald-950/90 border border-emerald-500/40 shadow-2xl backdrop-blur-xl animate-pulse">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-bold text-white tracking-wide">
                  {state.vehicleInteraction.vehicleName}
                </span>
              </div>
              <div className="h-4 w-px bg-white/20" />
              <div className="flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-black font-mono text-amber-300">
                  {state.vehicleInteraction.speedKmh} km/h
                </span>
              </div>
              <div className="h-4 w-px bg-white/20" />
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <kbd className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black font-mono text-xs shadow-md">
                  F
                </kbd>
                <span className="font-semibold text-amber-200">Get off</span>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:inline">• WASD to Drive • SPACE Handbrake</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-amber-500/50 shadow-2xl backdrop-blur-xl animate-bounce">
              <Car className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-semibold text-slate-200">
                Nearby: <strong className="text-amber-300 font-bold">{state.vehicleInteraction.vehicleName}</strong>
              </span>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black font-mono text-xs shadow-md transition-all">
                  F
                </kbd>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Get on
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Bar: Navigation Controls & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row items-end sm:items-end justify-between gap-3 w-full">
        {/* Controls Hint Card */}
        <div className="w-full sm:w-auto p-3.5 rounded-2xl bg-slate-900/85 backdrop-blur-xl border border-white/10 shadow-2xl">
          <div className="flex items-center gap-1.5 mb-2 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            <Navigation2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Navigation Controls</span>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 text-xs">
            {/* WASD */}
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {['W', 'A', 'S', 'D'].map((key) => (
                  <kbd
                    key={key}
                    className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] font-bold text-slate-200 shadow-sm"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
              <span className="text-slate-300 font-medium">Move</span>
            </div>

            <span className="hidden sm:inline text-slate-600">•</span>

            {/* Shift Sprint */}
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] font-bold text-slate-200 shadow-sm">
                Shift
              </kbd>
              <span className="text-slate-300 font-medium">Sprint (4.5m/s)</span>
            </div>

            <span className="hidden sm:inline text-slate-600">•</span>

            {/* Space Jump */}
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] font-bold text-slate-200 shadow-sm">
                Space
              </kbd>
              <span className="text-slate-300 font-medium">Jump</span>
            </div>

            <span className="hidden sm:inline text-slate-600">•</span>

            {/* Mouse Look & Drag */}
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] font-bold text-slate-200 shadow-sm">
                Mouse / Drag
              </kbd>
              <span className="text-slate-300 font-medium">Orbit Look</span>
            </div>

            <span className="hidden sm:inline text-slate-600">•</span>

            {/* Character C */}
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] font-bold text-slate-200 shadow-sm">
                C
              </kbd>
              <span className="text-slate-300 font-medium">Avatar</span>
            </div>

            <span className="hidden sm:inline text-slate-600">•</span>

            {/* Reset R */}
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] font-bold text-slate-200 shadow-sm">
                R
              </kbd>
              <span className="text-slate-300 font-medium">Reset Gate</span>
            </div>

            <span className="hidden sm:inline text-slate-600">•</span>

            {/* Toggle HUD H */}
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] font-bold text-slate-200 shadow-sm">
                H
              </kbd>
              <span className="text-slate-300 font-medium">Toggle HUD</span>
            </div>
          </div>
        </div>

        {/* Right Interactive Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Pointer Lock Status Toggle */}
          <button
            onClick={onRequestPointerLock}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold backdrop-blur-md border shadow-lg transition-all active:scale-95 cursor-pointer ${
              state.isPointerLocked
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900/80 text-slate-300 hover:text-white border-white/10 hover:border-white/20'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>
              {state.isPointerLocked ? 'Pointer Locked (ESC to free)' : 'Click to Lock Look'}
            </span>
          </button>

          {/* Reset Position Button */}
          <button
            onClick={onResetPosition}
            title="Reset position to Main Entrance Gate (R)"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 text-slate-200 hover:text-white border border-white/10 shadow-lg text-xs font-semibold backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Reset Gate (R)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
