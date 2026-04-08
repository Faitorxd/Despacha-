"use client";

import { useState, useEffect } from "react";
import { FileText, Save, TrendingUp, TrendingDown, DollarSign, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function CierreMensualPage() {
  const [closings, setClosings] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  
  // Current month stats
  const [currentStats, setCurrentStats] = useState({
    entries: 0,
    exits: 0,
    total_cost: 0,
    count_entries: 0,
    count_exits: 0
  });

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();

  const fetchClosings = async () => {
    setLoading(true);
    
    // Fetch historical closings
    const { data: history } = await supabase
      .from("monthly_closings")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false });
      
    // Fetch Low Stock Products
    const { data: allProducts } = await supabase.from("products").select("name, category, stock_current, stock_min, unit");
    const actualLowStock = allProducts ? allProducts.filter(p => p.stock_current <= p.stock_min) : [];
    setLowStockProducts(actualLowStock);
      
    // Calculate current month's live data
    // In a real prod environment, you'd use a server action or RPC rather than fetching all client side
    // For demo purposes and low volume, we fetch current month's movements
    const firstDay = new Date(currentYear, currentMonth - 1, 1).toISOString();
    const lastDay = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString();
    
    const { data: currentMovements } = await supabase
      .from("inventory_movements")
      .select("*")
      .gte("created_at", firstDay)
      .lte("created_at", lastDay);

    let entries = 0;
    let exits = 0;
    let cost = 0;
    let countE = 0;
    let countS = 0;

    if (currentMovements) {
      currentMovements.forEach(m => {
        if (m.type === "entrada") {
          entries += m.total;
          cost += m.total;
          countE++;
        } else {
          exits += m.total;
          countS++;
        }
      });
    }

    setCurrentStats({
      entries,
      exits,
      total_cost: cost,
      count_entries: countE,
      count_exits: countS
    });

    setClosings(history || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchClosings();
  }, []);

  const handleGenerateClosing = async () => {
    // Check if it's already closed
    const alreadyClosed = closings.some(c => c.month === currentMonth && c.year === currentYear);
    if (alreadyClosed) {
      toast.error("Error", { description: "Ya se generó el cierre para este mes." });
      return;
    }

    if(!window.confirm(`¿Seguro que deseas sellar el mes de ${currentDate.toLocaleString('es-ES', { month: 'long' })}?`)) return;

    const payload = {
      month: currentMonth,
      year: currentYear,
      total_entries: currentStats.entries,
      total_exits: currentStats.exits,
      total_cost: currentStats.total_cost
    };

    const { error } = await supabase.from("monthly_closings").insert([payload]);

    if (error) {
      toast.error("Error", { description: error.message });
    } else {
      toast.success("Cierre Generado", { description: "El registro ha sido almacenado."});
      fetchClosings();
    }
  };

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  return (
    <div className="flex-1 space-y-8 p-8 pt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <FileText className="h-8 w-8 text-amber-500" />
          Cierres Mensuales
        </h2>
        
        <Button 
          onClick={handleGenerateClosing} 
          className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold shadow-[0_0_20px_rgba(245,158,11,0.3)]"
          disabled={closings.some(c => c.month === currentMonth && c.year === currentYear)}
        >
          <Save className="mr-2 h-4 w-4" /> Guardar Cierre del Mes Activo
        </Button>
      </div>

      <div>
        <h3 className="text-lg font-medium text-slate-400 mb-4 uppercase tracking-wider">Balance en Vivo: {monthNames[currentMonth-1]} {currentYear}</h3>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-blue-500/10 border-blue-500/20 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 blur-3xl rounded-full -mr-10 -mt-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-300">
                Inversión (Entradas)
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{currentStats.entries.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              <p className="text-xs text-blue-400 mt-1">En {currentStats.count_entries} ingresos</p>
            </CardContent>
          </Card>

          <Card className="bg-rose-500/10 border-rose-500/20 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/20 blur-3xl rounded-full -mr-10 -mt-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-rose-300">
                Valor Entregado (Salidas)
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-rose-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{currentStats.exits.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              <p className="text-xs text-rose-400 mt-1">En {currentStats.count_exits} entregas</p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/10 border-emerald-500/20 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/20 blur-3xl rounded-full -mr-10 -mt-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-300">
                Apropiación (Diferencia)
              </CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${currentStats.entries - currentStats.exits >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {(currentStats.entries - currentStats.exits).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-emerald-400/80 mt-1">Inv. total vs Entregado</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="rounded-md border border-rose-900/50 bg-rose-500/5 backdrop-blur-xl shrink-0 overflow-hidden shadow-2xl mt-8">
        <div className="px-6 py-4 border-b border-rose-900/50 flex items-center gap-2">
           <AlertCircle className="h-5 w-5 text-rose-400" />
           <h3 className="font-semibold text-rose-200">Requisición de Compras (Stock Crítico)</h3>
        </div>
        <Table>
          <TableHeader className="bg-rose-950/20">
            <TableRow className="border-rose-900/30 hover:bg-transparent">
              <TableHead className="text-rose-400">Producto</TableHead>
              <TableHead className="text-rose-400">Categoría</TableHead>
              <TableHead className="text-rose-400">Stock Actual</TableHead>
              <TableHead className="text-rose-400">Mínimo Requerido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-rose-900/30 hover:bg-rose-900/10">
                <TableCell colSpan={4} className="h-16 text-center text-rose-600">Calculando faltantes...</TableCell>
              </TableRow>
            ) : lowStockProducts.length === 0 ? (
              <TableRow className="border-rose-900/30 hover:bg-rose-900/10">
                <TableCell colSpan={4} className="h-16 text-center text-emerald-500 font-medium">Todo está en orden. No hay productos críticos.</TableCell>
              </TableRow>
            ) : (
              lowStockProducts.map((prod, idx) => (
                <TableRow key={idx} className="border-rose-900/30 hover:bg-rose-900/10 transition-colors">
                  <TableCell className="font-medium text-rose-100">{prod.name}</TableCell>
                  <TableCell className="text-rose-300">{prod.category}</TableCell>
                  <TableCell className="font-bold text-rose-400">{prod.stock_current} {prod.unit}s</TableCell>
                  <TableCell className="text-rose-300/60">{prod.stock_min} {prod.unit}s</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-md border border-slate-800 bg-slate-900/50 backdrop-blur-xl shrink-0 overflow-hidden shadow-2xl mt-8">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
           <Calendar className="h-5 w-5 text-slate-400" />
           <h3 className="font-semibold text-slate-200">Historial de Cierres</h3>
        </div>
        <Table>
          <TableHeader className="bg-slate-900">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Periodo (Mes/Año)</TableHead>
              <TableHead className="text-slate-400">Total Entradas</TableHead>
              <TableHead className="text-slate-400">Total Salidas</TableHead>
              <TableHead className="text-slate-400">Costo Total Stock</TableHead>
              <TableHead className="text-slate-400 text-right">Fecha Sello</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-slate-800 hover:bg-slate-800/50">
                <TableCell colSpan={5} className="h-24 text-center text-slate-500">Cargando historiales...</TableCell>
              </TableRow>
            ) : closings.length === 0 ? (
              <TableRow className="border-slate-800 hover:bg-slate-800/50">
                <TableCell colSpan={5} className="h-24 text-center text-slate-500">Aún no hay ningún mes cerrado.</TableCell>
              </TableRow>
            ) : (
              closings.map((close) => (
                <TableRow key={close.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <TableCell className="font-medium text-slate-200 uppercase">
                    {monthNames[close.month - 1]} {close.year}
                  </TableCell>
                  <TableCell className="text-blue-400">
                    {close.total_entries?.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-rose-400">
                    {close.total_exits?.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {close.total_cost?.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right text-slate-500 text-xs">
                    {new Date(close.created_at).toLocaleString('es-CO')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
