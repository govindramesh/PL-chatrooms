import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const configuredToken = process.env.CLEANUP_TOKEN;
  if (configuredToken) {
    const headerToken = request.headers.get("x-cleanup-token");
    if (headerToken !== configuredToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const expiredFixtures = await prisma.fixture.findMany({
    where: {
      OR: [
        {
          chatExpiresAt: {
            lte: now,
          },
        },
        {
          chatExpiresAt: null,
          endedAt: {
            lte: new Date(now.getTime() - 60 * 60 * 1000),
          },
        },
      ],
    },
    select: { id: true },
  });

  if (expiredFixtures.length === 0) {
    return NextResponse.json({ ok: true, cleanedFixtures: 0, deletedMessages: 0, deletedRooms: 0, deletedFixtures: 0 });
  }

  const fixtureIds = expiredFixtures.map((fixture) => fixture.id);

  const [deletedMessages, deletedRooms, deletedFixtures] = await prisma.$transaction([
    prisma.chatMessage.deleteMany({
      where: {
        room: {
          fixtureId: {
            in: fixtureIds,
          },
        },
      },
    }),
    prisma.chatRoom.deleteMany({
      where: {
        fixtureId: {
          in: fixtureIds,
        },
      },
    }),
    prisma.fixture.deleteMany({
      where: {
        id: {
          in: fixtureIds,
        },
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    cleanedFixtures: deletedFixtures.count,
    deletedMessages: deletedMessages.count,
    deletedRooms: deletedRooms.count,
    deletedFixtures: deletedFixtures.count,
  });
}
