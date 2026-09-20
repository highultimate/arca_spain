import {
  DEFAULT_NEBIUS_BASE_URL,
  DEFAULT_NEBIUS_MODEL,
  resolveNebiusBaseUrl,
  resolveNebiusModelId,
} from "../mastra/llm/nebius";
import {
  applyLastCorrectedCount,
  extractCorrectionEvidence,
  LAST_CORRECTED_NUMBER_RULE,
  parsePhoneReportFromTranscript,
  type PhoneReport,
} from "./phone-report";

// Recommended by Norma — fixed with Cursor Grok 4.6 via Cursor
const PHONE_PARSE_PROMPT = [
  "You structure spoken farmer or resident phone reports for ARCA, a Catalonia wildfire evacuation coordinator.",
  "Input format: one raw speech-to-text transcript from an outbound or inbound voice call.",
  "The transcript is usually Spanish, Catalan, or English. It may include hesitation, filled pauses, self-corrections, DTMF digit text, or be empty or noise-only.",
  "Expected behavior: extract only facts the speaker actually said. Never invent a species, count, truck, or move-now answer.",
  "Intended usage: the JSON is stored server-side as a reported (not verified) confirmation for ranking and briefing.",
  "Edge cases: empty or unintelligible transcript → species, count, truck, and canMoveNow are null and confidence is low.",
  "If the speaker names no animal, species is null. If they name several, use the species they counted.",
  "DTMF-only text is keypad digits, not spoken livestock facts, unless those digits clearly encode a count.",
  "Return a single JSON object only — no markdown fences, no commentary — with keys species, count, truck, canMoveNow, confidence, self_corrected, discardedCount.",
  "species is a lowercase English animal word (sheep, goats, dogs, horses, pigs, cats) or null.",
  "count is an integer headcount or null.",
  "truck and canMoveNow are booleans or null (truck = they have transport; canMoveNow = animals can leave now).",
  "confidence is a number from 0 to 1.",
  LAST_CORRECTED_NUMBER_RULE,
  "If they abandon an earlier number, set self_corrected true and discardedCount to that abandoned number; otherwise self_corrected false and discardedCount null.",
].join(" ");

function asReport(value: unknown, transcript: string): PhoneReport | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<PhoneReport>;
  const count = typeof row.count === "number" && Number.isFinite(row.count) ? Math.round(row.count) : null;
  const evidence = extractCorrectionEvidence(transcript);
  return {
    species: typeof row.species === "string" ? row.species : null,
    count,
    truck: typeof row.truck === "boolean" ? row.truck : null,
    canMoveNow: typeof row.canMoveNow === "boolean" ? row.canMoveNow : null,
    confidence: typeof row.confidence === "number" ? row.confidence : 0.5,
    transcript,
    self_corrected: evidence.self_corrected,
    discardedCount: evidence.discardedCount,
    correctionCopy: evidence.correctionCopy,
  };
}

export async function structurePhoneReport(transcript: string): Promise<PhoneReport> {
  const fallback = parsePhoneReportFromTranscript(transcript);
  const key = process.env.NEBIUS_API_KEY?.trim();
  if (!key || !transcript.trim()) {
    return fallback;
  }

  try {
    const response = await fetch(`${resolveNebiusBaseUrl() || DEFAULT_NEBIUS_BASE_URL}chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: resolveNebiusModelId() || DEFAULT_NEBIUS_MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: PHONE_PARSE_PROMPT },
          { role: "user", content: transcript },
        ],
      }),
    });
    if (!response.ok) return fallback;
    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    const parsed = match ? asReport(JSON.parse(match[0]), transcript) : null;
    if (!parsed) return fallback;
    const withCorrection = applyLastCorrectedCount(parsed, transcript);
    const evidence = extractCorrectionEvidence(transcript);
    return {
      ...withCorrection,
      species: withCorrection.species ?? fallback.species,
      truck: withCorrection.truck ?? fallback.truck,
      canMoveNow: withCorrection.canMoveNow ?? fallback.canMoveNow,
      transcript,
      self_corrected: evidence.self_corrected,
      discardedCount: evidence.discardedCount,
      correctionCopy: evidence.correctionCopy,
      count: evidence.count ?? withCorrection.count,
    };
  } catch {
    return fallback;
  }
}
