import { timingSafeEqual } from "node:crypto";
import { resolveCallPermission } from "@/lib/call-gate";
import {
  approveSiteCall,
  denySiteCall,
  listVoiceSummaries,
  requestSiteCall,
  toPublicVoiceSummary,
} from "@/lib/voice-calls";
import { getVoiceStatus } from "@/lib/voice-status";

export const dynamic = "force-dynamic";

function configuredVoiceAccessSecret(): string {
  return process.env.CRON_SECRET?.trim() || process.env.ARCA_API_SECRET?.trim() || "";
}

function secretMatches(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function hasVoiceCallAccess(request: Request): boolean {
  // Recommended by Norma — fixed with Cursor Grok 4.6 via Cursor
  const expected = configuredVoiceAccessSecret();
  if (!expected) return false;
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  const headerSecret = request.headers.get("x-arca-secret") ?? "";
  return secretMatches(bearer, expected) || secretMatches(headerSecret, expected);
}

export async function GET(request: Request) {
  if (!hasVoiceCallAccess(request)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  return Response.json({
    ok: true,
    voice: getVoiceStatus(),
    calls: (await listVoiceSummaries()).map(toPublicVoiceSummary),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    siteId?: unknown;
    toNumber?: unknown;
    callId?: unknown;
    town?: unknown;
    coordinatorNumber?: unknown;
    spareTime?: unknown;
  } | null;

  const action = typeof body?.action === "string" ? body.action : "";

  try {
    if (action === "request") {
      const siteId = typeof body?.siteId === "string" ? body.siteId : "";
      const toNumber = typeof body?.toNumber === "string" ? body.toNumber : "";
      const permission = await resolveCallPermission(siteId);
      if (!permission.ok) {
        return Response.json({ ok: false, error: permission.reason }, { status: 400 });
      }
      const spareTime = typeof body?.spareTime === "number" ? body.spareTime : null;
      const coordinatorNumber =
        typeof body?.coordinatorNumber === "string" ? body.coordinatorNumber : null;
      const result = await requestSiteCall({
        siteId: permission.siteId,
        toNumber,
        spareTime,
        coordinatorNumber,
      });
      return Response.json({
        ok: true,
        ...result,
        call: toPublicVoiceSummary(result.call),
        voice: getVoiceStatus(),
      });
    }
    if (action === "approve") {
      const callId = typeof body?.callId === "string" ? body.callId : "";
      const town = typeof body?.town === "string" ? body.town : undefined;
      const coordinatorNumber =
        typeof body?.coordinatorNumber === "string" ? body.coordinatorNumber : undefined;
      const result = await approveSiteCall({
        callId,
        town,
        coordinatorNumber,
      });
      return Response.json({
        ok: true,
        ...result,
        call: toPublicVoiceSummary(result.call),
        voice: getVoiceStatus(),
      });
    }
    if (action === "deny") {
      const callId = typeof body?.callId === "string" ? body.callId : "";
      const call = await denySiteCall(callId);
      return Response.json({
        ok: true,
        call: toPublicVoiceSummary(call),
        voice: getVoiceStatus(),
      });
    }
    return Response.json({ ok: false, error: "action must be request, approve, or deny" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "voice call failed";
    return Response.json({ ok: false, error: message, voice: getVoiceStatus() }, { status: 400 });
  }
}
