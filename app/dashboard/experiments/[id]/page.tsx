import { prisma } from "@lib/db";
import { notFound } from "next/navigation";
import RealtimeClient from "./realtime-client";
import VariantsClient from "./variants-client";
import InstallModal from "@/components/InstallModal";

async function getData(id: number) {
  const exp = await prisma.experiment.findUnique({
    where: { id },
    include: { variants: true, primary_variant: true },
  });
  if (!exp) return null;

  const startOfDay = new Date();
  startOfDay.setHours(0,0,0,0);
  const todayEvents = await prisma.event.findMany({
    where: { experiment_id: id, ts: { gte: startOfDay } },
    select: { variant_id: true, type: true }
  });
  const byVar: Record<number, { pv: number; click: number; conv: number }> = {};
  for (const v of exp.variants) byVar[v.id] = { pv: 0, click: 0, conv: 0 };
  for (const e of todayEvents) {
    const agg = byVar[e.variant_id] ?? (byVar[e.variant_id] = { pv: 0, click: 0, conv: 0 });
    if (e.type === "pageview") agg.pv++;
    else if (e.type === "click") agg.click++;
    else if (e.type === "conversion") agg.conv++;
  }

  return { exp, today: byVar };
}

export default async function ExperimentDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const data = await getData(id);
  if (!data) return notFound();
  const { exp, today } = data;

  async function setPrimary(formData: FormData) {
    "use server";
    const val = Number(formData.get("primary"));
    await prisma.experiment.update({ where: { id: exp.id }, data: { primary_variant_id: val || null } });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Experimento: {exp.slug}</h1>
          <div className="text-gray-600 text-sm">
            Período: {new Date(exp.start_at).toLocaleString()} — {new Date(exp.end_at).toLocaleString()} · Status: {exp.status}
          </div>
          <div className="text-gray-700 text-sm mt-1">Entry URL: <span className="font-mono">{exp.entry_url || "(não definida)"}</span></div>
        </div>
        <form action={setPrimary} className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Definir vencedora:</label>
          <select name="primary" defaultValue={exp.primary_variant?.id ?? ""} className="border rounded px-2 py-1">
            <option value="" disabled>Selecione</option>
            {exp.variants.map(v=> (
              <option key={v.id} value={v.id}>{v.name} — {v.weight}%</option>
            ))}
          </select>
          <button className="px-3 py-1 rounded bg-green-600 text-white">Definir</button>
        </form>
      </div>

      <div>
        <InstallModal experimentId={exp.id} entryUrl={exp.entry_url} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {exp.variants.map(v => {
          const t = today[v.id] || { pv: 0, click: 0, conv: 0 };
          const ctr = t.pv ? (t.click / t.pv) * 100 : 0;
          const cvr = t.pv ? (t.conv / t.pv) * 100 : 0;
          return (
            <div key={v.id} className="p-4 rounded border bg-white">
              <div className="font-semibold mb-1">Variante {v.name}</div>
              <div className="text-xs text-gray-500 break-all mb-2">{v.url}</div>
              <div className="text-sm grid grid-cols-2 gap-x-3">
                <div>PV: <b>{t.pv}</b></div>
                <div>Clicks: <b>{t.click}</b></div>
                <div>Conv: <b>{t.conv}</b></div>
                <div>CTR: <b>{ctr.toFixed(2)}%</b></div>
                <div>CVR: <b>{cvr.toFixed(2)}%</b></div>
                <div>Peso: <b>{v.weight}</b></div>
              </div>
            </div>
          );
        })}
      </div>

      <RealtimeClient experimentId={exp.id} variants={exp.variants.map(v=>({ id: v.id, name: v.name }))} />

      <VariantsClient experimentId={exp.id} initial={exp.variants as any} />
    </div>
  );
}
