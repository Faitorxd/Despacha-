"use client";

import { useState, useEffect } from "react";
import { Plus, ArrowUpFromLine, Package, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function SalidasPage() {
  const supabase = createClient();
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: 1,
    unit_cost: 0,
    reason: ""
  });

  const fetchData = async () => {
    setLoading(true);
    // Fetch recent exits
    const { data: mvts, error: mvtsErr } = await supabase
      .from("inventory_movements")
      .select(`
        *,
        products (name, category, unit, stock_current)
      `)
      .eq("type", "salida")
      .order("created_at", { ascending: false })
      .limit(50);
      
    // Fetch products for dropdown
    const { data: prods } = await supabase
      .from("products")
      .select("id, name, cost_price, stock_current")
      .order("name", { ascending: true });

    if (mvtsErr) {
      toast.error("Error al cargar salidas", { description: mvtsErr.message });
    } else {
      setMovements(mvts || []);
      setProducts(prods || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProductSelect = (val: string | null) => {
    if (!val) return;
    const selectedProd = products.find(p => p.id === val);
    setFormData({
      ...formData,
      product_id: val,
      unit_cost: selectedProd ? selectedProd.cost_price : 0
    });
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.product_id) {
       toast.error("Faltan datos", { description: "Debes seleccionar un producto." });
       return;
    }

    const selectedProd = products.find(p => p.id === formData.product_id);
    if(selectedProd && formData.quantity > selectedProd.stock_current) {
        toast.error("Stock insuficiente", { description: `Solo hay ${selectedProd.stock_current} unidades disponibles.` });
        return;
    }

    const payload = {
      product_id: formData.product_id,
      type: "salida",
      quantity: formData.quantity,
      unit_cost: formData.unit_cost,
      reason: formData.reason
    };

    const { error } = await supabase.from("inventory_movements").insert([payload]);

    if (error) {
      toast.error("Error al registrar salida", { description: error.message });
    } else {
      toast.success("Salida registrada", { description: "El stock ha sido descontado automáticamente."});
      setIsDialogOpen(false);
      setFormData({ product_id: "", quantity: 1, unit_cost: 0, reason: "" });
      fetchData();
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <ArrowUpFromLine className="h-8 w-8 text-rose-400" />
          Registro de Salidas
        </h2>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button className="bg-rose-500 hover:bg-rose-600 text-white font-semibold shadow-[0_0_20px_rgba(244,63,94,0.3)]" />}>
            <Plus className="mr-2 h-4 w-4" /> Registrar Salida
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-slate-200">
            <DialogHeader>
              <DialogTitle className="text-xl text-white">Nueva Salida de Stock</DialogTitle>
              <DialogDescription className="text-slate-400">
                Registra ventas o retiro de mercancía.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveMovement} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Producto</Label>
                <Select onValueChange={handleProductSelect} value={formData.product_id}>
                  <SelectTrigger className="bg-slate-950 border-slate-800">
                    <SelectValue placeholder="Selecciona un producto..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id} className="focus:bg-slate-800" disabled={p.stock_current <= 0}>
                        {p.name} {p.stock_current <= 0 && "(Agotado)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Cantidad de Salida</Label>
                  <Input 
                    id="quantity" 
                    type="number" 
                    min="1"
                    className="bg-slate-950 border-slate-800" 
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit_cost">Costo Unitario ($)</Label>
                  <Input 
                    id="unit_cost" 
                    type="number" 
                    step="0.01" 
                    min="0"
                    className="bg-slate-950 border-slate-800" 
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({...formData, unit_cost: parseFloat(e.target.value)})}
                    required 
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="reason">Motivo / Cliente (Opcional)</Label>
                <Input 
                  id="reason" 
                  className="bg-slate-950 border-slate-800" 
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  placeholder="Ej: Venta a Cliente Y"
                />
              </div>

              <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-md mt-2 flex justify-between items-center text-sm">
                <span className="text-rose-300">Total a registrar:</span>
                <span className="text-white font-bold text-lg">${(formData.quantity * formData.unit_cost).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>

              <Button type="submit" className="w-full mt-2 bg-rose-500 hover:bg-rose-600 text-white font-bold">Confirmar Salida</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border border-slate-800 bg-slate-900/50 backdrop-blur-xl shrink-0 overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-slate-900">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Fecha</TableHead>
              <TableHead className="text-slate-400">Producto</TableHead>
              <TableHead className="text-slate-400">Cantidad</TableHead>
              <TableHead className="text-slate-400">Costo Unitario</TableHead>
              <TableHead className="text-slate-400 text-right">Costo Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-slate-800 hover:bg-slate-800/50">
                <TableCell colSpan={5} className="h-24 text-center text-slate-500">Cargando salidas...</TableCell>
              </TableRow>
            ) : movements.length === 0 ? (
              <TableRow className="border-slate-800 hover:bg-slate-800/50">
                <TableCell colSpan={5} className="h-24 text-center text-slate-500">No hay salidas registradas recientemente.</TableCell>
              </TableRow>
            ) : (
              movements.map((mov) => (
                <TableRow key={mov.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <TableCell className="text-slate-400">
                    <div className="flex items-center gap-2">
                       <Calendar className="h-3 w-3 text-slate-500"/>
                       {new Date(mov.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-200">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-slate-500" />
                      {mov.products ? mov.products.name : "Producto Eliminado"}
                    </div>
                  </TableCell>
                  <TableCell className="text-rose-400 font-semibold">
                    -{mov.quantity} <span className="text-xs text-slate-500 font-normal">{mov.products?.unit}</span>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    ${mov.unit_cost?.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-white">
                    ${mov.total?.toLocaleString(undefined, {minimumFractionDigits: 2})}
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
