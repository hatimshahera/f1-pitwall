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
    <div className="flex min-h-[100dvh] flex-col lg:h-[100dvh] lg:overflow-hidden">
      <SiteHeader />
      <main className="mx-auto w-full min-h-0 max-w-6xl flex-1 px-4 pb-2">
        <Dashboard season={season} nextRace={nextRace} hasLatest={latest !== null} />
      </main>
      <SiteFooter />
    </div>
  );
}
