import { getLatestReplay, getNextRace, getSeasonIndex } from '@/lib/data';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Dashboard } from '@/components/Dashboard';

// Re-read the generated JSON on each request in dev; statically cached in prod.
export const dynamic = 'force-static';

export default async function HomePage(): Promise<React.JSX.Element> {
  const [season, nextRace, latest] = await Promise.all([
    getSeasonIndex(),
    getNextRace(),
    getLatestReplay(),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-4">
        <Dashboard season={season} nextRace={nextRace} hasLatest={latest !== null} />
      </main>
      <SiteFooter />
    </>
  );
}
