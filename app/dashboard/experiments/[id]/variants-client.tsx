"use client";

import { useState } from "react";

type Variant = { id: number; name: "A"|"B"|"C"; url: string; weight: number; experiment_id?: number };

export default function VariantsClient({ experimentId, initial }: { experimentId: number, initial: Variant[] }) {
  const [vars, setVars] = useState<Variant[]>(initial);

  async function addVariant(name: "A"|"B"|"C") {
    const url = prompt(`URL da variante ${name}:`, "https://example.com/landing");
    if (!url) return;
    const weight = Number(prompt("Peso (0-100):", "0") || 0);
    const res = await fetch("/api/variants", {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({ experiment_id: experimentId, name, url, weight })
    });
    if (res.ok) {
      const v = await res.json();
      setVars(prev => [...prev, v]);
      location.reload();
    } else {
      alert("Erro ao adicionar variante");
    }
  }

  async function updateVariant(v: Variant) {
    const url = prompt(`URL da variante ${v.name}:`, v.url) ?? v.url;
    const weight = Number(prompt("Peso (0-100):", String(v.weight)) ?? v.weight);
    const res = await fetch(`/api/variants/${v.id}`, {
      method: "PUT",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({ url, weight })
    });
    if (res.ok) {
      setVars(prev => prev.map(x => x.id === v.id ? { ...v, url, weight } : x));
      location.reload();
    } else {
      alert("Erro ao atualizar variante");
    }
  }

  async function deleteVariant(v: Variant) {
    if (!confirm(`Excluir variante ${v.name}?`)) return;
    const res = await fetch(`/api/variants/${v.id}`, { method: "DELETE" });
    if (res.ok) {
      setVars(prev => prev.filter(x => x.id !== v.id));
      location.reload();
    } else {
      alert("Erro ao excluir");
    }
  }

  const existingNames = new Set(vars.map(v=>v.name));
  const canAdd = (name: "A"|"B"|"C") => !existingNames.has(name);

  return (
    <div className="p-4 border rounded bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">Variantes (CRUD)</div>
        <div className="space-x-2">
          <button disabled={!canAdd("A")} onClick={()=>addVariant("A")} className="px-2 py-1 rounded bg-blue-600 text-white disabled:opacity-40">+ A</button>
          <button disabled={!canAdd("B")} onClick={()=>addVariant("B")} className="px-2 py-1 rounded bg-blue-600 text-white disabled:opacity-40">+ B</button>
          <button disabled={!canAdd("C")} onClick={()=>addVariant("C")} className="px-2 py-1 rounded bg-blue-600 text-white disabled:opacity-40">+ C</button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-2">Nome</th>
            <th className="text-left p-2">URL</th>
            <th className="text-left p-2">Peso</th>
            <th className="text-left p-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {vars.map(v=>(
            <tr key={v.id} className="border-t">
              <td className="p-2">{v.name}</td>
              <td className="p-2 break-all">{v.url}</td>
              <td className="p-2">{v.weight}</td>
              <td className="p-2 space-x-2">
                <button onClick={()=>updateVariant(v)} className="px-2 py-1 rounded bg-gray-200">Editar</button>
                <button onClick={()=>deleteVariant(v)} className="px-2 py-1 rounded bg-red-600 text-white">Excluir</button>
              </td>
            </tr>
          ))}
          {vars.length === 0 && <tr><td colSpan={4} className="p-3 text-center text-gray-500">Nenhuma variante</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

