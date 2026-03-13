import { ChatRoomType } from "@prisma/client";
import { notFound } from "next/navigation";

import { ChatPanel } from "@/components/chat-panel";
import { SiteHeader } from "@/components/site-header";
import { TeamLogo } from "@/components/team-logo";
import { requireUser } from "@/lib/auth";
import { isFixtureExpired } from "@/lib/chat";
import { formatKickoff } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getFixtureScore } from "@/lib/score";

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ fixtureId: string }>;
  searchParams: Promise<{ room?: string }>;
}) {
  const user = await requireUser();
  const { fixtureId } = await params;
  const { room: roomFromQuery } = await searchParams;

  const fixture = await prisma.fixture.findUnique({
    where: { id: fixtureId },
    include: {
      homeTeam: true,
      awayTeam: true,
      events: {
        select: {
          teamId: true,
          type: true,
        },
      },
      rooms: {
        orderBy: [{ roomType: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!fixture) {
    notFound();
  }

  const isExpired = isFixtureExpired(fixture);
  const { homeScore, awayScore } = getFixtureScore({
    status: fixture.status,
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    events: fixture.events,
  });

  const generalRoom = fixture.rooms.find((room) => room.roomType === ChatRoomType.GENERAL) ?? null;
  const supportersRoom = fixture.rooms.find(
    (room) => room.roomType === ChatRoomType.TEAM && room.teamId === user.favoriteTeamId,
  );
  const selectedRoom =
    roomFromQuery && supportersRoom && roomFromQuery === supportersRoom.id ? supportersRoom : generalRoom;

  const roomSummaries = selectedRoom
    ? [
        {
          id: selectedRoom.id,
          roomType: selectedRoom.roomType,
          teamId: selectedRoom.teamId,
          label: selectedRoom.roomType === ChatRoomType.GENERAL ? "Match" : `${user.favoriteTeam.shortName} Fans`,
          teamName: selectedRoom.roomType === ChatRoomType.TEAM ? user.favoriteTeam.name : undefined,
          teamShortName: selectedRoom.roomType === ChatRoomType.TEAM ? user.favoriteTeam.shortName : undefined,
        },
      ]
    : [];

  const initialRoomId = roomSummaries[0]?.id ?? "";

  return (
    <div className="min-h-screen bg-slate-100">
      <SiteHeader user={user} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="grid w-full max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="flex min-w-0 flex-col items-center gap-2">
                <TeamLogo shortName={fixture.homeTeam.shortName} teamName={fixture.homeTeam.name} size="lg" />
                <div>
                  <p className="text-lg font-bold text-slate-900">{fixture.homeTeam.name}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{fixture.homeTeam.shortName}</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Gameweek {fixture.gameweek}
                </p>
                <div className="rounded-2xl bg-slate-900 px-5 py-3 text-center text-white shadow-sm">
                  <p className="text-3xl font-black leading-none">
                    {homeScore ?? "-"} <span className="px-1 text-slate-400">-</span> {awayScore ?? "-"}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                    {fixture.status}
                  </p>
                </div>
                <h1 className="text-xl font-semibold text-slate-900">
                  {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                </h1>
              </div>

              <div className="flex min-w-0 flex-col items-center gap-2">
                <TeamLogo shortName={fixture.awayTeam.shortName} teamName={fixture.awayTeam.name} size="lg" />
                <div>
                  <p className="text-lg font-bold text-slate-900">{fixture.awayTeam.name}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{fixture.awayTeam.shortName}</p>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-sm text-slate-600">{formatKickoff(fixture.kickoffAt)}</p>
        </section>

        {isExpired ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            This fixture chat expired 24 hours after kickoff and is no longer available.
          </section>
        ) : roomSummaries.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No accessible chat rooms for your profile.
          </section>
        ) : (
          <ChatPanel
            fixtureId={fixture.id}
            rooms={roomSummaries}
            initialRoomId={initialRoomId}
            allowSimulateEvents={process.env.NODE_ENV !== "production"}
          />
        )}
      </main>
    </div>
  );
}
