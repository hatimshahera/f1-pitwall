import { useEffect, useRef } from 'react';
import type { Replay } from '@f1pitwall/shared';
import { createTransform, type Transform } from '../core/geometry';
import { sampleReplay } from '../core/interpolation';
import type { ReplayEngine } from '../engine/useReplayEngine';

export interface TrackCanvasProps {
  replay: Replay;
  engine: ReplayEngine;
  /** Show 3-letter driver codes next to markers. */
  showLabels?: boolean;
  /** Marker radius in px (before DPR scaling). */
  markerRadius?: number;
  /** Canvas background; transparent by default so the host controls it. */
  background?: string;
  className?: string;
}

const TRACK_COLOR_LIGHT = '#c8ccd2';
const TRACK_COLOR_DARK = '#3a3f47';

/**
 * Renders the track outline and animated car markers to a <canvas>. Drawing is
 * imperative and driven by the engine's subscription, so it runs at the display
 * refresh rate without triggering React re-renders.
 */
export function TrackCanvas({
  replay,
  engine,
  showLabels = true,
  markerRadius = 5,
  background,
  className,
}: TrackCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const transformRef = useRef<Transform | null>(null);

  // Keep the canvas backing store sized to its box * devicePixelRatio.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const applySize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      sizeRef.current = { width, height, dpr };
      transformRef.current = createTransform(replay.track.bounds, width, height, {
        rotation: replay.track.rotation ?? undefined,
      });
    };

    applySize();
    const observer = new ResizeObserver(applySize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [replay]);

  // Subscribe to the engine and draw each tick.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const driverColors = new Map(replay.drivers.map((d) => [d.driverNumber, d.color]));
    const driverCodes = new Map(replay.drivers.map((d) => [d.driverNumber, d.code]));

    const prefersDark =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const trackColor = prefersDark ? TRACK_COLOR_DARK : TRACK_COLOR_LIGHT;

    const draw = (time: number) => {
      const { width, height, dpr } = sizeRef.current;
      const transform = transformRef.current;
      if (!transform || width === 0) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
      }

      // Track outline (drawn every frame — a few hundred points is cheap).
      ctx.beginPath();
      const pts = replay.track.points;
      for (let i = 0; i < pts.length; i++) {
        const [sx, sy] = transform.project(pts[i]![0], pts[i]![1]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = trackColor;
      ctx.lineWidth = Math.max(2, transform.scale * 0.6);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      // Cars.
      const frame = sampleReplay(replay, time);
      for (const car of frame.cars) {
        if (car.status === 'RETIRED') continue;
        const [sx, sy] = transform.project(car.x, car.y);
        const color = driverColors.get(car.driverNumber) ?? '#9aa0a6';

        ctx.beginPath();
        ctx.arc(sx, sy, markerRadius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = prefersDark ? '#0b0d10' : '#ffffff';
        ctx.stroke();

        if (showLabels) {
          const code = driverCodes.get(car.driverNumber) ?? car.driverNumber;
          ctx.font = '600 10px system-ui, sans-serif';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = prefersDark ? '#e6e8eb' : '#1a1c1e';
          ctx.fillText(code, sx + markerRadius + 3, sy);
        }
      }
    };

    return engine.subscribe(draw);
  }, [replay, engine, showLabels, markerRadius, background]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
