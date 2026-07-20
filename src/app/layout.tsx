import type { Metadata } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Site Book — Gestão Kanban",
  description:
    "Kanban de Site Books com checklist, comentários e painel de filtros em massa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${outfit.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col overflow-x-hidden overflow-y-auto">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
