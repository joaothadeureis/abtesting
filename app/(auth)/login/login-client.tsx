"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginClient() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/dashboard/experiments";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { redirect: false, email, password, callbackUrl });
    setLoading(false);
    if (res?.ok) router.push(callbackUrl);
    else alert("Falha no login");
  };

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form onSubmit={onSubmit} className="p-8 bg-white shadow rounded w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-4">Login</h1>
        <label className="block text-sm mb-1">E-mail</label>
        <input className="border rounded w-full px-3 py-2 mb-3" value={email} onChange={e=>setEmail(e.target.value)} />
        <label className="block text-sm mb-1">Senha</label>
        <input type="password" className="border rounded w-full px-3 py-2 mb-4" value={password} onChange={e=>setPassword(e.target.value)} />
        <button disabled={loading} className="w-full px-4 py-2 rounded bg-blue-600 text-white">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}

