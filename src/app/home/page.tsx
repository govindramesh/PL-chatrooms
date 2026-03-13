import { toggleFollowFixture } from "@/app/actions/fixtures";
import { FixtureTile } from "@/components/fixture-tile";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFixtureScore } from "@/lib/score";

export default async function HomePage() {
  const user = await requireUser();
  const now = new Date();

  const follows = await prisma.userFixtureFollow.findMany({
    where: { userId: user.id },
    select: { fixtureId: true },
  });
  const followedFixtureIds = follows.map((follow) => follow.fixtureId);
  const nextFixture = await prisma.fixture.findFirst({
    where: {
      kickoffAt: {
        gt: now,
      },
    },
    orderBy: {
      kickoffAt: "asc",
    },
    select: {
      gameweek: true,
    },
  });
  const gameweekToShow = nextFixture?.gameweek ?? null;

  const orFilters: Array<{ homeTeamId: number } | { awayTeamId: number } | { id: { in: string[] } }> = [
    { homeTeamId: user.favoriteTeamId },
    { awayTeamId: user.favoriteTeamId },
  ];

  if (followedFixtureIds.length > 0) {
    orFilters.push({ id: { in: followedFixtureIds } });
  }

  const fixtures = await prisma.fixture.findMany({
    where: {
      AND: [
        {
          OR: orFilters,
        },
        ...(gameweekToShow ? [{ gameweek: gameweekToShow }] : []),
        {
          OR: [
            { chatExpiresAt: null },
            { chatExpiresAt: { gt: new Date() } },
          ],
        },
      ],
    },
    include: {
      homeTeam: true,
      awayTeam: true,
      events: {
        select: {
          teamId: true,
          type: true,
        },
      },
      follows: {
        where: { userId: user.id },
        select: { userId: true },
      },
    },
    orderBy: { kickoffAt: "asc" },
    take: 30,
  });

  return (
    <div className="min-h-screen bg-slate-100">
      <SiteHeader user={user} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Your Home Feed</h1>
        <p className="mb-6 text-sm text-slate-600">
          Your team&apos;s matches are always shown here, plus fixtures you picked in Explore.
        </p>
        {gameweekToShow ? (
          <p className="mb-4 text-sm font-medium text-slate-700">Showing current gameweek: GW{gameweekToShow}</p>
        ) : null}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {fixtures.map((fixture) => {
            const isFavoriteFixture =
              fixture.homeTeamId === user.favoriteTeamId || fixture.awayTeamId === user.favoriteTeamId;
            const isFollowed = fixture.follows.length > 0;
            const { homeScore, awayScore } = getFixtureScore({
              status: fixture.status,
              homeTeamId: fixture.homeTeamId,
              awayTeamId: fixture.awayTeamId,
              events: fixture.events,
            });
            return (
              <FixtureTile
                key={fixture.id}
                fixtureId={fixture.id}
                gameweek={fixture.gameweek}
                kickoffAt={fixture.kickoffAt}
                status={fixture.status}
                homeScore={homeScore}
                awayScore={awayScore}
                homeTeam={fixture.homeTeam}
                awayTeam={fixture.awayTeam}
                openLabel="Open Chat Rooms"
                badges={
                  <>
                    {isFavoriteFixture ? (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        Your Team
                      </span>
                    ) : null}
                    {isFollowed ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Following
                      </span>
                    ) : null}
                  </>
                }
                actions={
                  <form action={toggleFollowFixture} className="w-full">
                    <input type="hidden" name="fixtureId" value={fixture.id} />
                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {isFollowed ? "Unfollow" : "Follow"}
                    </button>
                  </form>
                }
              />
            );
          })}
          {fixtures.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              No fixtures found yet. Visit Explore to follow matches.
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
