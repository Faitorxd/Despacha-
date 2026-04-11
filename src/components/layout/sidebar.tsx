"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  LogOut,
  Boxes,
  Truck,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Productos", href: "/productos", icon: Package },
  { name: "Mercados", href: "/mercados", icon: Boxes },
  { name: "Despachos", href: "/despachos", icon: Truck },
  { name: "Entradas", href: "/entradas", icon: ArrowDownToLine },
  { name: "Salidas", href: "/salidas", icon: ArrowUpFromLine },
  { name: "Cierre", href: "/cierre", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.info("Sesión finalizada");
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <>
      {/* ── DESKTOP SIDEBAR ─────────────────────────────────── */}
      <div className="hidden md:flex w-64 flex-col border-r bg-slate-900/40 backdrop-blur-xl h-screen sticky top-0 shrink-0">
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-slate-800">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Package className="h-6 w-6 text-teal-500" />
            <span>Despacha+</span>
          </h2>
        </div>
        <nav className="flex flex-1 flex-col px-4 py-6 gap-2">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-x-3 rounded-md p-3 text-sm font-semibold leading-6 transition-all",
                isActive(item.href)
                  ? "bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.15)]"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  isActive(item.href)
                    ? "text-teal-400"
                    : "text-slate-400 group-hover:text-white"
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="px-6 py-6 border-t border-slate-800 flex flex-col gap-4 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Cerrar Sesión
          </button>
          <div className="text-xs text-slate-500">
            Despacha+ Logística v1.0 <br />
            &copy; 2026 Admin
          </div>
        </div>
      </div>

      {/* ── MOBILE TOPBAR ────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between px-4 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
          <Package className="h-5 w-5 text-teal-500" />
          <span>Despacha+</span>
        </h2>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* ── MOBILE DRAWER OVERLAY ─────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer panel */}
          <div className="relative flex w-72 max-w-[85vw] flex-col bg-slate-900 border-r border-slate-800 h-full overflow-y-auto">
            <div className="flex h-14 shrink-0 items-center justify-between px-5 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-teal-500" />
                Despacha+
              </h2>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col px-4 py-6 gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group flex items-center gap-x-3 rounded-md p-3 text-sm font-semibold leading-6 transition-all",
                    isActive(item.href)
                      ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isActive(item.href)
                        ? "text-teal-400"
                        : "text-slate-400 group-hover:text-white"
                    )}
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="px-5 py-5 border-t border-slate-800 mt-auto">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-x-3 rounded-md p-2 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                Cerrar Sesión
              </button>
              <div className="text-xs text-slate-500 mt-3">
                Despacha+ v1.0 &copy; 2026 Admin
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE BOTTOM NAV ─────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 h-16 px-1">
        {navigation.slice(0, 5).map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-all",
                active ? "text-teal-400" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="text-[10px] font-medium leading-tight truncate max-w-[4rem] text-center">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
