/**
 * @f1pitwall/shared — the single source of truth for f1-pitwall data contracts.
 *
 * Everything exported here is consumed by both the dashboard (apps/web) and the
 * reusable replay widget. The Python pipeline mirrors these shapes with pydantic
 * and validates against them on export, so the contract is enforced end-to-end.
 */

export * from './constants';
export * from './schemas/common';
export * from './schemas/replay';
export * from './schemas/season';
export * from './schemas/nextRace';
export * from './schemas/predictions';
export * from './validate';
