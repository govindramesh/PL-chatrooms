import Image from "next/image";

import { getTeamBrand } from "@/lib/team-brand";

type TeamLogoProps = {
  shortName: string;
  teamName: string;
  size?: "md" | "lg";
};

export function TeamLogo({ shortName, teamName, size = "md" }: TeamLogoProps) {
  const brand = getTeamBrand(shortName);
  const sizeClass = size === "lg" ? "h-16 w-16" : "h-12 w-12";

  return (
    <div
      className={`relative ${sizeClass} overflow-hidden rounded-2xl border bg-white shadow-lg`}
      style={{
        borderColor: brand.secondary,
        boxShadow: `0 8px 20px -12px ${brand.primary}`,
      }}
      aria-label={`${teamName} crest`}
      title={teamName}
    >
      <Image
        src={`/crests/${shortName}.png`}
        alt={`${teamName} crest`}
        fill
        className="object-contain p-1"
        sizes={size === "lg" ? "64px" : "48px"}
      />
    </div>
  );
}
