import { describe, expect, it } from "vitest";
import { ellipseRing } from "@/lib/geo";
import {
  aoiFromPolygons,
  assembleInventory,
  assetPosition,
  humanTalaiaError,
  mapTalaiaAsset,
  normalizeEsPhone,
  sameSite,
  siteKindFromAsset,
  sitesFromReport,
  type TalaiaAsset,
} from "@/lib/talaia";
import type { SiteInput } from "@/lib/types";

function asset(partial: Partial<TalaiaAsset> & Pick<TalaiaAsset, "id">): TalaiaAsset {
  return {
    category: "social_care",
    subcategory: "care_home",
    name: "Residència Sant Andreu",
    geometry: { type: "Point", coordinates: [1.8678, 41.7554] },
    address: { street: "Carrer Sant Blai 12", municipality: "Manresa" },
    contacts: { phone: ["938741122"] },
    capacity: { places: 64, people: 64, basis: "registered places (RESES)" },
    occupancy_note: "Low mobility.",
    human_bearing: true,
    provenance: [{ source_id: "es.cat.reses", source_ref: "S05123" }],
    ...partial,
  };
}

function site(partial: Partial<SiteInput> & Pick<SiteInput, "id" | "code" | "kind">): SiteInput {
  return {
    municipality: "Navàs",
    lon: 1.86,
    lat: 41.75,
    animals: [],
    hasOwnTransport: null,
    confirmedAt: null,
    capacityUpdatedAt: null,
    source: "demo",
    shelterHint: "",
    notes: "",
    ...partial,
  };
}

describe("Talaia mapping", () => {
  it("maps a care home and normalises a 9-digit Spanish number", () => {
    const mapped = mapTalaiaAsset(asset({ id: "tal_care" }));
    expect(mapped).not.toBeNull();
    expect(mapped?.kind).toBe("care_home");
    expect(mapped?.source).toBe("talaia");
    expect(mapped?.facilityCapacity).toBe(64);
    expect(mapped?.capacityUnit).toBe("places");
    expect(mapped?.phone).toBe("+34938741122");
    expect(mapped?.code).toBe("S05123");
    expect(mapped?.municipality).toBe("Manresa");
  });

  it("maps education and livestock, and skips industry", () => {
    expect(siteKindFromAsset(asset({ id: "s", category: "education", subcategory: "school" }))).toBe("school");
    expect(siteKindFromAsset(asset({ id: "c", category: "healthcare", subcategory: "primary_care" }))).toBe("cap");
    expect(siteKindFromAsset(asset({ id: "f", category: "livestock", subcategory: "farm" }))).toBe("farm");
    expect(
      siteKindFromAsset(
        asset({ id: "fuel", category: "industry", subcategory: "fuel_station", human_bearing: false }),
      ),
    ).toBeNull();
  });

  it("averages polygon vertices when the asset is not a point", () => {
    const position = assetPosition({
      id: "poly",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [1, 40],
            [3, 40],
            [3, 42],
            [1, 42],
            [1, 40],
          ],
        ],
      },
    });
    expect(position?.lon).toBeCloseTo(1.8);
    expect(position?.lat).toBeCloseTo(40.8);
  });

  it("builds a banded FeatureCollection from hour rings", () => {
    const aoi = aoiFromPolygons([
      { hour: 1, member: 4, ring: ellipseRing([1.82, 41.72], 0.01, 0.01, 0) },
      { hour: 6, member: 4, ring: ellipseRing([1.82, 41.72], 0.04, 0.03, 0) },
    ]);
    expect(aoi.features).toHaveLength(2);
    expect(aoi.features[0].properties.minutes).toBe(60);
    expect(aoi.features[1].properties.band).toBe("t+6h");
  });

  it("counts skipped assets that the console cannot rank", () => {
    const { sites, skipped } = sitesFromReport({
      assets: [
        asset({ id: "tal_care" }),
        asset({ id: "fuel", category: "industry", subcategory: "fuel_station", human_bearing: false }),
      ],
    });
    expect(sites).toHaveLength(1);
    expect(skipped).toBe(1);
  });
});

describe("Talaia inventory merge", () => {
  it("keeps demo seeds and prefers live Talaia over the official dump", () => {
    const seeded = [site({ id: "r-care-041", code: "R-CARE-041", kind: "care_home" })];
    const talaia = [
      site({
        id: "talaia:school",
        code: "SCH-1",
        kind: "school",
        lon: 1.9,
        lat: 41.76,
        source: "talaia",
      }),
    ];
    const official = [
      site({
        id: "official-school",
        code: "SCH-OLD",
        kind: "school",
        lon: 1.9,
        lat: 41.76,
        source: "registry",
      }),
    ];
    const merged = assembleInventory({
      seeded,
      talaia,
      official,
      registry: [],
      talaiaOk: true,
    });
    expect(merged.map((row) => row.id)).toEqual(["r-care-041", "talaia:school"]);
  });

  it("falls back to official facilities when Talaia is down", () => {
    const merged = assembleInventory({
      seeded: [site({ id: "r-care-041", code: "R-CARE-041", kind: "care_home" })],
      talaia: [],
      official: [site({ id: "school-1", code: "SCH-1", kind: "school", source: "registry" })],
      registry: [],
      talaiaOk: false,
    });
    expect(merged.map((row) => row.id)).toEqual(["r-care-041", "school-1"]);
  });

  it("treats nearby same-kind sites as one place", () => {
    const a = site({ id: "a", code: "A", kind: "school", lon: 1.86, lat: 41.75 });
    const b = site({ id: "b", code: "B", kind: "school", lon: 1.8605, lat: 41.7502 });
    expect(sameSite(a, b)).toBe(true);
  });

  it("accepts +34 numbers as already normalised", () => {
    expect(normalizeEsPhone("+34938741122")).toBe("+34938741122");
    expect(normalizeEsPhone("not-a-phone")).toBeNull();
  });

  it("turns a 401 JSON body into coordinator copy", () => {
    expect(humanTalaiaError(401, '{"detail":"Invalid or revoked API key."}')).toBe(
      "Talaia rejected the API key. Ranking uses the official Bages snapshot.",
    );
  });
});
