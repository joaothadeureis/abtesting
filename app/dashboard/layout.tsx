import { ReactNode } from "react";
import { getServerAuthSession } from "@lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold">A/B Mini Platform</Link>
          <div className="space-x-4 text-sm">
            <Link href="/dashboard/experiments">Experimentos</Link>
            <span className="text-gray-600">Logado: {session.user?.email}</span>
          </div>
        </div>
      </nav>
      <div className="max-w-6xl mx-auto p-4">{children}</div>
    </div>
  );
}

