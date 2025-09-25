import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@lib/db";
import { stableBucket } from "@lib/hash";

export const runtime = "nodejs";

function corsHeaders(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const allowList = (process.env.CORS_ALLOWED_ORIGINS || "").split(",").map(s=>s.trim()).filter(Boolean);
  const allowed = allowList.includes(origin);
  const headers: Record<string,string> = {};
  if (allowed) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
    headers["Access-Control-Allow-Methods"] = "GET,OPTIONS";
    headers["Access-Control-Allow-Headers"] = "content-type";
  }
  return { headers, allowed };
}

export async function OPTIONS(req: NextRequest) {
  const { headers, allowed } = corsHeaders(req);
  if (!allowed) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { status: 204, headers });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const experimentId = Number(searchParams.get("experimentId"));
  const sid = String(searchParams.get("sid") || "");
  const current = String(searchParams.get("current") || "");

  const { headers } = corsHeaders(req);

  if (!experimentId || !sid) {
    return NextResponse.json({ error: "missing params" }, { status: 400, headers });
  }

  const exp = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: { variants: { where: { is_active: true } }, primary_variant: true },
  });
  if (!exp || exp.variants.length === 0) {
    return NextResponse.json({ error: "experiment not found" }, { status: 404, headers });
  }

  // Stickiness: if session exists, return its variant
  const existing = await prisma.session.findUnique({
    where: { experiment_id_session_id: { experiment_id: experimentId, session_id: sid } },
    include: { variant: true },
  });
  if (existing) {
    return NextResponse.json({
      assignedVariant: { id: existing.variant_id, name: existing.variant.name, url: existing.variant.url },
      experiment: { id: exp.id, entry_url: exp.entry_url },
      sticky: true,
      source: "session",
    }, { headers });
  }

  // Choose variant
  const now = new Date();
  const inPeriod = now >= exp.start_at && now <= exp.end_at;
  let chosen = null as null | { id: number; name: "A"|"B"|"C"; url: string };

  if (!inPeriod && exp.primary_variant_id) {
    const pv = exp.variants.find(v => v.id === exp.primary_variant_id) || exp.primary_variant || exp.variants[0];
    chosen = { id: pv.id, name: pv.name as any, url: pv.url };
  } else {
    const bucket = stableBucket(`${sid}:${experimentId}`, 10000);
    const variants = exp.variants.map(v => ({ id: v.id, name: v.name as any, url: v.url, weight: Math.max(0, v.weight) }));
    const total = variants.reduce((a, v) => a + v.weight, 0) || 1;
    let acc = 0; let pick = variants[0];
    for (const v of variants) {
      const range = Math.floor((v.weight / total) * 10000);
      if (bucket >= acc && bucket < acc + range) { pick = v; break; }
      acc += range;
    }
    chosen = { id: pick.id, name: pick.name, url: pick.url };
  }

  // Upsert session
  await prisma.session.upsert({
    where: { experiment_id_session_id: { experiment_id: experimentId, session_id: sid } },
    create: { experiment_id: experimentId, session_id: sid, variant_id: chosen!.id },
    update: {},
  });

  return NextResponse.json({
    assignedVariant: chosen,
    experiment: { id: exp.id, entry_url: exp.entry_url },
    sticky: true,
    source: "new",
  }, { headers });
}

