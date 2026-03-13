import { ChatRoomType } from "@prisma/client";
import { notFound } from "next/navigation";

import { ChatPanel } from "@/components/chat-panel";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth";
import { canUserAccessRoom, isFixtureExpired } from "@/lib/chat";
import { formatKickoff } from "@/lib/format";
import { prisma } from "@/lib/prisma";

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
      rooms: {
        orderBy: [{ roomType: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!fixture) {
    notFound();
  }

  const isExpired = isFixtureExpired(fixture);
  const roomSummaries = fixture.rooms
    .filter((room) => canUserAccessRoom(room, user.favoriteTeamId))
    .map((room) => {
      if (room.roomType === ChatRoomType.GENERAL) {
        return { id: room.id, roomType: room.roomType, teamId: null, label: "General" as const };
      }

      const label =
        room.teamId === fixture.homeTeamId ? `${fixture.homeTeam.shortName} Fans` : `${fixture.awayTeam.shortName} Fans`;
      return { id: room.id, roomType: room.roomType, teamId: room.teamId, label };
    });

  const initialRoomId =
    roomSummaries.find((entry) => entry.id === roomFromQuery)?.id ?? roomSummaries[0]?.id ?? "";

  return (
    <div className="min-h-screen bg-slate-100">
      <SiteHeader user={user} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">
            {fixture.homeTeam.name} vs {fixture.awayTeam.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            GW{fixture.gameweek} · {formatKickoff(fixture.kickoffAt)} · {fixture.status}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Team chat rooms are only visible to users who selected that team during signup.
          </p>
        </section>

        {isExpired ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            This fixture chat expired one hour after full-time and is no longer available.
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
