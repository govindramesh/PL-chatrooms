import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";
const FIXTURES_URL = "https://fantasy.premierleague.com/api/fixtures/";

function asDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function plusHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function statusFromFixture(fixture) {
  if (fixture.finished) {
    return "FINISHED";
  }

  if (fixture.started) {
    return "LIVE";
  }

  return "SCHEDULED";
}

function roomEntriesForFixture(fixtureId, homeTeamId, awayTeamId, activeUntil) {
  return [
    {
      roomKey: `${fixtureId}:general`,
      roomType: "GENERAL",
      teamId: null,
      activeUntil,
    },
    {
      roomKey: `${fixtureId}:team:${homeTeamId}`,
      roomType: "TEAM",
      teamId: homeTeamId,
      activeUntil,
    },
    {
      roomKey: `${fixtureId}:team:${awayTeamId}`,
      roomType: "TEAM",
      teamId: awayTeamId,
      activeUntil,
    },
  ];
}

async function sync() {
  const [bootstrapResponse, fixturesResponse] = await Promise.all([fetch(BOOTSTRAP_URL), fetch(FIXTURES_URL)]);

  if (!bootstrapResponse.ok) {
    throw new Error(`Failed bootstrap fetch: ${bootstrapResponse.status}`);
  }

  if (!fixturesResponse.ok) {
    throw new Error(`Failed fixtures fetch: ${fixturesResponse.status}`);
  }

  const bootstrap = await bootstrapResponse.json();
  const fixtures = await fixturesResponse.json();

  const fplTeamById = new Map(bootstrap.teams.map((team) => [team.id, team]));
  const dbTeams = await prisma.team.findMany({
    select: {
      id: true,
      shortName: true,
    },
  });
  const dbTeamIdByShortName = new Map(dbTeams.map((team) => [team.shortName, team.id]));

  const externalIdsSeen = new Set();
  let upsertedCount = 0;
  let skippedCount = 0;

  for (const fixture of fixtures) {
    const kickoffAt = asDate(fixture.kickoff_time);
    if (!kickoffAt || !fixture.event) {
      skippedCount += 1;
      continue;
    }

    const homeFplTeam = fplTeamById.get(fixture.team_h);
    const awayFplTeam = fplTeamById.get(fixture.team_a);
    if (!homeFplTeam || !awayFplTeam) {
      skippedCount += 1;
      continue;
    }

    const homeTeamId = dbTeamIdByShortName.get(homeFplTeam.short_name);
    const awayTeamId = dbTeamIdByShortName.get(awayFplTeam.short_name);
    if (!homeTeamId || !awayTeamId) {
      skippedCount += 1;
      continue;
    }

    const externalId = `fpl-${fixture.id}`;
    externalIdsSeen.add(externalId);

    const status = statusFromFixture(fixture);
    const endedAt = status === "FINISHED" ? plusHours(kickoffAt, 2) : null;
    const chatExpiresAt = endedAt ? plusHours(endedAt, 1) : null;

    const upsertedFixture = await prisma.fixture.upsert({
      where: { externalId },
      update: {
        gameweek: fixture.event,
        kickoffAt,
        status,
        endedAt,
        chatExpiresAt,
        homeTeamId,
        awayTeamId,
      },
      create: {
        externalId,
        gameweek: fixture.event,
        kickoffAt,
        status,
        endedAt,
        chatExpiresAt,
        homeTeamId,
        awayTeamId,
      },
    });

    const activeUntil = chatExpiresAt ?? plusHours(kickoffAt, 3);
    for (const room of roomEntriesForFixture(upsertedFixture.id, homeTeamId, awayTeamId, activeUntil)) {
      await prisma.chatRoom.upsert({
        where: { roomKey: room.roomKey },
        update: {
          activeUntil: room.activeUntil,
        },
        create: {
          roomKey: room.roomKey,
          fixtureId: upsertedFixture.id,
          roomType: room.roomType,
          teamId: room.teamId,
          activeUntil: room.activeUntil,
        },
      });
    }

    upsertedCount += 1;
  }

  await prisma.fixture.deleteMany({
    where: {
      externalId: {
        startsWith: "sample-",
      },
    },
  });

  await prisma.fixture.deleteMany({
    where: {
      externalId: {
        startsWith: "fpl-",
        notIn: [...externalIdsSeen],
      },
    },
  });

  const expiredDeleted = await prisma.fixture.deleteMany({
    where: {
      OR: [
        {
          chatExpiresAt: {
            lte: new Date(),
          },
        },
        {
          chatExpiresAt: null,
          endedAt: {
            lte: new Date(Date.now() - 60 * 60 * 1000),
          },
        },
      ],
    },
  });

  console.log(`Upserted fixtures: ${upsertedCount}`);
  console.log(`Skipped fixtures: ${skippedCount}`);
  console.log(`Deleted expired fixtures: ${expiredDeleted.count}`);
  console.log(`Stored gameweeks: ${[...new Set(fixtures.map((fixture) => fixture.event).filter(Boolean))].length}`);
}

sync()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
