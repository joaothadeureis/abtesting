import { prisma } from "@lib/db";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const experimentId = Number(searchParams.get("experimentId"));
  const where = experimentId ? { experiment_id: experimentId } : {};
  const vars = await prisma.variant.findMany({ where });
  return NextResponse.json(vars);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { experiment_id, name, url, weight, is_active } = body;
  if (!experiment_id || !name || !url) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const v = await prisma.variant.create({
    data: { experiment_id: Number(experiment_id), name, url, weight: Number(weight) || 0, is_active: typeof is_active === 'boolean' ? is_active : true },
  });
  return NextResponse.json(v, { status: 201 });
}
