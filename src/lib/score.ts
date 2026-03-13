import type { FixtureStatus, MatchEvent } from "@prisma/client";

export function getFixtureScore(params: {
  status: FixtureStatus;
  homeTeamId: number;
  awayTeamId: number;
  events: Array<Pick<MatchEvent, "teamId" | "type">>;
}) {
  if (params.status === "SCHEDULED") {
    return { homeScore: null, awayScore: null };
  }

  let homeScore = 0;
  let awayScore = 0;

  for (const event of params.events) {
    if (event.type.toLowerCase() !== "goal") {
      continue;
    }

    if (event.teamId === params.homeTeamId) {
      homeScore += 1;
    }

    if (event.teamId === params.awayTeamId) {
      awayScore += 1;
    }
  }

  return { homeScore, awayScore };
}
