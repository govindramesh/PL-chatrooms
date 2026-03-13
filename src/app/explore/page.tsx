import { toggleFollowFixture } from "@/app/actions/fixtures";
import { FixtureTile } from "@/components/fixture-tile";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth";
import { isFixtureExpired } from "@/lib/chat";
import { prisma } from "@/lib/prisma";
import { getFixtureScore } from "@/lib/score";

function plusHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export default async function ExplorePage() {
  const user = await requireUser();
  const now = new Date();
  const nowTs = now.getTime();

  const gameweekMaxKickoff = await prisma.fixture.groupBy({
    by: ["gameweek"],
    _max: {
      kickoffAt: true,
    },
    orderBy: {
      gameweek: "asc",
    },
  });

  const gameweekToShow =
    gameweekMaxKickoff.find(
      (entry) => entry._max.kickoffAt && plusHours(entry._max.kickoffAt, 24).getTime() > nowTs,
    )?.gameweek ?? null;

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

  const sortedFixtures = [...fixtures].sort((a, b) => {
    const aExpired = isFixtureExpired(a);
    const bExpired = isFixtureExpired(b);

    if (aExpired !== bExpired) {
      return aExpired ? 1 : -1;
    }

    return Math.abs(a.kickoffAt.getTime() - nowTs) - Math.abs(b.kickoffAt.getTime() - nowTs);
  });

  return (
    <div className="min-h-screen bg-slate-100">
      <SiteHeader user={user} activePage="explore" />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Explore Fixtures</h1>
        <p className="mb-6 text-sm text-slate-600">Follow a fixture to include it on your Home Feed</p>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedFixtures.map((fixture) => {
            const isFollowed = fixture.follows.length > 0;
            const expired = isFixtureExpired(fixture);
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
                isExpired={expired}
                badges={
                  <>
                    {expired ? (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                        Expired
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
                      className={`inline-flex w-full items-center justify-center rounded-md px-3 py-1.5 text-sm ${
                        expired
                          ? "cursor-not-allowed border border-slate-300 bg-slate-200 text-slate-500"
                          : isFollowed
                            ? "border border-slate-300 text-slate-700 hover:bg-slate-50"
                            : "bg-slate-900 text-white hover:bg-slate-700"
                      }`}
                      disabled={expired}
                    >
                      {isFollowed ? "Unfollow" : "Follow"}
                    </button>
                  </form>
                }
              />
            );
          })}
          {sortedFixtures.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              No fixtures available right now.
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
