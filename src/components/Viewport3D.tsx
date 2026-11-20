import { useEffect, useRef } from 'react';
import { CodingWorld3D } from '../game/scene3d';
import { ChapterTheme, LevelData, TraceStep } from '../game/types';

interface Viewport3DProps {
  level: LevelData;
  theme: ChapterTheme;
  idleDemo?: boolean;
  activeStep: TraceStep | null;
  stepDurationSec: number;
  resetSignal: number;
  cameraResetSignal: number;
}

export function Viewport3D({
  level,
  theme,
  idleDemo = false,
  activeStep,
  stepDurationSec,
  resetSignal,
  cameraResetSignal,
}: Viewport3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<CodingWorld3D | null>(null);

  // Mount Three.js engine once in isolated container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const world = new CodingWorld3D(el);
    worldRef.current = world;

    const ro = new ResizeObserver(() => {
      world.resize();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      world.dispose();
      worldRef.current = null;
    };
  }, []);

  // Load level & theme whenever they change
  useEffect(() => {
    worldRef.current?.loadLevel(level, theme, idleDemo);
  }, [level, theme, idleDemo]);

  // Reset robot & gems
  useEffect(() => {
    if (resetSignal > 0) {
      worldRef.current?.resetRobotToStart();
    }
  }, [resetSignal]);

  // Reset camera angle
  useEffect(() => {
    if (cameraResetSignal > 0) {
      worldRef.current?.resetCamera(false);
    }
  }, [cameraResetSignal]);

  // Play active trace step animation
  useEffect(() => {
    if (activeStep) {
      worldRef.current?.playStep(activeStep, stepDurationSec);
    }
  }, [activeStep, stepDurationSec]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-slate-950"
      aria-label="3D 로봇 탐험 맵"
    />
  );
}
