"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine, FileText, LogOut, Boxes, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Productos Individuales", href: "/productos", icon: Package },
  { name: "Armar Mercados", href: "/mercados", icon: Boxes },
  { name: "Despachos (Flota)", href: "/despachos", icon: Truck },
  { name: "Entradas", href: "/entradas", icon: ArrowDownToLine },
  { name: "Cierre Mensual", href: "/cierre", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.info("Sesión finalizada");
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex w-64 flex-col border-r bg-slate-900/40 backdrop-blur-xl h-screen sticky top-0">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-slate-800">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Package className="h-6 w-6 text-teal-500" />
          <span>Despacha+</span>
        </h2>
      </div>
      <nav className="flex flex-1 flex-col px-4 py-6 gap-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-x-3 rounded-md p-3 text-sm font-semibold leading-6 transition-all",
                isActive
                  ? "bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.15)]"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              )}
            >
              <item.icon
                className={cn("h-5 w-5 shrink-0", isActive ? "text-teal-400" : "text-slate-400 group-hover:text-white")}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
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
  );
}
