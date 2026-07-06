import type { Bounds } from '@f1pitwall/shared';

/**
 * A precomputed world→screen transform for drawing a track and cars on a
 * canvas. It fits the track's world bounds into the canvas with a uniform
 * (aspect-preserving) scale, centers it, flips the Y axis (world +Y is "up",
 * canvas +Y is "down"), and optionally rotates the circuit for nicer framing.
 *
 * This is intentionally pure and framework-agnostic so it can be unit-tested.
 */
export interface Transform {
  project(x: number, y: number): [number, number];
  /** Uniform pixels-per-world-unit scale (useful for sizing markers/lines). */
  scale: number;
}

interface TransformOptions {
  padding?: number;
  /** Rotation in radians, applied about the world-bounds center. */
  rotation?: number;
}

/** Rotate `(x, y)` about the origin by `rotation` radians. */
function rotatePoint(x: number, y: number, cos: number, sin: number): [number, number] {
  return [x * cos - y * sin, x * sin + y * cos];
}

export function createTransform(
  bounds: Bounds,
  canvasWidth: number,
  canvasHeight: number,
  options: TransformOptions = {},
): Transform {
  const padding = options.padding ?? 24;
  const rotation = options.rotation ?? 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;

  // Rotate the four corners about the center to get the rotated extent.
  const corners: Array<[number, number]> = [
    [bounds.minX - cx, bounds.minY - cy],
    [bounds.maxX - cx, bounds.minY - cy],
    [bounds.maxX - cx, bounds.maxY - cy],
    [bounds.minX - cx, bounds.maxY - cy],
  ];
  let rMinX = Infinity;
  let rMaxX = -Infinity;
  let rMinY = Infinity;
  let rMaxY = -Infinity;
  for (const [x, y] of corners) {
    const [rx, ry] = rotatePoint(x, y, cos, sin);
    rMinX = Math.min(rMinX, rx);
    rMaxX = Math.max(rMaxX, rx);
    rMinY = Math.min(rMinY, ry);
    rMaxY = Math.max(rMaxY, ry);
  }

  const worldW = rMaxX - rMinX || 1;
  const worldH = rMaxY - rMinY || 1;
  const usableW = Math.max(canvasWidth - padding * 2, 1);
  const usableH = Math.max(canvasHeight - padding * 2, 1);
  const scale = Math.min(usableW / worldW, usableH / worldH);

  // Center the fitted content within the canvas.
  const drawW = worldW * scale;
  const drawH = worldH * scale;
  const offsetX = (canvasWidth - drawW) / 2;
  const offsetY = (canvasHeight - drawH) / 2;

  return {
    scale,
    project(x: number, y: number): [number, number] {
      const [rx, ry] = rotatePoint(x - cx, y - cy, cos, sin);
      const sx = offsetX + (rx - rMinX) * scale;
      // Flip Y: larger world-Y maps to smaller screen-Y.
      const sy = offsetY + (rMaxY - ry) * scale;
      return [sx, sy];
    },
  };
}
