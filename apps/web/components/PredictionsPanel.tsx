'use client';

import { useEffect, useState } from 'react';
import { validatePredictions, type Predictions } from '@f1pitwall/shared';

/**
 * Experimental podium predictions. The pipeline lands in Phase 3; until then
 * this fetches /data/predictions/next.json and shows an honest empty state.
 */
export function PredictionsPanel(): React.JSX.Element {
  const [predictions, setPredictions] = useState<Predictions | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/data/predictions/next.json', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json: unknown) => {
        const result = validatePredictions(json);
        if (result.ok) setPredictions(result.data);
      })
      .catch(() => setPredictions(null));
    return () => controller.abort();
  }, []);

  return (
    <section className="panel p-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
          Experimental predictions
        </h2>
        <span className="rounded-full border border-[color:var(--accent)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[color:var(--accent)]">
          Experimental
        </span>
      </div>

      {!predictions ? (
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Podium predictions are not published yet. The prediction pipeline is under active
          development (Phase 3).
        </p>
      ) : (
        <ol className="mt-3 space-y-1">
          {predictions.drivers
            .slice()
            .sort((a, b) => a.predictedRank - b.predictedRank)
            .slice(0, 5)
            .map((d) => (
              <li key={d.driverNumber} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-right text-[color:var(--muted)]">{d.predictedRank}</span>
                <span className="font-semibold">{d.code}</span>
                <span className="flex-1 text-[color:var(--muted)]">{d.team}</span>
                <span className="tabular-nums">{Math.round(d.podiumProbability * 100)}%</span>
              </li>
            ))}
        </ol>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-[color:var(--muted)]">
        Predictions are experimental. F1 outcomes are noisy; this is a portfolio/learning project,
        not betting advice.
      </p>
    </section>
  );
}
