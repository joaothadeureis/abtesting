import { prisma } from "@lib/db";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const exp = await prisma.experiment.findUnique({
    where: { id },
    include: { variants: true, primary_variant: true },
  });
  if (!exp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(exp);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const body = await req.json();
  const { slug, start_at, end_at, status, primary_variant_id, entry_url } = body;

  const data: any = {};
  if (slug) data.slug = slug;
  if (start_at) data.start_at = new Date(start_at);
  if (end_at) data.end_at = new Date(end_at);
  if (status) data.status = status;
  if (typeof primary_variant_id !== "undefined") data.primary_variant_id = primary_variant_id || null;
  if (typeof entry_url !== "undefined") data.entry_url = entry_url || null;

  const exp = await prisma.experiment.update({ where: { id }, data });
  return NextResponse.json(exp);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  await prisma.experiment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
