"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewExperimentPage() {
  const router = useRouter();
  const [slug, setSlug] = useState("exemplo-2");
  const [start, setStart] = useState(() => new Date().toISOString().slice(0,16));
  const [end, setEnd] = useState(() => new Date(Date.now()+7*24*60*60*1000).toISOString().slice(0,16));
  const [vars, setVars] = useState([
    { enabled: true, name: "A" as const, url: "https://example.com/a", weight: 50, isEntry: true },
    { enabled: true, name: "B" as const, url: "https://example.com/b", weight: 50, isEntry: false },
    { enabled: false, name: "C" as const, url: "https://example.com/c", weight: 0, isEntry: false },
  ]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const entry = vars.find(v=>v.isEntry && v.enabled);
    if (!entry) { alert("Selecione a URL principal (entrypoint)"); return; }
    const payload = {
      slug,
      start_at: new Date(start),
      end_at: new Date(end),
      status: "running",
      entry_url: entry.url,
      variants: vars.filter(v=>v.enabled).map(v=>({ name: v.name, url: v.url, weight: Number(v.weight)||0 })),
    };
    const res = await fetch("/api/experiments", { method: "POST", headers: {"content-type":"application/json"}, body: JSON.stringify(payload) });
    if (res.ok) {
      const exp = await res.json();
      router.push(`/dashboard/experiments/${exp.id}`);
    } else {
      alert("Erro ao criar experimento");
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-4">Novo Experimento</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Slug</label>
          <input className="border rounded w-full px-3 py-2" value={slug} onChange={e=>setSlug(e.target.value)} placeholder="oferta-x" />
          <div className="text-xs text-gray-500 mt-1">URL canônica: /go/{slug || "slug"}</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Início</label>
            <input type="datetime-local" className="border rounded w-full px-3 py-2" value={start} onChange={e=>setStart(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Fim</label>
            <input type="datetime-local" className="border rounded w-full px-3 py-2" value={end} onChange={e=>setEnd(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="font-semibold">Variantes (1–3)</div>
          {vars.map((v, i)=>(
            <div key={i} className="flex items-center gap-2">
              <input type="checkbox" checked={v.enabled} onChange={e=>setVars(prev=>prev.map((x,idx)=> idx===i ? {...x, enabled: e.target.checked } : x))} />
              <span className="w-6">{v.name}</span>
              <input className="border rounded px-2 py-1 flex-1" placeholder="URL" value={v.url} onChange={e=>setVars(prev=>prev.map((x,idx)=> idx===i ? {...x, url: e.target.value } : x))} />
              <input type="number" className="border rounded px-2 py-1 w-24" value={v.weight} onChange={e=>setVars(prev=>prev.map((x,idx)=> idx===i ? {...x, weight: Number(e.target.value) } : x))} />
              <label className="ml-2 flex items-center gap-1 text-sm"><input type="radio" name="entry" checked={!!v.isEntry} onChange={()=>setVars(prev=>prev.map((x,idx)=> ({...x, isEntry: idx===i} as any)))} /> URL principal</label>
            </div>
          ))}
        </div>

        <button className="px-4 py-2 rounded bg-blue-600 text-white">Criar</button>
      </form>
    </div>
  );
}
