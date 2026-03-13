import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const teams = [
  ["ARS", "Arsenal_F.C."],
  ["AVL", "Aston_Villa_F.C."],
  ["BOU", "AFC_Bournemouth"],
  ["BRE", "Brentford_F.C."],
  ["BHA", "Brighton_%26_Hove_Albion_F.C."],
  ["BUR", "Burnley_F.C."],
  ["CHE", "Chelsea_F.C."],
  ["CRY", "Crystal_Palace_F.C."],
  ["EVE", "Everton_F.C."],
  ["FUL", "Fulham_F.C."],
  ["LEE", "Leeds_United_F.C."],
  ["LIV", "Liverpool_F.C."],
  ["MCI", "Manchester_City_F.C."],
  ["MUN", "Manchester_United_F.C."],
  ["NEW", "Newcastle_United_F.C."],
  ["NFO", "Nottingham_Forest_F.C."],
  ["SUN", "Sunderland_A.F.C."],
  ["TOT", "Tottenham_Hotspur_F.C."],
  ["WHU", "West_Ham_United_F.C."],
  ["WOL", "Wolverhampton_Wanderers_F.C."],
];

const rootDir = process.cwd();
const outputDir = path.join(rootDir, "public", "crests");
await mkdir(outputDir, { recursive: true });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, attempts = 5) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "PLRoomsCrestFetcher/1.0",
      },
    });

    if (response.ok) {
      return response;
    }

    if (response.status !== 429 || attempt === attempts) {
      return response;
    }

    await sleep(450 * attempt);
  }

  throw new Error("Unexpected retry flow");
}

for (const [short, pageTitle] of teams) {
  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${pageTitle}`;
  const summaryResponse = await fetchWithRetry(summaryUrl);
  if (!summaryResponse.ok) {
    throw new Error(`Failed summary for ${short}: ${summaryResponse.status}`);
  }

  const summary = await summaryResponse.json();
  const imageUrl = summary?.thumbnail?.source;
  if (!imageUrl) {
    throw new Error(`No thumbnail found for ${short}`);
  }

  const imageResponse = await fetchWithRetry(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed image for ${short}: ${imageResponse.status}`);
  }

  const bytes = new Uint8Array(await imageResponse.arrayBuffer());
  const outPath = path.join(outputDir, `${short}.png`);
  await writeFile(outPath, bytes);
  console.log(`Saved ${short} -> ${imageUrl}`);
  await sleep(120);
}
