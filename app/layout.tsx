import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "A/B Mini Platform",
  description: "Mini plataforma de testes A/B",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-br">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}

