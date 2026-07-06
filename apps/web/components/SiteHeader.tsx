/** Top bar with the project name and a compact "unofficial" badge. */
export function SiteHeader(): React.JSX.Element {
  return (
    <header className="mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between px-4 pb-2 pt-4">
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold tracking-tight">
          f1<span className="text-[color:var(--accent)]">·</span>pitwall
        </span>
        <span className="text-sm text-[color:var(--muted)]">race replay</span>
      </div>
      <span className="rounded-full border border-[color:var(--border)] px-3 py-1 text-[11px] uppercase tracking-wide text-[color:var(--muted)]">
        Unofficial · public data
      </span>
    </header>
  );
}
