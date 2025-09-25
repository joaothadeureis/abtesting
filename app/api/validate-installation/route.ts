import { NextRequest, NextResponse } from "next/server";
import { findSnippet } from "@/utils/validator/findSnippet";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { url, experimentId } = await req.json().catch(() => ({}));
  if (!url || !experimentId) return NextResponse.json({ ok: false, found: false, detail: "missing params" }, { status: 400 });

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { "User-Agent": "AB-Validator/1.0" } });
    const html = await res.text();
    const found = findSnippet(html, String(experimentId));
    return NextResponse.json({ ok: true, found, detail: found ? "Snippet encontrado." : "Snippet não encontrado." });
  } catch (e: any) {
    return NextResponse.json({ ok: true, found: false, detail: String(e?.message || e) });
  } finally {
    clearTimeout(t);
  }
}

