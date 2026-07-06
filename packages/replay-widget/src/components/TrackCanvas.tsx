import { useEffect, useRef } from 'react';
import type { Point, Replay } from '@f1pitwall/shared';
import { createTransform, type Transform } from '../core/geometry';
import { sampleReplay } from '../core/interpolation';
import { buildTrackRibbon, type TrackRibbon } from '../core/track';
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

interface Theme {
  surface: string;
  edge: string;
  markerStroke: string;
  label: string;
  finish: string;
}

const LIGHT: Theme = {
  surface: '#e9ebef',
  edge: '#b6bcc4',
  markerStroke: '#ffffff',
  label: '#1a1c1e',
  finish: '#8a9099',
};
const DARK: Theme = {
  surface: '#23262b',
  edge: '#3a3f47',
  markerStroke: '#0b0d10',
  label: '#e6e8eb',
  finish: '#6b7280',
};

/**
 * Renders the track (a filled ribbon built from the racing line, plus a
 * start/finish line) and animated car markers to a <canvas>. Drawing is
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
  const ribbonRef = useRef<TrackRibbon | null>(null);

  // Keep the canvas backing store sized to its box * devicePixelRatio, and keep
  // the world→screen transform and track ribbon in sync with the replay/size.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    ribbonRef.current = buildTrackRibbon(replay.track.points, replay.track.width);

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
        padding: 28,
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
    const theme = prefersDark ? DARK : LIGHT;

    const projectPath = (transform: Transform, pts: Point[]) => {
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const [sx, sy] = transform.project(pts[i]![0], pts[i]![1]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
    };

    const drawTrack = (transform: Transform, ribbon: TrackRibbon) => {
      // Filled surface: outer forward, inner reversed → closed polygon.
      ctx.beginPath();
      ribbon.outer.forEach((p, i) => {
        const [sx, sy] = transform.project(p[0], p[1]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      for (let i = ribbon.inner.length - 1; i >= 0; i--) {
        const [sx, sy] = transform.project(ribbon.inner[i]![0], ribbon.inner[i]![1]);
        ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fillStyle = theme.surface;
      ctx.fill();

      // Stroked edges.
      ctx.strokeStyle = theme.edge;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      projectPath(transform, ribbon.outer);
      ctx.stroke();
      projectPath(transform, ribbon.inner);
      ctx.stroke();

      // Start/finish line at index 0 (inner[0] → outer[0]).
      const [ix, iy] = transform.project(ribbon.inner[0]![0], ribbon.inner[0]![1]);
      const [ox, oy] = transform.project(ribbon.outer[0]![0], ribbon.outer[0]![1]);
      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.lineTo(ox, oy);
      ctx.strokeStyle = theme.finish;
      ctx.lineWidth = 3;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const draw = (time: number) => {
      const { width, height, dpr } = sizeRef.current;
      const transform = transformRef.current;
      const ribbon = ribbonRef.current;
      if (!transform || !ribbon || width === 0) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
      }

      drawTrack(transform, ribbon);

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
        ctx.strokeStyle = theme.markerStroke;
        ctx.stroke();

        if (showLabels) {
          const code = driverCodes.get(car.driverNumber) ?? car.driverNumber;
          ctx.font = '600 10px system-ui, sans-serif';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = theme.label;
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
