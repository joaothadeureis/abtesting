"use client";

import { useEffect, useMemo, useState } from "react";

export default function InstallModal({ experimentId, entryUrl }: { experimentId: number; entryUrl?: string | null }) {
  const [open, setOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState(entryUrl || "");
  const [result, setResult] = useState<null | { ok: boolean; found: boolean; detail?: string }>(null);
  const origin = (process.env.NEXT_PUBLIC_APP_ORIGIN && process.env.NEXT_PUBLIC_APP_ORIGIN.length > 0)
    ? process.env.NEXT_PUBLIC_APP_ORIGIN
    : (typeof window !== "undefined" ? window.location.origin : "");

  const snippet = useMemo(() => {
    const src = `${origin}/embed/${experimentId}.js`;
    return `<!-- AB-EXPERIMENT:${experimentId} -->\n<script src="${src}" data-exp-id="${experimentId}" data-entry-url="${entryUrl || ""}" data-api-origin="${origin}"></script>`;
  }, [origin, experimentId, entryUrl]);

  async function validate() {
    setResult(null);
    try {
      const res = await fetch("/api/validate-installation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: targetUrl, experimentId }) });
      const json = await res.json();
      setResult(json);
    } catch (e: any) {
      setResult({ ok: false, found: false, detail: String(e?.message || e) });
    }
  }

  useEffect(() => { setTargetUrl(entryUrl || ""); }, [entryUrl]);

  return (
    <>
      <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={() => setOpen(true)}>Instalação do Snippet</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded shadow max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Instalação do Snippet</h2>
              <button onClick={()=>setOpen(false)} className="px-2 py-1 text-sm rounded bg-gray-200">Fechar</button>
            </div>

            <ol className="list-decimal ml-5 space-y-3 text-sm">
              <li>
                No SITE PRINCIPAL (entrypoint: <span className="font-mono">{entryUrl || "(defina)"}</span>), cole o código abaixo antes de <code>&lt;/body&gt;</code>:
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">{snippet}</pre>
                <button className="mt-2 px-2 py-1 rounded bg-gray-200 text-sm" onClick={()=>{ navigator.clipboard.writeText(snippet); }}>Copiar</button>
                {String(origin).includes("localhost") || String(origin).startsWith("http://") ? (
                  <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                    Atenção: esta origem está usando HTTP/localhost. Em páginas HTTPS do cliente, scripts HTTP serão BLOQUEADOS (mixed content).
                    Para testes externos, publique o app em HTTPS (ou use um túnel, ex.: ngrok) e atualize <code>NEXT_PUBLIC_APP_ORIGIN</code> e o snippet.
                  </div>
                ) : null}
              </li>
              <li>
                Nos DEMAIS SITES/VARIANTES, também cole o mesmo snippet antes de <code>&lt;/body&gt;</code>.
              </li>
              <li>
                Teste a instalação:
                <div className="mt-2 flex gap-2">
                  <input placeholder="https://lp.exemplo.com/" className="border rounded px-3 py-2 flex-1" value={targetUrl} onChange={e=>setTargetUrl(e.target.value)} />
                  <button className="px-3 py-2 rounded bg-green-600 text-white" onClick={validate}>Validar</button>
                </div>
                {result && (
                  <div className="mt-2 text-sm">
                    {result.found ? (
                      <span className="px-2 py-1 rounded bg-green-100 text-green-700">Válido</span>
                    ) : (
                      <span className="px-2 py-1 rounded bg-red-100 text-red-700">Não encontrado</span>
                    )}
                    {result.detail ? <div className="mt-1 text-gray-600">{result.detail}</div> : null}
                  </div>
                )}
              </li>
            </ol>

            <div className="text-xs text-gray-500">Dica: se usar CDN/Cache (Cloudflare), limpe o cache após instalar o script. Adblockers podem bloquear beacons; verifique no console.</div>
          </div>
        </div>
      )}
    </>
  );
}
