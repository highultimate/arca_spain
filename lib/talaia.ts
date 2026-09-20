import { haversineKm } from "./geo";
import type { DataSourceStatus, HourPolygon, SiteInput, SiteKind } from "./types";

const DEFAULT_TALAIA_URL = "https://talaia.up.railway.app";
const REQUEST_TIMEOUT_MS = 20_000;
const CACHE_TTL_MS = 10 * 60_000;
const UI_MAX_ASSETS = 400;
const NEAR_KM = 0.15;

export type TalaiaAsset = {
  id: string;
  category?: string | null;
  subcategory?: string | null;
  name?: string | null;
  geometry?: { type?: string; coordinates?: unknown } | null;
  address?: Record<string, unknown> | null;
  contacts?: { phone?: string[] | null } | null;
  capacity?: {
    places?: number | null;
    people?: number | null;
    basis?: string | null;
    species?: Array<{ species?: string; count?: number }> | null;
  } | null;
  occupancy_note?: string | null;
  human_bearing?: boolean | null;
  hazardous?: boolean | null;
  provenance?: Array<{ source_id?: string; source_ref?: string | null }> | null;
};

export type TalaiaReport = {
  summary?: { asset_count?: number | null; people_estimate?: number | null; coverage_regime?: string | null };
  assets?: TalaiaAsset[];
  warnings?: string[];
};

export type TalaiaStatus = {
  sites: SiteInput[];
  status: DataSourceStatus;
  skipped: number;
};

type CacheEntry = { at: number; result: TalaiaStatus };

let cache: CacheEntry | null = null;
let lastPhones = new Map<string, string>();

function talaiaUrl() {
  return (process.env.TALAIA_URL?.trim() || DEFAULT_TALAIA_URL).replace(/\/$/, "");
}

function talaiaKey() {
  return process.env.TALAIA_API_KEY?.trim() || "";
}

export function aoiFromPolygons(polygons: HourPolygon[]) {
  return {
    type: "FeatureCollection" as const,
    features: polygons.map((polygon) => ({
      type: "Feature" as const,
      properties: {
        band: `t+${polygon.hour}h`,
        hour: polygon.hour,
        minutes: polygon.hour * 60,
        member: polygon.member,
      },
      geometry: { type: "Polygon" as const, coordinates: [polygon.ring] },
    })),
  };
}

export function assetPosition(asset: TalaiaAsset): { lon: number; lat: number } | null {
  const geometry = asset.geometry;
  if (!geometry) return null;
  const points: Array<[number, number]> = [];
  const visit = (coords: unknown): void => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      points.push([coords[0], coords[1]]);
      return;
    }
    for (const child of coords) visit(child);
  };
  visit(geometry.coordinates);
  if (points.length === 0) return null;
  const lon = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const lat = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  return { lon, lat };
}

export function siteKindFromAsset(asset: TalaiaAsset): SiteKind | null {
  const sub = (asset.subcategory ?? "").toLowerCase();
  const cat = (asset.category ?? "").toLowerCase();

  if (/care_home|nursing|residencia|assisted|elderly|disabled/.test(sub) || cat === "social_care") {
    return "care_home";
  }
  if (/primary_care|clinic|cap\b/.test(sub)) return "cap";
  if (/hospital|health/.test(sub) || cat === "healthcare") return "hospital";
  if (/school|nursery|kindergarten|college|university|institut|educat/.test(sub) || cat === "education") {
    return "school";
  }
  if (/farm|livestock|stable|barn|apiary|kennel/.test(sub) || cat === "livestock") return "farm";
  if (
    asset.human_bearing &&
    (/housing|dwelling|residential|urbanitzacio|apartment|campsite|camping|hotel|hostel|guest/.test(sub) ||
      cat === "residential" ||
      cat === "tourism")
  ) {
    return "household";
  }
  return null;
}

export function normalizeEsPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (/^\d{9}$/.test(digits)) return `+34${digits}`;
  if (/^34\d{9}$/.test(digits)) return `+${digits}`;
  if (/^\+\d{8,15}$/.test(trimmed)) return trimmed;
  return null;
}

function municipalityOf(asset: TalaiaAsset): string {
  const address = asset.address ?? {};
  const value = address.municipality ?? address.city ?? address.town;
  return typeof value === "string" && value.trim() ? value.trim() : "Unknown";
}

function capacityFor(kind: SiteKind, asset: TalaiaAsset): {
  facilityCapacity: number | null;
  capacityUnit: SiteInput["capacityUnit"];
  animals: SiteInput["animals"];
} {
  const people = asset.capacity?.people ?? asset.capacity?.places ?? null;
  if (kind === "farm") {
    const species = asset.capacity?.species ?? [];
    const animals = species
      .map((entry) => {
        const name = entry.species?.trim();
        const count = entry.count;
        if (!name || typeof count !== "number") return null;
        return { species: name, registeredCapacity: count, confirmedCount: null };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    if (animals.length === 0 && typeof people === "number") {
      return {
        facilityCapacity: null,
        capacityUnit: null,
        animals: [{ species: "livestock", registeredCapacity: people, confirmedCount: null }],
      };
    }
    return { facilityCapacity: null, capacityUnit: null, animals };
  }
  const unit: SiteInput["capacityUnit"] =
    kind === "school" ? "students" : kind === "hospital" ? "beds" : kind === "care_home" || kind === "cap" ? "places" : null;
  return { facilityCapacity: typeof people === "number" ? people : null, capacityUnit: unit, animals: [] };
}

export function mapTalaiaAsset(asset: TalaiaAsset): SiteInput | null {
  const kind = siteKindFromAsset(asset);
  const position = assetPosition(asset);
  if (!kind || !position) return null;

  const provenance = asset.provenance?.[0];
  const { facilityCapacity, capacityUnit, animals } = capacityFor(kind, asset);
  const phone = normalizeEsPhone(asset.contacts?.phone?.[0] ?? null);
  const note = [asset.occupancy_note, asset.capacity?.basis ? `Capacity basis: ${asset.capacity.basis}.` : null]
    .filter(Boolean)
    .join(" ");

  return {
    id: `talaia:${asset.id}`,
    code: provenance?.source_ref?.trim() || asset.id,
    name: asset.name?.trim() || asset.id,
    kind,
    municipality: municipalityOf(asset),
    lon: position.lon,
    lat: position.lat,
    animals,
    hasOwnTransport: kind === "household" ? null : false,
    confirmedAt: null,
    capacityUpdatedAt: null,
    source: "talaia",
    shelterHint: "",
    notes: note || "Talaia live exposure. Capacity is registered, not occupancy.",
    facilityCapacity,
    capacityUnit,
    capacityPeriod: null,
    locationQuality: "official_point",
    datasetId: provenance?.source_id ?? "talaia",
    sourceRecordId: provenance?.source_ref ?? asset.id,
    sourceUrl: `${talaiaUrl()}/docs`,
    attribution: "Talaia (Spanish registries + OSM)",
    address: typeof asset.address?.street === "string" ? asset.address.street : undefined,
    phone,
  };
}

export function sameSite(a: SiteInput, b: SiteInput): boolean {
  if (a.code === b.code || a.id === b.id) return true;
  if (a.kind !== b.kind) return false;
  return haversineKm(a, b) < NEAR_KM;
}

function notIn(existing: SiteInput[], candidate: SiteInput) {
  return !existing.some((site) => sameSite(site, candidate));
}

/** Demo seeds always stay. Live Talaia replaces the official Bages dump. */
export function assembleInventory(input: {
  seeded: SiteInput[];
  registry: SiteInput[];
  official: SiteInput[];
  talaia: SiteInput[];
  talaiaOk: boolean;
}): SiteInput[] {
  const sites = [...input.seeded];
  if (input.talaiaOk && input.talaia.length > 0) {
    sites.push(...input.talaia.filter((site) => notIn(sites, site)));
  } else {
    sites.push(...input.official.filter((site) => notIn(sites, site)));
  }
  sites.push(...input.registry.filter((site) => notIn(sites, site)));
  return sites;
}

function rememberPhones(sites: SiteInput[]) {
  const next = new Map<string, string>();
  for (const site of sites) {
    if (!site.phone) continue;
    next.set(site.id, site.phone);
    next.set(site.code, site.phone);
  }
  lastPhones = next;
}

export async function talaiaPhoneForSite(key: string): Promise<string | null> {
  return lastPhones.get(key) ?? null;
}

function missingStatus(): TalaiaStatus {
  return {
    sites: [],
    skipped: 0,
    status: {
      id: "talaia",
      label: "Talaia exposure",
      kind: "maybe_old",
      detail: "TALAIA_API_KEY unset. Ranking uses the official Bages snapshot instead of live registries.",
      fetchedAt: null,
      ok: false,
    },
  };
}

export function humanTalaiaError(status: number, body: string): string {
  if (status === 401 || status === 403) {
    return "Talaia rejected the API key. Ranking uses the official Bages snapshot.";
  }
  if (status === 429) {
    return "Talaia rate-limited this key. Ranking uses the official Bages snapshot.";
  }
  try {
    const parsed = JSON.parse(body) as { detail?: unknown };
    if (typeof parsed.detail === "string" && parsed.detail.trim()) {
      return `Talaia: ${parsed.detail.trim().slice(0, 180)}`;
    }
  } catch {
    // Keep a short fallback below.
  }
  return `Talaia request failed (${status}). Ranking uses the official Bages snapshot.`;
}

async function postExposure(aoi: ReturnType<typeof aoiFromPolygons>): Promise<TalaiaReport> {
  const maxAssets = Math.min(
    Number.parseInt(process.env.TALAIA_MAX_ASSETS ?? "", 10) || UI_MAX_ASSETS,
    UI_MAX_ASSETS,
  );
  const response = await fetch(`${talaiaUrl()}/v1/exposure`, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "X-API-Key": talaiaKey(),
    },
    body: JSON.stringify({
      aoi,
      buffer_m: 250,
      live_osm: false,
      include_networks: false,
      include_population: true,
      include_population_grid: false,
      include_assets: true,
      sort_by: "priority",
      max_assets: maxAssets,
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(humanTalaiaError(response.status, body));
  }
  return JSON.parse(body) as TalaiaReport;
}

function toStatus(report: TalaiaReport, mapped: SiteInput[], skipped: number): DataSourceStatus {
  const warnings = (report.warnings ?? []).filter((line) => !/TALAIA_API_KEY/.test(line));
  const count = report.summary?.asset_count ?? report.assets?.length ?? mapped.length;
  const people = report.summary?.people_estimate;
  const regime = report.summary?.coverage_regime;
  const extra = [
    typeof people === "number" ? `${Math.round(people)} people at facilities (capacity, not occupancy).` : null,
    skipped > 0 ? `Skipped ${skipped} industry/utility/other assets the console does not rank.` : null,
    regime,
    ...warnings.slice(0, 2),
  ]
    .filter(Boolean)
    .join(" ");
  return {
    id: "talaia",
    label: "Talaia exposure",
    kind: "live",
    ok: true,
    fetchedAt: new Date().toISOString(),
    detail: `Live. ${mapped.length} ranked sites from ${count} assets inside the demo fire shape. ${extra}`.trim(),
  };
}

export function sitesFromReport(report: TalaiaReport): { sites: SiteInput[]; skipped: number } {
  const sites: SiteInput[] = [];
  let skipped = 0;
  for (const asset of report.assets ?? []) {
    const mapped = mapTalaiaAsset(asset);
    if (mapped) sites.push(mapped);
    else skipped += 1;
  }
  return { sites, skipped };
}

export async function fetchTalaiaExposure(polygons: HourPolygon[]): Promise<TalaiaStatus> {
  if (!talaiaKey()) return missingStatus();
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.result;

  try {
    const report = await postExposure(aoiFromPolygons(polygons));
    const { sites, skipped } = sitesFromReport(report);
    rememberPhones(sites);
    const result: TalaiaStatus = {
      sites,
      skipped,
      status: toStatus(report, sites, skipped),
    };
    cache = { at: Date.now(), result };
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "network error";
    const stale = cache?.result;
    if (stale?.sites.length) {
      return {
        ...stale,
        status: {
          ...stale.status,
          kind: "maybe_old",
          ok: false,
          detail: `${message}. Serving last good Talaia exposure from ${stale.status.fetchedAt ?? "earlier"}.`,
        },
      };
    }
    return {
      sites: [],
      skipped: 0,
      status: {
        id: "talaia",
        label: "Talaia exposure",
        kind: "maybe_old",
        ok: false,
        fetchedAt: null,
        detail: `${message}. Ranking uses the official Bages snapshot.`,
      },
    };
  }
}
