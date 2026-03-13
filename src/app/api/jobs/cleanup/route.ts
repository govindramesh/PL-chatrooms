import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

function plusHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export async function POST(request: NextRequest) {
  const configuredToken = process.env.CLEANUP_TOKEN;
  if (configuredToken) {
    const headerToken = request.headers.get("x-cleanup-token");
    if (headerToken !== configuredToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();

  const expiredChatFixtures = await prisma.fixture.findMany({
    where: {
      OR: [
        {
          chatExpiresAt: {
            lte: now,
          },
        },
        {
          chatExpiresAt: null,
          kickoffAt: {
            lte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
        },
      ],
    },
    select: { id: true },
  });

  const expiredChatFixtureIds = expiredChatFixtures.map((fixture) => fixture.id);
  let deletedMessagesCount = 0;
  let deletedRoomsCount = 0;

  if (expiredChatFixtureIds.length > 0) {
    const [deletedMessages, deletedRooms] = await prisma.$transaction([
      prisma.chatMessage.deleteMany({
        where: {
          room: {
            fixtureId: {
              in: expiredChatFixtureIds,
            },
          },
        },
      }),
      prisma.chatRoom.deleteMany({
        where: {
          fixtureId: {
            in: expiredChatFixtureIds,
          },
        },
      }),
    ]);

    deletedMessagesCount = deletedMessages.count;
    deletedRoomsCount = deletedRooms.count;
  }

  const gameweekMaxKickoff = await prisma.fixture.groupBy({
    by: ["gameweek"],
    _max: {
      kickoffAt: true,
    },
  });

  const expiredGameweeks = gameweekMaxKickoff
    .filter((entry) => entry._max.kickoffAt && plusHours(entry._max.kickoffAt, 24).getTime() <= now.getTime())
    .map((entry) => entry.gameweek);

  let deletedFixturesCount = 0;
  if (expiredGameweeks.length > 0) {
    const deletedFixtures = await prisma.fixture.deleteMany({
      where: {
        gameweek: {
          in: expiredGameweeks,
        },
      },
    });

    deletedFixturesCount = deletedFixtures.count;
  }

  return NextResponse.json({
    ok: true,
    cleanedFixtures: deletedFixturesCount,
    deletedMessages: deletedMessagesCount,
    deletedRooms: deletedRoomsCount,
    deletedFixtures: deletedFixturesCount,
  });
}
