import { prisma } from "@lib/db";
import Link from "next/link";

async function getExperiments() {
  const exps = await prisma.experiment.findMany({
    orderBy: { created_at: "desc" },
    include: {
      primary_variant: { select: { name: true } },
      _count: { select: { variants: true, sessions: true, events: true } },
    },
  });
  return exps;
}

export default async function ExperimentsListPage() {
  const exps = await getExperiments();

  async function remove(id: number) {
    "use server";
    await prisma.experiment.delete({ where: { id } });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Experimentos</h1>
        <Link href="/dashboard/experiments/new" className="px-3 py-2 rounded bg-blue-600 text-white">+ Novo</Link>
      </div>
      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Slug</th>
              <th className="text-left p-2">Período</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Principal</th>
              <th className="text-left p-2">Stats</th>
              <th className="text-left p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {exps.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-2 font-mono">/go/{e.slug}</td>
                <td className="p-2">{new Date(e.start_at).toLocaleDateString()} - {new Date(e.end_at).toLocaleDateString()}</td>
                <td className="p-2">{e.status}</td>
                <td className="p-2">{e.primary_variant?.name ?? "-"}</td>
                <td className="p-2 text-gray-600">{e._count.variants} var · {e._count.sessions} sess · {e._count.events} evts</td>
                <td className="p-2 space-x-2">
                  <Link href={`/dashboard/experiments/${e.id}`} className="px-2 py-1 rounded bg-gray-200">Detalhes</Link>
                  <Link href={`/dashboard/experiments/${e.id}/edit`} className="px-2 py-1 rounded bg-gray-200">Editar</Link>
                  <form action={remove.bind(null, e.id)} className="inline">
                    <button className="px-2 py-1 rounded bg-red-600 text-white">Excluir</button>
                  </form>
                </td>
              </tr>
            ))}
            {exps.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center text-gray-500">Nenhum experimento. Rode o seed.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
