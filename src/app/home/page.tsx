import { toggleFollowFixture } from "@/app/actions/fixtures";
import { FixtureTile } from "@/components/fixture-tile";
import { SiteHeader } from "@/components/site-header";
import { TeamLogo } from "@/components/team-logo";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFixtureScore } from "@/lib/score";
import { getTeamBrand } from "@/lib/team-brand";

function plusHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export default async function HomePage() {
  const user = await requireUser();
  const now = new Date();
  const nowTs = now.getTime();

  const follows = await prisma.userFixtureFollow.findMany({
    where: { userId: user.id },
    select: { fixtureId: true },
  });
  const followedFixtureIds = follows.map((follow) => follow.fixtureId);

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
  const hasFavoriteTeam = user.favoriteTeamId !== 0;

  const orFilters: Array<{ homeTeamId: number } | { awayTeamId: number } | { id: { in: string[] } }> = [
    ...(hasFavoriteTeam ? [{ homeTeamId: user.favoriteTeamId }, { awayTeamId: user.favoriteTeamId }] : []),
  ];

  if (followedFixtureIds.length > 0) {
    orFilters.push({ id: { in: followedFixtureIds } });
  }

  const fixtures =
    orFilters.length === 0
      ? []
      : await prisma.fixture.findMany({
          where: {
            AND: [
              {
                OR: orFilters,
              },
              ...(gameweekToShow ? [{ gameweek: gameweekToShow }] : []),
              {
                OR: [{ chatExpiresAt: null }, { chatExpiresAt: { gt: now } }],
              },
            ],
          },
          include: {
            homeTeam: true,
            awayTeam: true,
            rooms: {
              where: {
                roomType: "TEAM",
                teamId: hasFavoriteTeam ? user.favoriteTeamId : -1,
              },
              select: {
                id: true,
              },
            },
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

  const supportersFixture = fixtures.find(
    (fixture) => fixture.homeTeamId === user.favoriteTeamId || fixture.awayTeamId === user.favoriteTeamId,
  );
  const supportersRoomId = supportersFixture?.rooms[0]?.id ?? null;
  const teamBrand = getTeamBrand(user.favoriteTeam.shortName);

  return (
    <div className="min-h-screen bg-slate-100">
      <SiteHeader user={user} activePage="home" />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Home Feed</h1>
        <p className="mb-6 text-sm text-slate-600">Check explore page for additional fixtures</p>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {hasFavoriteTeam ? (
            <article
              className="relative overflow-hidden rounded-2xl border bg-white shadow-sm"
              style={{ borderColor: teamBrand.secondary }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{
                  background: `linear-gradient(120deg, ${teamBrand.primary}, ${teamBrand.secondary})`,
                }}
              />
              <div className="relative flex h-full flex-col p-4">
                <div className="mb-4 flex flex-1 flex-col items-center justify-center gap-3 text-center">
                  <TeamLogo
                    shortName={user.favoriteTeam.shortName}
                    teamName={user.favoriteTeam.name}
                    size="lg"
                  />
                  <p className="text-base font-bold text-slate-900">{user.favoriteTeam.name} Supporters</p>
                </div>
                {supportersFixture && supportersRoomId ? (
                  <a
                    href={`/match/${supportersFixture.id}?room=${supportersRoomId}`}
                    className="inline-flex w-full items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-white"
                    style={{ backgroundColor: teamBrand.primary }}
                  >
                    Open Chat
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-md bg-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600"
                  >
                    Open Chat
                  </button>
                )}
              </div>
            </article>
          ) : null}
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
                badges={
                  <>
                    {hasFavoriteTeam && isFavoriteFixture ? (
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
