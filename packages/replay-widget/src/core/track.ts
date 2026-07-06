import type { Point } from '@f1pitwall/shared';

export interface TrackRibbon {
  centerline: Point[];
  inner: Point[];
  outer: Point[];
}

/**
 * Build a track ribbon from a centerline (the racing line) by offsetting each
 * point along its perpendicular normal by ±width/2. This mirrors the reference
 * project's approach (tangent via central differences, normal = (-dy, dx)), but
 * runs on the client so the JSON only needs to carry the centerline + a width.
 */
export function buildTrackRibbon(points: Point[], width: number): TrackRibbon {
  const n = points.length;
  const half = width / 2;
  const inner: Point[] = new Array(n);
  const outer: Point[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const prev = points[Math.max(0, i - 1)]!;
    const next = points[Math.min(n - 1, i + 1)]!;
    let dx = next[0] - prev[0];
    let dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    // Left normal of the tangent.
    const nx = -dy;
    const ny = dx;
    const [px, py] = points[i]!;
    outer[i] = [px + nx * half, py + ny * half];
    inner[i] = [px - nx * half, py - ny * half];
  }

  return { centerline: points, inner, outer };
}
