import { randomUUID } from "node:crypto";
import type { PhoneReport } from "./phone-report";

export type TelegramVoiceRecord = {
  requestId: string;
  transcript: string;
  report: PhoneReport;
  fallback: boolean;
  createdAt: string;
};

const records = new Map<string, TelegramVoiceRecord>();

/** Server-side only. HTTP clients receive the request id, not the transcript. */
export function saveTelegramVoiceResult(input: {
  transcript: string;
  report: PhoneReport;
  fallback: boolean;
}): string {
  // Recommended by Norma — fixed with Cursor Grok 4.6 via Cursor
  const requestId = randomUUID();
  records.set(requestId, {
    requestId,
    transcript: input.transcript,
    report: input.report,
    fallback: input.fallback,
    createdAt: new Date().toISOString(),
  });
  return requestId;
}

export function getTelegramVoiceResult(requestId: string): TelegramVoiceRecord | undefined {
  return records.get(requestId);
}
