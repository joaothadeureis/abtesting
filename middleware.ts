import { NextRequest, NextResponse } from "next/server";
import { stableBucket } from "@lib/hash";

export const config = { matcher: ["/go/:path*"] };

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  if (!pathname.startsWith("/go/")) return NextResponse.next();

  const slug = pathname.replace("/go/", "").replace(/\/+$/, "");
  if (!slug) return NextResponse.next();

  const res = NextResponse.next();

  // sid cookie (HttpOnly)
  let sid = req.cookies.get("sid")?.value;
  if (!sid) {
    sid = crypto.randomUUID();
    res.cookies.set("sid", sid, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  // Fetch experiment by slug
  const expResp = await fetch(new URL(`/api/experiments?slug=${encodeURIComponent(slug)}`, req.url), {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!expResp.ok) return res;
  const exp = await expResp.json();
  if (!exp || !exp.id || !exp.variants?.length) return res;

  const expId: number = exp.id;
  const startAt = new Date(exp.start_at);
  const endAt = new Date(exp.end_at);
  const now = new Date();

  const stickyCookieName = `exp_${expId}_var`;
  const sticky = req.cookies.get(stickyCookieName)?.value as "A" | "B" | "C" | undefined;

  let chosen = exp.variants.find((v: any) => v.name === sticky);

  if (!chosen) {
    const inPeriod = now >= startAt && now <= endAt;
    const hasPrimary = !!exp.primary_variant_id;
    if (!inPeriod && hasPrimary) {
      chosen = exp.variants.find((v: any) => v.id === exp.primary_variant_id) ?? exp.variants[0];
    } else {
      const bucket = stableBucket(`${sid}:${expId}`, 10000);
      const variants = exp.variants.map((v: any) => ({ id: v.id, name: v.name, weight: v.weight }));
      const total = variants.reduce((a: number, v: any) => a + Math.max(0, v.weight), 0);
      let acc = 0;
      let picked = variants[0];
      for (const v of variants) {
        const range = Math.floor((Math.max(0, v.weight) / (total || 1)) * 10000);
        if (bucket >= acc && bucket < acc + range) { picked = v; break; }
        acc += range;
      }
      chosen = exp.variants.find((v: any) => v.id === picked.id) ?? exp.variants[0];
    }
  }

  // Set sticky cookie for variant
  res.cookies.set(stickyCookieName, chosen.name, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  // Bootstrap session + initial pageview
  try {
    await fetch(new URL("/api/track", req.url), {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        type: "pageview",
        experimentId: expId,
        variantName: chosen.name,
        sid,
        props: { source: "bootstrap", via: "middleware" },
        sessionInit: true,
      }),
    });
  } catch {}

  // Build redirect to variant URL
  const variantUrl: string = chosen.url;
  const dst = new URL(variantUrl, req.url);
  for (const [k, v] of url.searchParams.entries()) dst.searchParams.set(k, v);
  dst.searchParams.set("v", chosen.name);
  dst.searchParams.set("sid", sid);
  dst.searchParams.set("exp", String(expId));

  const redirectRes = NextResponse.redirect(dst, { status: 302 });
  for (const cookie of res.cookies.getAll()) redirectRes.cookies.set(cookie);
  return redirectRes;
}
