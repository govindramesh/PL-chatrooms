import { ChatRoomType, FixtureStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const teams = [
  { id: 0, name: "Neutral", shortName: "NEU" },
  { id: 1, name: "Arsenal", shortName: "ARS" },
  { id: 2, name: "Aston Villa", shortName: "AVL" },
  { id: 3, name: "Bournemouth", shortName: "BOU" },
  { id: 4, name: "Brentford", shortName: "BRE" },
  { id: 5, name: "Brighton", shortName: "BHA" },
  { id: 6, name: "Burnley", shortName: "BUR" },
  { id: 7, name: "Chelsea", shortName: "CHE" },
  { id: 8, name: "Crystal Palace", shortName: "CRY" },
  { id: 9, name: "Everton", shortName: "EVE" },
  { id: 10, name: "Fulham", shortName: "FUL" },
  { id: 11, name: "Leeds United", shortName: "LEE" },
  { id: 12, name: "Liverpool", shortName: "LIV" },
  { id: 13, name: "Manchester City", shortName: "MCI" },
  { id: 14, name: "Manchester United", shortName: "MUN" },
  { id: 15, name: "Newcastle United", shortName: "NEW" },
  { id: 16, name: "Nottingham Forest", shortName: "NFO" },
  { id: 17, name: "Sunderland", shortName: "SUN" },
  { id: 18, name: "Tottenham Hotspur", shortName: "TOT" },
  { id: 19, name: "West Ham United", shortName: "WHU" },
  { id: 20, name: "Wolves", shortName: "WOL" },
];

function gameDate(offsetHours: number): Date {
  return new Date(Date.now() + offsetHours * 60 * 60 * 1000);
}

async function upsertRoomsForFixture(fixtureId: string, homeTeamId: number, awayTeamId: number, activeUntil: Date) {
  const entries = [
    { key: `${fixtureId}:general`, roomType: ChatRoomType.GENERAL, teamId: null as number | null },
    { key: `${fixtureId}:team:${homeTeamId}`, roomType: ChatRoomType.TEAM, teamId: homeTeamId },
    { key: `${fixtureId}:team:${awayTeamId}`, roomType: ChatRoomType.TEAM, teamId: awayTeamId },
  ];

  for (const entry of entries) {
    await prisma.chatRoom.upsert({
      where: { roomKey: entry.key },
      update: { activeUntil },
      create: {
        roomKey: entry.key,
        fixtureId,
        roomType: entry.roomType,
        teamId: entry.teamId,
        activeUntil,
      },
    });
  }
}

async function main() {
  for (const team of teams) {
    await prisma.team.upsert({
      where: { id: team.id },
      update: team,
      create: team,
    });
  }

  const fixtureSeeds = [
    {
      externalId: "sample-001",
      gameweek: 29,
      homeTeamId: 12,
      awayTeamId: 13,
      kickoffAt: gameDate(2),
      status: FixtureStatus.SCHEDULED,
      endedAt: null as Date | null,
      chatExpiresAt: gameDate(5),
    },
    {
      externalId: "sample-002",
      gameweek: 29,
      homeTeamId: 1,
      awayTeamId: 7,
      kickoffAt: gameDate(6),
      status: FixtureStatus.SCHEDULED,
      endedAt: null as Date | null,
      chatExpiresAt: gameDate(9),
    },
    {
      externalId: "sample-003",
      gameweek: 29,
      homeTeamId: 18,
      awayTeamId: 14,
      kickoffAt: gameDate(-1),
      status: FixtureStatus.LIVE,
      endedAt: null as Date | null,
      chatExpiresAt: gameDate(2),
    },
    {
      externalId: "sample-004",
      gameweek: 29,
      homeTeamId: 4,
      awayTeamId: 8,
      kickoffAt: gameDate(-5),
      status: FixtureStatus.FINISHED,
      endedAt: gameDate(-3),
      chatExpiresAt: gameDate(-2),
    },
  ];

  for (const fixtureSeed of fixtureSeeds) {
    const fixture = await prisma.fixture.upsert({
      where: { externalId: fixtureSeed.externalId },
      update: fixtureSeed,
      create: fixtureSeed,
    });

    const activeUntil = fixture.chatExpiresAt ?? gameDate(4);
    await upsertRoomsForFixture(fixture.id, fixture.homeTeamId, fixture.awayTeamId, activeUntil);
  }

  const liveFixture = await prisma.fixture.findFirst({ where: { status: FixtureStatus.LIVE } });
  if (liveFixture) {
    const event = await prisma.matchEvent.upsert({
      where: {
        fixtureId_providerEventId: {
          fixtureId: liveFixture.id,
          providerEventId: "seed-goal-47",
        },
      },
      update: {},
      create: {
        fixtureId: liveFixture.id,
        providerEventId: "seed-goal-47",
        minute: 47,
        type: "Goal",
        teamId: liveFixture.homeTeamId,
        playerName: "Sample Striker",
      },
    });

    const rooms = await prisma.chatRoom.findMany({ where: { fixtureId: liveFixture.id } });
    for (const room of rooms) {
      await prisma.chatMessage.create({
        data: {
          roomId: room.id,
          messageType: "SYSTEM_EVENT",
          body: `GOAL ${event.minute}' - ${event.playerName} (${teams.find((t) => t.id === event.teamId)?.shortName ?? "UNK"})`,
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
