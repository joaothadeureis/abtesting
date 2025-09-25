import TrackSnippet from "@/components/TrackSnippet";

export default function VariantA({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const expId = Number(searchParams.exp) || Number(searchParams.experimentId) || 0;
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="max-w-xl w-full p-8 bg-white shadow rounded space-y-4 text-center">
        <h1 className="text-2xl font-bold">Variante A</h1>
        <p className="text-gray-600">Página interna para testes de tracking.</p>
        <a href="#" data-track="cta-a" className="inline-block px-4 py-2 rounded bg-blue-600 text-white">Call To Action A</a>
        <form data-conversion-form name="lead-a" className="space-y-2">
          <input className="border rounded px-3 py-2 w-full" placeholder="Seu e-mail" />
          <button className="px-4 py-2 rounded bg-green-600 text-white">Enviar</button>
        </form>
      </div>
      {expId ? <TrackSnippet experimentId={expId} /> : null}
    </main>
  );
}

