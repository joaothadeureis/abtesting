"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Variant = { id: number; name: "A"|"B"|"C"; url: string; weight: number; is_active: boolean };

export default function EditExperimentPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [entryUrl, setEntryUrl] = useState<string>("");
  const [vars, setVars] = useState<Variant[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/experiments/${id}`);
      const exp = await res.json();
      setSlug(exp.slug);
      setStart(new Date(exp.start_at).toISOString().slice(0,16));
      setEnd(new Date(exp.end_at).toISOString().slice(0,16));
      setEntryUrl(exp.entry_url || "");
      setVars(exp.variants);
      setLoading(false);
    })();
  }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = { slug, start_at: new Date(start), end_at: new Date(end), entry_url: entryUrl };
    await fetch(`/api/experiments/${id}`, { method: "PUT", headers: {"content-type":"application/json"}, body: JSON.stringify(payload) });
    await Promise.all(vars.map(v => fetch(`/api/variants/${v.id}`, { method: "PUT", headers: {"content-type":"application/json"}, body: JSON.stringify({ url: v.url, weight: v.weight, is_active: v.is_active }) })));
    router.push(`/dashboard/experiments/${id}`);
  }

  if (loading) return <div className="p-4">Carregando…</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">Editar Experimento</h1>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Slug</label>
          <input className="border rounded w-full px-3 py-2" value={slug} onChange={e=>setSlug(e.target.value)} />
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
        <div>
          <div className="font-semibold mb-2">URLs do teste</div>
          {vars.map((v, idx) => (
            <div key={v.id} className="flex items-center gap-2 mb-2">
              <span className="w-6">{v.name}</span>
              <input className="border rounded px-2 py-1 flex-1" value={v.url} onChange={e=>setVars(prev=>prev.map((x,i)=> i===idx? {...x, url: e.target.value }: x))} />
              <input type="number" className="border rounded px-2 py-1 w-24" value={v.weight} onChange={e=>setVars(prev=>prev.map((x,i)=> i===idx? {...x, weight: Number(e.target.value) }: x))} />
              <label className="text-sm"><input type="checkbox" checked={v.is_active} onChange={e=>setVars(prev=>prev.map((x,i)=> i===idx? {...x, is_active: e.target.checked }: x))} /> ativo</label>
              <label className="ml-3 text-sm"><input type="radio" name="entry" checked={entryUrl === v.url} onChange={()=>setEntryUrl(v.url)} /> URL principal</label>
            </div>
          ))}
        </div>
        <button className="px-4 py-2 rounded bg-blue-600 text-white">Salvar</button>
      </form>
    </div>
  );
}

