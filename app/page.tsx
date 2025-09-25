
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="p-8 bg-white shadow rounded max-w-xl w-full">
        <h1 className="text-2xl font-bold mb-4">A/B Mini Platform</h1>
        <p className="mb-6 text-gray-600">Faça login para acessar o dashboard de experimentos.</p>
        <div className="flex gap-3">
          <Link className="px-4 py-2 rounded bg-blue-600 text-white" href="/login">Login</Link>
          <Link className="px-4 py-2 rounded bg-gray-200" href="/dashboard/experiments">Dashboard</Link>
        </div>
      </div>
    </main>
  );
}

