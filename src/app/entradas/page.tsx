"use client";

import { useState, useEffect } from "react";
import { Plus, ArrowDownToLine, Package, Calendar, Pencil } from "lucide-react";
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

export default function EntradasPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const supabase = createClient();
  
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: 1,
    unit_cost: 0,
    reason: ""
  });

  const fetchData = async () => {
    setLoading(true);
    // Fetch recent entries
    const { data: mvts, error: mvtsErr } = await supabase
      .from("inventory_movements")
      .select(`
        *,
        products (name, category, unit)
      `)
      .eq("type", "entrada")
      .order("created_at", { ascending: false })
      .limit(50);
      
    // Fetch products for dropdown
    const { data: prods } = await supabase
      .from("products")
      .select("id, name, cost_price")
      .order("name", { ascending: true });

    if (mvtsErr) {
      toast.error("Error al cargar entradas", { description: mvtsErr.message });
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

    const payload = {
      product_id: formData.product_id,
      type: "entrada",
      quantity: formData.quantity,
      unit_cost: formData.unit_cost,
      reason: formData.reason
    };

    if (editingId) {
      const oldMovement = movements.find(m => m.id === editingId);
      if (oldMovement) {
        if (oldMovement.product_id !== formData.product_id) {
          // Subtract old quantity from old product
          const { data: oldProd } = await supabase.from("products").select("stock_current").eq("id", oldMovement.product_id).single();
          if (oldProd) {
            await supabase.from("products").update({ stock_current: oldProd.stock_current - oldMovement.quantity }).eq("id", oldMovement.product_id);
          }
          // Add new quantity to new product
          const { data: newProd } = await supabase.from("products").select("stock_current").eq("id", formData.product_id).single();
          if (newProd) {
            await supabase.from("products").update({ stock_current: newProd.stock_current + formData.quantity }).eq("id", formData.product_id);
          }
        } else {
          // Same product, adjust difference
          const diff = formData.quantity - oldMovement.quantity;
          if (diff !== 0) {
            const { data: prodData } = await supabase.from("products").select("stock_current").eq("id", formData.product_id).single();
            if (prodData) {
              await supabase.from("products").update({ stock_current: prodData.stock_current + diff }).eq("id", formData.product_id);
            }
          }
        }
      }

      const { error } = await supabase.from("inventory_movements").update(payload).eq("id", editingId);

      if (error) {
        toast.error("Error al actualizar entrada", { description: error.message });
      } else {
        toast.success("Entrada y stock actualizados", { description: "El stock se ajustó a la nueva cantidad automáticamente."});
        setIsDialogOpen(false);
        setFormData({ product_id: "", quantity: 1, unit_cost: 0, reason: "" });
        setEditingId(null);
        fetchData();
      }
    } else {
      const { error } = await supabase.from("inventory_movements").insert([payload]);

      if (error) {
        toast.error("Error al registrar entrada", { description: error.message });
      } else {
        toast.success("Entrada registrada", { description: "El stock se ha actualizado automáticamente."});
        setIsDialogOpen(false);
        setFormData({ product_id: "", quantity: 1, unit_cost: 0, reason: "" });
        fetchData();
      }
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <ArrowDownToLine className="h-8 w-8 text-blue-400" />
          Registro de Entradas
        </h2>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setEditingId(null);
            setFormData({ product_id: "", quantity: 1, unit_cost: 0, reason: "" });
          }
          setIsDialogOpen(open);
        }}>
          <DialogTrigger render={<Button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow-[0_0_20px_rgba(59,130,246,0.3)]" />}>
            <Plus className="mr-2 h-4 w-4" /> Registrar Entrada
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-slate-200">
            <DialogHeader>
              <DialogTitle className="text-xl text-white">
                {editingId ? "Editar Entrada" : "Nueva Entrada al Stock"}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {editingId ? "Modifica los valores de la entrada." : "Registra la recepción de mercancía."}
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
                      <SelectItem key={p.id} value={p.id} className="focus:bg-slate-800">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Cantidad a Ingresar</Label>
                  <Input 
                    id="quantity" 
                    type="number" 
                    min="1"
                    className="bg-slate-950 border-slate-800" 
                    value={Number.isNaN(formData.quantity) ? "" : formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value === "" ? 0 : parseInt(e.target.value, 10)})}
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit_cost">Costo Unitario ($)</Label>
                  <Input 
                    id="unit_cost" 
                    type="number" 
                    min="0"
                    className="bg-slate-950 border-slate-800" 
                    value={Number.isNaN(formData.unit_cost) || formData.unit_cost === 0 ? "" : formData.unit_cost}
                    onChange={(e) => setFormData({...formData, unit_cost: e.target.value === "" ? 0 : parseInt(e.target.value, 10)})}
                    required 
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="reason">Motivo / Proveedor (Opcional)</Label>
                <Input 
                  id="reason" 
                  className="bg-slate-950 border-slate-800" 
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  placeholder="Ej: Compra a Distribuidor X"
                />
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded flex justify-between items-center text-sm">
                <span className="text-slate-400">Total calculado:</span>
                <span className="font-bold text-white">
                  {((formData.quantity || 0) * (formData.unit_cost || 0)).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>

              <Button type="submit" className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white font-bold">
                {editingId ? "Actualizar Entrada" : "Confirmar Entrada"}
              </Button>
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
              <TableHead className="text-slate-400">Costo Unit.</TableHead>
              <TableHead className="text-slate-400 text-right">Costo Total</TableHead>
              <TableHead className="text-slate-400 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-slate-800 hover:bg-slate-800/50">
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">Cargando entradas...</TableCell>
              </TableRow>
            ) : movements.length === 0 ? (
              <TableRow className="border-slate-800 hover:bg-slate-800/50">
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">No hay entradas generadas recientemente.</TableCell>
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
                  <TableCell className="text-blue-400 font-semibold">
                    +{mov.quantity} <span className="text-xs text-slate-500 font-normal">{mov.products?.unit}</span>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    ${mov.unit_cost?.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-white">
                    ${mov.total?.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => {
                        setFormData({
                            product_id: mov.product_id,
                            quantity: mov.quantity,
                            unit_cost: mov.unit_cost,
                            reason: mov.reason || ""
                        });
                        setEditingId(mov.id);
                        setIsDialogOpen(true);
                    }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
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
