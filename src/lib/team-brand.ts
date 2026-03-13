export type TeamBrand = {
  primary: string;
  secondary: string;
  ink: string;
};

const fallbackBrand: TeamBrand = {
  primary: "#1e293b",
  secondary: "#334155",
  ink: "#ffffff",
};

const brandsByShortName: Record<string, TeamBrand> = {
  ARS: { primary: "#EF0107", secondary: "#9C824A", ink: "#ffffff" },
  AVL: { primary: "#670E36", secondary: "#95BFE5", ink: "#ffffff" },
  BOU: { primary: "#DA291C", secondary: "#000000", ink: "#ffffff" },
  BRE: { primary: "#E30613", secondary: "#FBB03B", ink: "#ffffff" },
  BHA: { primary: "#0057B8", secondary: "#FFFFFF", ink: "#ffffff" },
  BUR: { primary: "#6C1D45", secondary: "#99D6EA", ink: "#ffffff" },
  CHE: { primary: "#034694", secondary: "#FFFFFF", ink: "#ffffff" },
  CRY: { primary: "#1B458F", secondary: "#C4122E", ink: "#ffffff" },
  EVE: { primary: "#003399", secondary: "#FFFFFF", ink: "#ffffff" },
  FUL: { primary: "#111827", secondary: "#FFFFFF", ink: "#ffffff" },
  LEE: { primary: "#1D428A", secondary: "#FFCD00", ink: "#ffffff" },
  LIV: { primary: "#C8102E", secondary: "#00B2A9", ink: "#ffffff" },
  MCI: { primary: "#6CABDD", secondary: "#1C2C5B", ink: "#0f172a" },
  MUN: { primary: "#DA291C", secondary: "#FBE122", ink: "#ffffff" },
  NEW: { primary: "#241F20", secondary: "#FFFFFF", ink: "#ffffff" },
  NFO: { primary: "#DD0000", secondary: "#FFFFFF", ink: "#ffffff" },
  SUN: { primary: "#EB172B", secondary: "#000000", ink: "#ffffff" },
  TOT: { primary: "#132257", secondary: "#FFFFFF", ink: "#ffffff" },
  WHU: { primary: "#7A263A", secondary: "#1BB1E7", ink: "#ffffff" },
  WOL: { primary: "#FDB913", secondary: "#231F20", ink: "#111827" },
};

export function getTeamBrand(shortName: string) {
  return brandsByShortName[shortName] ?? fallbackBrand;
}
