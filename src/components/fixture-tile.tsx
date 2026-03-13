import Link from "next/link";

import { formatKickoff, timeUntil } from "@/lib/format";
import { getTeamBrand } from "@/lib/team-brand";

import { TeamLogo } from "./team-logo";

type TeamLite = {
  id: number;
  name: string;
  shortName: string;
};

type FixtureTileProps = {
  fixtureId: string;
  gameweek: number;
  kickoffAt: Date;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: TeamLite;
  awayTeam: TeamLite;
  isExpired?: boolean;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  openLabel?: string;
};

function statusStyles(status: string) {
  if (status === "LIVE") {
    return "bg-rose-100 text-rose-700 border border-rose-200";
  }

  if (status === "FINISHED") {
    return "bg-slate-200 text-slate-700 border border-slate-300";
  }

  return "bg-emerald-100 text-emerald-700 border border-emerald-200";
}

export function FixtureTile({
  fixtureId,
  gameweek,
  kickoffAt,
  status,
  homeScore,
  awayScore,
  homeTeam,
  awayTeam,
  isExpired = false,
  badges,
  actions,
  openLabel = "Open Chat",
}: FixtureTileProps) {
  const homeBrand = getTeamBrand(homeTeam.shortName);
  const awayBrand = getTeamBrand(awayTeam.shortName);

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
        isExpired
          ? "border-slate-300 opacity-65 grayscale"
          : "border-slate-200 hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          background: `linear-gradient(120deg, ${homeBrand.primary}, ${awayBrand.primary})`,
        }}
      />
      <div className="relative p-4">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Gameweek {gameweek}</p>
            <p className="mt-1 text-sm font-medium text-slate-700">{formatKickoff(kickoffAt)}</p>
            <p className="text-xs text-slate-500">{timeUntil(kickoffAt)}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles(status)}`}>
              {status}
            </span>
            {badges ? <div className="flex flex-wrap justify-end gap-1">{badges}</div> : null}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <div className="flex min-w-0 flex-col items-center gap-2 text-center">
            <TeamLogo shortName={homeTeam.shortName} teamName={homeTeam.name} size="lg" />
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-bold leading-4 text-slate-900">{homeTeam.name}</p>
              <p className="text-xs text-slate-500">{homeTeam.shortName}</p>
              <p className="mt-1 text-2xl font-black leading-none text-slate-900">{homeScore ?? "-"}</p>
            </div>
          </div>

          <p className="pt-5 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">vs</p>

          <div className="flex min-w-0 flex-col items-center gap-2 text-center">
            <TeamLogo shortName={awayTeam.shortName} teamName={awayTeam.name} size="lg" />
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-bold leading-4 text-slate-900">{awayTeam.name}</p>
              <p className="text-xs text-slate-500">{awayTeam.shortName}</p>
              <p className="mt-1 text-2xl font-black leading-none text-slate-900">{awayScore ?? "-"}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link
            href={`/match/${fixtureId}`}
            className={`inline-flex w-full items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium ${
              isExpired ? "bg-slate-500 text-white hover:bg-slate-500" : "bg-slate-900 text-white hover:bg-slate-700"
            }`}
          >
            {openLabel}
          </Link>
          {actions ? <div className="w-full">{actions}</div> : null}
        </div>
      </div>
    </article>
  );
}
