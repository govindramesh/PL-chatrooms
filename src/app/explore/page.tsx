import { toggleFollowFixture } from "@/app/actions/fixtures";
import { FixtureTile } from "@/components/fixture-tile";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFixtureScore } from "@/lib/score";

export default async function ExplorePage() {
  const user = await requireUser();
  const now = new Date();
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

  const fixtures = await prisma.fixture.findMany({
    where: {
      ...(gameweekToShow ? { gameweek: gameweekToShow } : {}),
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
        where: {
          userId: user.id,
        },
        select: {
          userId: true,
        },
      },
    },
    orderBy: [{ gameweek: "asc" }, { kickoffAt: "asc" }],
    take: 60,
  });

  return (
    <div className="min-h-screen bg-slate-100">
      <SiteHeader user={user} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Explore Fixtures</h1>
        <p className="mb-6 text-sm text-slate-600">
          Follow any fixtures to include them on Home. Your team fixture is always included there.
        </p>
        {gameweekToShow ? (
          <p className="mb-4 text-sm font-medium text-slate-700">Showing next upcoming gameweek: GW{gameweekToShow}</p>
        ) : null}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {fixtures.map((fixture) => {
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
                badges={
                  isFollowed ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Following
                    </span>
                  ) : undefined
                }
                actions={
                  <form action={toggleFollowFixture} className="w-full">
                    <input type="hidden" name="fixtureId" value={fixture.id} />
                    <button
                      type="submit"
                      className={`inline-flex w-full items-center justify-center rounded-md px-3 py-1.5 text-sm ${
                        isFollowed
                          ? "border border-slate-300 text-slate-700 hover:bg-slate-50"
                          : "bg-slate-900 text-white hover:bg-slate-700"
                      }`}
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
              No fixtures available right now.
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
