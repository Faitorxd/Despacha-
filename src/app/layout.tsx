import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "@/components/ui/sonner";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Despacha+ | Software Logístico",
  description: "Plataforma inteligente de abastecimiento logístico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${plusJakartaSans.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-slate-950 font-sans text-slate-50 flex h-full">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pt-14 pb-16 md:pt-0 md:pb-0">
          {children}
        </main>
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
