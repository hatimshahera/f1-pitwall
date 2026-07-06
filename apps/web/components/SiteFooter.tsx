import { DISCLAIMER } from '@f1pitwall/shared';

/** Global footer carrying the mandatory disclaimer and project links. */
export function SiteFooter(): React.JSX.Element {
  return (
    <footer className="mx-auto mt-10 max-w-6xl px-4 pb-10 text-xs leading-relaxed text-[color:var(--muted)]">
      <p className="max-w-3xl">{DISCLAIMER}</p>
      <p className="mt-2">
        Data via{' '}
        <a className="underline" href="https://docs.fastf1.dev/" rel="noreferrer" target="_blank">
          FastF1
        </a>
        . Open-source portfolio project ·{' '}
        <a
          className="underline"
          href="https://github.com/hatimshahera/f1-pitwall"
          rel="noreferrer"
          target="_blank"
        >
          source on GitHub
        </a>
        .
      </p>
    </footer>
  );
}
