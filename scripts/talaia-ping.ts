/**
 * Talaia key check. Prints prefix only — never the secret.
 * Run: nvm use 22 && npm run talaia:ping
 */

const DEFAULT_URL = "https://talaia.up.railway.app";

async function main(): Promise<void> {
  const apiKey = process.env.TALAIA_API_KEY?.trim();
  const base = (process.env.TALAIA_URL?.trim() || DEFAULT_URL).replace(/\/$/, "");
  if (!apiKey) {
    throw new Error("set TALAIA_API_KEY in .env.local");
  }

  const response = await fetch(`${base}/v1/me`, {
    headers: {
      accept: "application/json",
      "X-API-Key": apiKey,
    },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Talaia ${response.status}: ${body.slice(0, 300)}`);
  }

  const json = JSON.parse(body) as { tier?: string; limits?: { max_aoi_km2?: unknown } };
  console.log(`Talaia ok · prefix ${apiKey.slice(0, 14)}… · tier ${json.tier ?? "unknown"}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
