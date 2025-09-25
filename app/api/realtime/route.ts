import { NextRequest } from "next/server";
import { prisma } from "@lib/db";

export const runtime = "nodejs";

function sseHeaders() {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  } as Record<string, string>;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const experimentId = Number(searchParams.get("experimentId"));
  if (!experimentId) return new Response("Missing experimentId", { status: 400 });

  const variants = await prisma.variant.findMany({
    where: { experiment_id: experimentId },
    select: { id: true, name: true },
  });
  const idToName = new Map<number, "A" | "B" | "C">(variants.map((v) => [v.id, v.name]));

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const safeEnqueue = (s: string) => {
        try { controller.enqueue(enc.encode(s)); } catch {}
      };

      async function pushOnce() {
        const now = new Date();
        const since15 = new Date(now.getTime() - 15 * 60 * 1000);
        const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);

        const [last15, today] = await Promise.all([
          prisma.event.findMany({ where: { experiment_id: experimentId, ts: { gte: since15 } }, select: { variant_id: true, type: true } }),
          prisma.event.findMany({ where: { experiment_id: experimentId, ts: { gte: startOfDay } }, select: { variant_id: true, type: true, props: true } }),
        ]);

        function agg(evts: { variant_id: number; type: string; props?: any }[]) {
          const out: Record<string, { pv: number; click: number; conv: number }> = {};
          const byUrl: Record<string, number> = {};
          for (const v of variants) out[v.name] = { pv: 0, click: 0, conv: 0 };
          for (const e of evts) {
            const n = idToName.get(e.variant_id); if (!n) continue;
            const slot = out[n];
            if (e.type === "pageview") slot.pv++;
            else if (e.type === "click") slot.click++;
            else if (e.type === "conversion") slot.conv++;
            const cu = (e as any).props?.currentUrl; if (cu) byUrl[cu] = (byUrl[cu] || 0) + 1;
          }
          return { byVariant: out, byUrl };
        }

        const payload = { experimentId, generatedAt: now.toISOString(), last15m: agg(last15), today: agg(today) };
        safeEnqueue(`data: ${JSON.stringify(payload)}\n\n`);
      }

      // Initial hello + first payload
      safeEnqueue(`event: hello\ndata: ${JSON.stringify({ ok: true })}\n\n`);
      await pushOnce();

      // Update loop + heartbeat
      const intervalId = setInterval(pushOnce, 2000);
      const pingId = setInterval(() => safeEnqueue(`:ping\n\n`), 15000);

      const cleanup = () => {
        clearInterval(intervalId);
        clearInterval(pingId);
        try { controller.close(); } catch {}
      };

      if (req.signal.aborted) cleanup();
      req.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      // no-op: cleanup handled via abort
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}
