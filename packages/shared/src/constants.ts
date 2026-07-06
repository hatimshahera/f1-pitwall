/**
 * Shared, framework-agnostic constants for the f1-pitwall data contracts.
 */

/**
 * The schema version embedded in every generated JSON file. Bump the MAJOR
 * component only for breaking changes to the contract so consumers (dashboard,
 * widget, external sites) can detect incompatibility instead of mis-rendering.
 *
 * 2.0 — replay uses a structure-of-arrays encoding (per-driver typed arrays)
 *       so real full-race replays ship efficiently. See docs/data-contract.md.
 */
export const SCHEMA_VERSION = '2.0' as const;

/**
 * The single canonical disclaimer. Kept here so the pipeline, dashboard footer,
 * widget, and exported JSON all use identical wording.
 */
export const DISCLAIMER =
  'This is an unofficial educational/portfolio project. It is not affiliated with ' +
  'Formula 1, FIA, Formula One Management, teams, drivers, or official broadcasters. ' +
  'Data comes from public/unofficial sources and may be incomplete or delayed.';

/** Session codes we support. Phase 1 targets the Race ("R") only. */
export const SESSION_CODES = ['R', 'Q', 'S', 'SQ', 'FP1', 'FP2', 'FP3'] as const;

/** Car running states used in replay frames. */
export const CAR_STATUSES = ['RUNNING', 'IN_PIT', 'RETIRED', 'FINISHED', 'UNKNOWN'] as const;

/** Tyre compounds. `null` when the source data does not expose it. */
export const TYRE_COMPOUNDS = ['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET', 'UNKNOWN'] as const;

/** Fallback marker colour when a driver/team colour is unavailable. */
export const DEFAULT_DRIVER_COLOR = '#9aa0a6';
