import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { SandboxHUD } from './components/SandboxHUD';
import { GameState } from './types/game';
import { Loader2 } from 'lucide-react';

const INITIAL_GAME_STATE: GameState = {
  fps: 60,
  currentZone: 'Main Entrance Gate & Bus Bay',
  zoneDescription: 'Sandstone Monument, CVR Medallion, Wrought-Iron Gates & North Bus Bay',
  playerPosition: { x: 25, y: 1.5, z: -168 },
  playerRotationY: 0,
  playerSpeed: 0,
  isSprinting: false,
  isGrounded: true,
  isPointerLocked: false,
};

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isHudVisible, setIsHudVisible] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyH') {
        setIsHudVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    (window as unknown as { __toggleHUD?: (show?: boolean) => void }).__toggleHUD = (show?: boolean) => {
      setIsHudVisible((prev) => (show !== undefined ? show : !prev));
    };

    const engine = new GameEngine(canvas);
    engineRef.current = engine;

    const setupEngine = async () => {
      try {
        await engine.init();
        if (!isMounted) {
          engine.dispose();
          return;
        }

        engine.onStateUpdate((newState) => {
          if (isMounted) {
            setGameState(newState);
          }
        });

        engine.start();
        setIsLoading(false);
        (window as unknown as { __gameEngine?: GameEngine }).__gameEngine = engine;

        // Expose debug camera positioning helper for verification views
        (window as unknown as { __setCameraView?: unknown }).__setCameraView = (
          camTheta: number,
          camPhi: number,
          camDistance: number,
          playerPos?: { x: number; y: number; z: number; facingAngle?: number }
        ) => {
          if (playerPos) {
            engine.teleportPlayer(playerPos.x, playerPos.y, playerPos.z, playerPos.facingAngle);
            const target = { x: playerPos.x, y: playerPos.y + 1.35, z: playerPos.z };
            engine.cameraController.snapView(camTheta, camPhi, camDistance, target);
          }
        };
      } catch (err: unknown) {
        console.error('Failed to initialize CVR Campus 3D Sandbox:', err);
        if (isMounted) {
          setLoadingError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      }
    };

    setupEngine();

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleResetPosition = useCallback(() => {
    engineRef.current?.resetPlayerPosition();
  }, []);

  const handleRequestPointerLock = useCallback(() => {
    engineRef.current?.requestPointerLock();
  }, []);

  const handleTeleport = useCallback((x: number, y: number, z: number) => {
    engineRef.current?.teleportPlayer(x, y, z);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleRequestPointerLock}
        className="w-full h-full block cursor-grab active:cursor-grabbing outline-none"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-white z-50">
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
            <div className="text-center">
              <h2 className="text-lg font-bold tracking-tight text-white">
                CVR Campus 3D Sandbox • Milestone 2
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Compiling 380m CVR Campus Map, Signature Gate & Rapier Physics...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Fallback */}
      {loadingError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/95 text-white z-50 p-6">
          <div className="max-w-md p-6 rounded-2xl bg-rose-950/50 border border-rose-800 text-center">
            <h3 className="text-lg font-bold text-rose-300">
              Initialization Failed
            </h3>
            <p className="text-xs text-rose-200 mt-2 font-mono">{loadingError}</p>
          </div>
        </div>
      )}

      {/* Minimalist HUD Overlay */}
      {!isLoading && !loadingError && isHudVisible && (
        <SandboxHUD
          state={gameState}
          onResetPosition={handleResetPosition}
          onRequestPointerLock={handleRequestPointerLock}
          onTeleport={handleTeleport}
        />
      )}
    </div>
  );
};

export default App;
