import { prisma } from "@lib/db";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (slug) {
    const exp = await prisma.experiment.findUnique({
      where: { slug },
      include: { variants: true, primary_variant: true },
    });
    if (!exp) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(exp);
  }
  const exps = await prisma.experiment.findMany({
    orderBy: { created_at: "desc" },
    include: { primary_variant: true },
  });
  return NextResponse.json(exps);
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { slug, start_at, end_at, status, variants, entry_url } = data;
    if (!slug || !start_at || !end_at || !status || !Array.isArray(variants) || variants.length < 1) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const exp = await prisma.experiment.create({
      data: {
        slug,
        start_at: new Date(start_at),
        end_at: new Date(end_at),
        status,
        entry_url: entry_url || null,
        variants: {
          create: variants.map((v: any) => ({ name: v.name, url: v.url, weight: Number(v.weight) || 0 })),
        },
      },
      include: { variants: true },
    });
    return NextResponse.json(exp, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: "create_failed", detail: String(e?.message || e) }, { status: 500 });
  }
}
