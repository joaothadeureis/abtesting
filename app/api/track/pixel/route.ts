import { NextRequest } from "next/server";
import { prisma } from "@lib/db";
import { hashIp } from "@lib/hash";

export const runtime = "nodejs";

// 1x1 transparent GIF
const GIF = new Uint8Array([
  71,73,70,56,57,97,1,0,1,0,128,0,0,0,0,0,255,255,255,33,249,4,1,0,0,1,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0,59
]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") || "pageview") as "pageview"|"click"|"conversion";
    const experimentId = Number(searchParams.get("experimentId"));
    const variantName = (searchParams.get("variantName") || "A") as "A"|"B"|"C";
    const sid = String(searchParams.get("sid") || "");
    const current = searchParams.get("current") || undefined;
    const ref = searchParams.get("ref") || undefined;
    if (!experimentId || !sid) throw new Error("missing params");

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      (req as any).ip ||
      "0.0.0.0";
    const ip_hash = hashIp(ip);

    const variant = await prisma.variant.findFirst({ where: { experiment_id: experimentId, name: variantName } });
    if (variant) {
      await prisma.event.create({
        data: {
          experiment_id: experimentId,
          variant_id: variant.id,
          session_id: sid,
          type,
          user_agent: req.headers.get("user-agent") || "",
          ip_hash,
          props: { currentUrl: current, ref },
        },
      });
    }
  } catch {}

  return new Response(GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, private",
      "Content-Length": String(GIF.length),
    },
  });
}

