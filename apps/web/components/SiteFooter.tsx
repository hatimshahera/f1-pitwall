import { DISCLAIMER } from '@f1pitwall/shared';

/** Compact one-line footer: short disclaimer (full text on hover) + links. */
export function SiteFooter(): React.JSX.Element {
  return (
    <footer className="mx-auto flex w-full max-w-6xl shrink-0 flex-wrap items-center gap-x-2 px-4 pb-3 pt-1 text-[11px] text-[color:var(--muted)]">
      <span title={DISCLAIMER}>
        Unofficial project — not affiliated with F1. Data may be incomplete/delayed.
      </span>
      <span aria-hidden>·</span>
      <a className="underline" href="https://docs.fastf1.dev/" rel="noreferrer" target="_blank">
        FastF1
      </a>
      <span aria-hidden>·</span>
      <a
        className="underline"
        href="https://github.com/hatimshahera/f1-pitwall"
        rel="noreferrer"
        target="_blank"
      >
        GitHub
      </a>
      <span aria-hidden>·</span>
      <a
        className="underline"
        href="https://buymeacoffee.com/hatimshahera"
        rel="noreferrer"
        target="_blank"
      >
        ☕ Buy me a coffee
      </a>
    </footer>
  );
}
