import { ChatMessageType, ChatRoomType, FixtureStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export function isFixtureExpired(fixture: { chatExpiresAt: Date | null; kickoffAt?: Date; endedAt: Date | null }) {
  if (fixture.chatExpiresAt) {
    return fixture.chatExpiresAt.getTime() <= Date.now();
  }

  if (fixture.kickoffAt) {
    return fixture.kickoffAt.getTime() + 24 * 60 * 60 * 1000 <= Date.now();
  }

  if (!fixture.endedAt) {
    return false;
  }

  return fixture.endedAt.getTime() + 24 * 60 * 60 * 1000 <= Date.now();
}

export function canUserAccessRoom(
  room: { roomType: ChatRoomType; teamId: number | null },
  favoriteTeamId: number,
) {
  if (room.roomType === ChatRoomType.GENERAL) {
    return true;
  }

  return room.teamId === favoriteTeamId;
}

export function formatSystemEventBody(event: {
  type: string;
  minute: number;
  playerName: string | null;
  teamShortName: string | null;
}) {
  const actor = event.playerName ? `${event.playerName} ` : "";
  const team = event.teamShortName ? `(${event.teamShortName})` : "";
  return `${event.type.toUpperCase()} ${event.minute}' - ${actor}${team}`.trim();
}

const LIVE_PRESENCE_WINDOW_MS = 15_000;

export function getPresenceCutoff(now = new Date()) {
  return new Date(now.getTime() - LIVE_PRESENCE_WINDOW_MS);
}

export async function markUserPresent(roomId: string, userId: string) {
  const now = new Date();

  await prisma.chatRoomPresence.upsert({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
    update: {
      lastSeenAt: now,
    },
    create: {
      roomId,
      userId,
      lastSeenAt: now,
    },
  });
}

export async function countLiveUsers(roomId: string, now = new Date()) {
  const cutoff = getPresenceCutoff(now);

  await prisma.chatRoomPresence.deleteMany({
    where: {
      roomId,
      lastSeenAt: {
        lt: cutoff,
      },
    },
  });

  return prisma.chatRoomPresence.count({
    where: {
      roomId,
      lastSeenAt: {
        gte: cutoff,
      },
    },
  });
}

export async function ensureFixtureRooms(fixtureId: string, homeTeamId: number, awayTeamId: number, activeUntil: Date) {
  const entries = [
    { key: `${fixtureId}:general`, roomType: ChatRoomType.GENERAL, teamId: null as number | null },
    { key: `${fixtureId}:team:${homeTeamId}`, roomType: ChatRoomType.TEAM, teamId: homeTeamId },
    { key: `${fixtureId}:team:${awayTeamId}`, roomType: ChatRoomType.TEAM, teamId: awayTeamId },
  ];

  await Promise.all(
    entries.map((entry) =>
      prisma.chatRoom.upsert({
        where: { roomKey: entry.key },
        update: { activeUntil },
        create: {
          roomKey: entry.key,
          fixtureId,
          roomType: entry.roomType,
          teamId: entry.teamId,
          activeUntil,
        },
      }),
    ),
  );
}

export async function addSystemEventToFixtureRooms(params: {
  fixtureId: string;
  minute: number;
  type: string;
  teamId?: number | null;
  playerName?: string | null;
}) {
  const fixture = await prisma.fixture.findUnique({
    where: { id: params.fixtureId },
    include: {
      rooms: true,
      homeTeam: true,
      awayTeam: true,
    },
  });

  if (!fixture) {
    throw new Error("Fixture not found");
  }

  const teamShortName =
    params.teamId === fixture.homeTeamId
      ? fixture.homeTeam.shortName
      : params.teamId === fixture.awayTeamId
        ? fixture.awayTeam.shortName
        : null;

  const providerEventId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const event = await prisma.matchEvent.create({
    data: {
      fixtureId: fixture.id,
      providerEventId,
      minute: params.minute,
      type: params.type,
      teamId: params.teamId ?? null,
      playerName: params.playerName ?? null,
    },
  });

  const body = formatSystemEventBody({
    minute: event.minute,
    type: event.type,
    playerName: event.playerName,
    teamShortName,
  });

  await Promise.all(
    fixture.rooms.map((room) =>
      prisma.chatMessage.create({
        data: {
          roomId: room.id,
          messageType: ChatMessageType.SYSTEM_EVENT,
          body,
        },
      }),
    ),
  );

  if (fixture.status === FixtureStatus.SCHEDULED) {
    await prisma.fixture.update({
      where: { id: fixture.id },
      data: {
        status: FixtureStatus.LIVE,
      },
    });
  }
}
