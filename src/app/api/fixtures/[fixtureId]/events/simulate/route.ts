import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { addSystemEventToFixtureRooms, isFixtureExpired } from "@/lib/chat";
import { prisma } from "@/lib/prisma";

const simulateSchema = z.object({
  type: z.string().trim().min(2).max(40).default("Goal"),
  minute: z.number().int().min(1).max(130).default(45),
  playerName: z.string().trim().max(80).optional(),
  teamId: z.number().int().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fixtureId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fixtureId } = await params;
  const fixture = await prisma.fixture.findUnique({
    where: { id: fixtureId },
    include: {
      homeTeam: true,
      awayTeam: true,
      rooms: true,
    },
  });

  if (!fixture) {
    return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
  }

  if (isFixtureExpired(fixture)) {
    return NextResponse.json({ error: "Chat expired" }, { status: 410 });
  }

  const payload = await request.json().catch(() => ({}));
  const parsed = simulateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
  }

  const teamId = parsed.data.teamId ?? fixture.homeTeamId;
  if (teamId !== fixture.homeTeamId && teamId !== fixture.awayTeamId) {
    return NextResponse.json({ error: "Event team must be one of the fixture teams" }, { status: 400 });
  }

  await addSystemEventToFixtureRooms({
    fixtureId,
    minute: parsed.data.minute,
    type: parsed.data.type,
    playerName: parsed.data.playerName ?? null,
    teamId,
  });

  return NextResponse.json({ ok: true });
}
