import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@lib/db";
import { hashIp } from "@lib/hash";

export const runtime = "nodejs";

const botRegex = /(bot|crawler|spider|crawling|curl|wget|httpclient|headless|phantom|slurp|bingpreview|python-requests|axios|node-fetch)/i;

function corsHeaders(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const allowList = (process.env.CORS_ALLOWED_ORIGINS || "").split(",").map(s=>s.trim()).filter(Boolean);
  const allowed = allowList.includes(origin);
  const headers: Record<string,string> = {};
  if (allowed) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
    headers["Access-Control-Allow-Methods"] = "POST,OPTIONS";
    headers["Access-Control-Allow-Headers"] = "content-type";
  }
  return { headers, allowed };
}

export async function OPTIONS(req: NextRequest) {
  const { headers, allowed } = corsHeaders(req);
  if (!allowed) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { status: 204, headers });
}

export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent") || "";
  if (botRegex.test(ua)) return new NextResponse(null, { status: 204 });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    (req as any).ip ||
    "0.0.0.0";
  const ip_hash = hashIp(ip);

  const body = await req.json();
  const { type, experimentId, variantName, sid, ts, props, sessionInit, currentUrl, ref } = body || {};
  if (!type || !experimentId || !variantName || !sid) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const expId = Number(experimentId);

  const variant = await prisma.variant.findFirst({
    where: { experiment_id: expId, name: variantName },
  });
  if (!variant) return NextResponse.json({ error: "invalid variant" }, { status: 400 });

  if (sessionInit) {
    await prisma.session.upsert({
      where: { experiment_id_session_id: { experiment_id: expId, session_id: sid } },
      create: { experiment_id: expId, session_id: sid, variant_id: variant.id },
      update: {},
    });
  }

  await prisma.event.create({
    data: {
      experiment_id: expId,
      variant_id: variant.id,
      session_id: sid,
      type,
      ts: ts ? new Date(ts) : new Date(),
      user_agent: ua,
      ip_hash,
      props: { ...(props || {}), currentUrl: currentUrl || undefined, ref: ref || req.headers.get("referer") || undefined },
    },
  });

  const { headers } = corsHeaders(req);
  return NextResponse.json({ ok: true }, { headers });
}
