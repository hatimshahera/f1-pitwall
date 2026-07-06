import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Replay } from '@f1pitwall/shared';
import { replayDuration } from '../core/interpolation';

export interface ReplayEngineOptions {
  autoplay?: boolean;
  /** Initial playback speed multiplier. */
  initialSpeed?: number;
  /** Restart from the beginning when the end is reached (widget autoplay). */
  loop?: boolean;
}

/**
 * The public engine handle. `subscribe` lets the canvas and clock read the
 * high-frequency playback time without forcing React re-renders; `isPlaying`
 * and `speed` are low-frequency React state for the controls UI.
 */
export interface ReplayEngine {
  isPlaying: boolean;
  speed: number;
  durationSec: number;
  play(): void;
  pause(): void;
  toggle(): void;
  restart(): void;
  setSpeed(speed: number): void;
  /** Seek to an absolute time (seconds), clamped to [0, duration]. */
  seek(time: number): void;
  /** Jump by a relative offset in seconds (negative = rewind). */
  skip(deltaSec: number): void;
  /** Subscribe to time updates; returns an unsubscribe function. */
  subscribe(listener: (time: number) => void): () => void;
  getTime(): number;
}

/**
 * Drives replay playback with a single requestAnimationFrame loop. The
 * authoritative time lives in a ref (not React state) so 60fps updates never
 * trigger reconciliation — subscribers redraw imperatively instead.
 */
export function useReplayEngine(
  replay: Replay | null,
  options: ReplayEngineOptions = {},
): ReplayEngine {
  const durationSec = useMemo(() => (replay ? replayDuration(replay) : 0), [replay]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(options.initialSpeed ?? 1);

  const timeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const speedRef = useRef(options.initialSpeed ?? 1);
  const loopRef = useRef(options.loop ?? false);
  const durationRef = useRef(durationSec);
  const listenersRef = useRef(new Set<(time: number) => void>());
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  durationRef.current = durationSec;
  loopRef.current = options.loop ?? false;

  const notify = useCallback(() => {
    for (const listener of listenersRef.current) listener(timeRef.current);
  }, []);

  const setTime = useCallback(
    (time: number) => {
      const clamped = Math.min(Math.max(time, 0), durationRef.current);
      timeRef.current = clamped;
      notify();
    },
    [notify],
  );

  // The animation loop. Runs while mounted; only advances time when playing.
  useEffect(() => {
    const tick = (ts: number) => {
      const last = lastTsRef.current;
      lastTsRef.current = ts;
      if (isPlayingRef.current && last !== null) {
        const dtSec = ((ts - last) / 1000) * speedRef.current;
        let next = timeRef.current + dtSec;
        if (next >= durationRef.current) {
          if (loopRef.current) {
            next = 0;
          } else {
            next = durationRef.current;
            isPlayingRef.current = false;
            setIsPlaying(false);
          }
        }
        timeRef.current = next;
        notify();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [notify]);

  // Reset to the start whenever a new replay is loaded.
  useEffect(() => {
    timeRef.current = 0;
    notify();
    if (options.autoplay && replay) {
      isPlayingRef.current = true;
      setIsPlaying(true);
    } else {
      isPlayingRef.current = false;
      setIsPlaying(false);
    }
    lastTsRef.current = null;
  }, [replay, options.autoplay, notify]);

  const play = useCallback(() => {
    if (durationRef.current <= 0) return;
    if (timeRef.current >= durationRef.current) timeRef.current = 0;
    lastTsRef.current = null;
    isPlayingRef.current = true;
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlayingRef.current) pause();
    else play();
  }, [play, pause]);

  const restart = useCallback(() => {
    setTime(0);
    lastTsRef.current = null;
  }, [setTime]);

  const setSpeed = useCallback((next: number) => {
    speedRef.current = next;
    setSpeedState(next);
  }, []);

  const seek = useCallback((time: number) => setTime(time), [setTime]);
  const skip = useCallback((delta: number) => setTime(timeRef.current + delta), [setTime]);

  const subscribe = useCallback((listener: (time: number) => void) => {
    listenersRef.current.add(listener);
    listener(timeRef.current);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const getTime = useCallback(() => timeRef.current, []);

  return useMemo(
    () => ({
      isPlaying,
      speed,
      durationSec,
      play,
      pause,
      toggle,
      restart,
      setSpeed,
      seek,
      skip,
      subscribe,
      getTime,
    }),
    [
      isPlaying,
      speed,
      durationSec,
      play,
      pause,
      toggle,
      restart,
      setSpeed,
      seek,
      skip,
      subscribe,
      getTime,
    ],
  );
}

/**
 * Subscribe to the engine and expose the current time as React state, throttled
 * to `fps` updates per second. Use this for the clock and leaderboard, which
 * need to re-render but not at the full animation frame rate.
 */
export function useEngineTime(engine: ReplayEngine, fps = 12): number {
  const [time, setTime] = useState(0);
  const minInterval = 1000 / fps;

  useEffect(() => {
    let lastEmit = 0;
    return engine.subscribe((t) => {
      const wc = typeof performance !== 'undefined' ? performance.now() : 0;
      // Emit at most `fps` times/sec, but always emit the exact endpoints so the
      // clock and leaderboard settle correctly on pause/restart/seek-to-end.
      if (wc - lastEmit >= minInterval || t === 0 || t === engine.durationSec) {
        lastEmit = wc;
        setTime(t);
      }
    });
  }, [engine, minInterval]);

  return time;
}
