import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function Dashboard() {
  const supabase = await createClient();
  
  // Fetch real data
  const { count: totalProducts } = await supabase.from('products').select('*', { count: 'exact', head: true });
  
  // Supabase REST doesn't natively support querying WHERE col1 <= col2 easily without PostgREST or RPC.
  // Instead we fetch all products and filter manually to avoid doing an RPC if they didn't run the RPC SQL.
  const { data: allProducts } = await supabase.from('products').select('stock_current, stock_min');
  const actualLowStock = allProducts ? allProducts.filter(p => p.stock_current <= p.stock_min).length : 0;

  // Get start of month
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
  
  const { count: entriesCount } = await supabase
    .from('inventory_movements')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'entrada')
    .gte('created_at', firstDay);

  const { count: exitsCount } = await supabase
    .from('inventory_movements')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'salida')
    .gte('created_at', firstDay);

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8 md:pt-10">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">Dashboard</h2>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Total Productos
            </CardTitle>
            <div className="h-10 w-10 bg-teal-500/20 rounded-full flex items-center justify-center">
              <Package className="h-5 w-5 text-teal-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totalProducts || 0}</div>
            <p className="text-xs text-slate-500 mt-1">
              Catálogo activo
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Entradas (Mes)
            </CardTitle>
            <div className="h-10 w-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <ArrowDownToLine className="h-5 w-5 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">+{entriesCount || 0}</div>
            <p className="text-xs text-slate-500 mt-1">
              Movimientos recientes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Salidas (Mes)
            </CardTitle>
            <div className="h-10 w-10 bg-rose-500/20 rounded-full flex items-center justify-center">
              <ArrowUpFromLine className="h-5 w-5 text-rose-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">-{exitsCount || 0}</div>
            <p className="text-xs text-slate-500 mt-1">
              Movimientos recientes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-rose-900/50 backdrop-blur-sm shadow-xl border overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-rose-300">
              Stock Bajo
            </CardTitle>
            <div className="h-10 w-10 bg-rose-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-white">{actualLowStock}</div>
            <p className="text-xs text-rose-400/80 mt-1">
              Productos requieren atención
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
