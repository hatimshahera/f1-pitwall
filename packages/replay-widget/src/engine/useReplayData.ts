import { useEffect, useState } from 'react';
import { validateReplay, type Replay } from '@f1pitwall/shared';

export type AsyncState<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'error'; data: null; error: string }
  | { status: 'empty'; data: null; error: null }
  | { status: 'ready'; data: T; error: null };

/**
 * Fetch a replay JSON document from `url`, validate it against the shared
 * contract, and expose an explicit loading/error/empty/ready state so callers
 * never render unvalidated data. `url` may be null to stay idle.
 */
export function useReplayData(url: string | null): AsyncState<Replay> {
  const [state, setState] = useState<AsyncState<Replay>>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!url) {
      setState({ status: 'empty', data: null, error: null });
      return;
    }

    const controller = new AbortController();
    setState({ status: 'loading', data: null, error: null });

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
        const json: unknown = await res.json();
        const result = validateReplay(json);
        if (!result.ok) {
          throw new Error(`Invalid replay data: ${result.errors.slice(0, 3).join('; ')}`);
        }
        setState({ status: 'ready', data: result.data, error: null });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Unknown error loading replay';
        setState({ status: 'error', data: null, error: message });
      });

    return () => controller.abort();
  }, [url]);

  return state;
}
