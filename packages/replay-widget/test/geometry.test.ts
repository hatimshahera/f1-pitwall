import { describe, expect, it } from 'vitest';
import { createTransform } from '../src/core/geometry.js';

const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };

describe('createTransform', () => {
  it('fits a square track into a square canvas with padding', () => {
    const t = createTransform(bounds, 200, 200, { padding: 20 });
    // Usable area is 160x160 for a 100x100 world → scale 1.6.
    expect(t.scale).toBeCloseTo(1.6, 5);
  });

  it('flips the Y axis (world top maps to screen top)', () => {
    const t = createTransform(bounds, 200, 200, { padding: 0 });
    const [, topScreenY] = t.project(0, 100); // world max-Y
    const [, bottomScreenY] = t.project(0, 0); // world min-Y
    expect(topScreenY).toBeLessThan(bottomScreenY);
  });

  it('preserves aspect ratio for a wide canvas (centers horizontally)', () => {
    const t = createTransform(bounds, 400, 200, { padding: 0 });
    // Height-constrained: scale = 200/100 = 2. Content width = 200, centered in
    // 400 → left offset 100. World (0,*) maps to screen x = 100.
    expect(t.scale).toBeCloseTo(2, 5);
    const [x] = t.project(0, 50);
    expect(x).toBeCloseTo(100, 5);
  });

  it('keeps projected points within the canvas', () => {
    const t = createTransform(bounds, 300, 180, { padding: 12 });
    for (const [wx, wy] of [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
      [50, 50],
    ] as const) {
      const [x, y] = t.project(wx, wy);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(300);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(180);
    }
  });

  it('handles a 90-degree rotation without leaving the canvas', () => {
    const t = createTransform({ minX: 0, maxX: 200, minY: 0, maxY: 100 }, 300, 300, {
      padding: 10,
      rotation: Math.PI / 2,
    });
    const [x, y] = t.project(100, 50); // world center → canvas center
    expect(x).toBeCloseTo(150, 0);
    expect(y).toBeCloseTo(150, 0);
  });
});
