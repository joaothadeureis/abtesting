"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

type VariantRef = { id: number; name: "A" | "B" | "C" };

export default function RealtimeClient({ experimentId, variants }: { experimentId: number, variants: VariantRef[] }) {
  const [data15, setData15] = useState<Record<string, { pv: number; click: number; conv: number }>>({});
  const [dataToday, setDataToday] = useState<Record<string, { pv: number; click: number; conv: number }>>({});
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const url = `/api/realtime?experimentId=${experimentId}`;
    const es = new EventSource(url);
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        setData15(payload.last15m || {});
        setDataToday(payload.today || {});
      } catch {}
    };
    es.onerror = () => {
      es.close();
      setTimeout(() => {
        esRef.current = new EventSource(url);
      }, 2000);
    };
    esRef.current = es;
    return () => es.close();
  }, [experimentId]);

  const labels = useMemo(() => variants.map(v=>v.name), [variants]);

  function toBarData(source: Record<string, { pv: number; click: number; conv: number }>, metric: "pv"|"click"|"conv") {
    return {
      labels,
      datasets: [
        {
          label: metric.toUpperCase(),
          data: labels.map(n => source[n]?.[metric] ?? 0),
          backgroundColor: metric === "pv" ? "#93c5fd" : metric === "click" ? "#fbbf24" : "#34d399",
        },
      ],
    };
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="p-4 border rounded bg-white">
        <div className="font-semibold mb-2">PV (últimos 15 min)</div>
        <Bar data={toBarData(data15, "pv")} options={{ responsive: true, plugins: { legend: { display: false } } }} />
      </div>
      <div className="p-4 border rounded bg-white">
        <div className="font-semibold mb-2">Clicks (últimos 15 min)</div>
        <Bar data={toBarData(data15, "click")} options={{ responsive: true, plugins: { legend: { display: false } } }} />
      </div>
      <div className="p-4 border rounded bg-white">
        <div className="font-semibold mb-2">Conversions (últimos 15 min)</div>
        <Bar data={toBarData(data15, "conv")} options={{ responsive: true, plugins: { legend: { display: false } } }} />
      </div>

      <div className="p-4 border rounded bg-white md:col-span-3">
        <div className="font-semibold mb-2">Totais do dia</div>
        <Bar data={{
          labels,
          datasets: [
            { label: "PV", data: labels.map(n=>dataToday[n]?.pv ?? 0), backgroundColor: "#93c5fd" },
            { label: "Clicks", data: labels.map(n=>dataToday[n]?.click ?? 0), backgroundColor: "#fbbf24" },
            { label: "Conv", data: labels.map(n=>dataToday[n]?.conv ?? 0), backgroundColor: "#34d399" },
          ],
        }} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
      </div>
    </div>
  );
}

