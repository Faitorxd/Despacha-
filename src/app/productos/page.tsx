"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Package, MoreHorizontal, Pencil, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function ProductosPage() {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const supabase = createClient();
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    unit: "unidad",
    stock_min: 0,
    cost_price: 0,
    stock_current: 0
  });

  const fetchProductos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error al cargar productos", { description: error.message });
    } else {
      setProductos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      const { error } = await supabase.from("products").update({
        name: formData.name,
        category: formData.category,
        unit: formData.unit,
        stock_min: formData.stock_min,
        cost_price: formData.cost_price,
        stock_current: formData.stock_current
      }).eq("id", editingId);

      if (error) {
        toast.error("Error al actualizar", { description: error.message });
      } else {
        toast.success("Producto actualizado exitosamente");
        setIsDialogOpen(false);
        setFormData({ name: "", category: "", unit: "unidad", stock_min: 0, cost_price: 0, stock_current: 0 });
        setEditingId(null);
        fetchProductos();
      }
    } else {
      const { error } = await supabase.from("products").insert([formData]);

      if (error) {
        toast.error("Error al guardar", { description: error.message });
      } else {
        toast.success("Producto creado exitosamente");
        setIsDialogOpen(false);
        setFormData({ name: "", category: "", unit: "unidad", stock_min: 0, cost_price: 0, stock_current: 0 });
        fetchProductos();
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if(!window.confirm(`¿Estás seguro de que quieres eliminar el producto "${name}"?`)) return;

    const { error } = await supabase.from("products").delete().eq("id", id);
    if(error){
      toast.error("Error al eliminar", { description: error.message });
    } else {
      toast.success("Producto eliminado");
      fetchProductos();
    }
  };

  const exportToExcel = () => {
    const worksheetData = productos.map(p => ({
      "Nombre del Producto": p.name,
      "Categoría": p.category,
      "Stock Actual": p.stock_current,
      "Unidad Físca": p.unit,
      "Costo Unitario (COP)": p.cost_price,
      "Valorización Total (COP)": p.stock_current * p.cost_price,
      "Mínimo de Alerta": p.stock_min,
      "Estado Logístico": p.stock_current <= p.stock_min ? "REABASTECER" : "NORMAL"
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario Valorado");
    XLSX.writeFile(workbook, "Reporte_Inventario_Bodega.xlsx");
    toast.success("Excel descargado correctamente");
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Package className="h-8 w-8 text-teal-400" />
          Catálogo de Productos
        </h2>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setEditingId(null);
            setFormData({ name: "", category: "", unit: "unidad", stock_min: 0, cost_price: 0, stock_current: 0 });
          }
          setIsDialogOpen(open);
        }}>
          <DialogTrigger render={<Button className="bg-teal-500 hover:bg-teal-600 text-slate-900 font-semibold shadow-[0_0_20px_rgba(20,184,166,0.3)]" />}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-slate-200">
            <DialogHeader>
              <DialogTitle className="text-xl text-white">
                {editingId ? "Editar Producto" : "Añadir Producto"}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {editingId ? "Modifica los detalles del producto." : "Registra un nuevo producto en tu inventario."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveProduct} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre / Descripción</Label>
                <Input 
                  id="name" 
                  className="bg-slate-950 border-slate-800" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Input 
                    id="category" 
                    className="bg-slate-950 border-slate-800" 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit">Unidad (ej: lit, kg, ud)</Label>
                  <Input 
                    id="unit" 
                    className="bg-slate-950 border-slate-800" 
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    required 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cost_price">Costo Unitario ($)</Label>
                  <Input 
                    id="cost_price" 
                    type="number" 
                    step="any"
                    className="bg-slate-950 border-slate-800" 
                    value={Number.isNaN(formData.cost_price) || formData.cost_price === 0 ? "" : formData.cost_price}
                    onChange={(e) => setFormData({...formData, cost_price: e.target.value === "" ? 0 : parseFloat(e.target.value)})}
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stock_min">Stock Mínimo (Alerta)</Label>
                  <Input 
                    id="stock_min" 
                    type="number" 
                    className="bg-slate-950 border-slate-800" 
                    value={Number.isNaN(formData.stock_min) ? "" : formData.stock_min}
                    onChange={(e) => setFormData({...formData, stock_min: e.target.value === "" ? 0 : parseInt(e.target.value, 10)})}
                    required 
                  />
                </div>
              </div>
              {editingId && (
                <div className="grid gap-2 mt-2 p-3 border border-amber-500/20 bg-amber-500/5 rounded-md">
                  <Label htmlFor="stock_current" className="text-amber-400 font-semibold flex items-center justify-between">
                    <span>Ajuste de Stock Manual</span>
                    <span className="text-xs font-normal">¡Cuidado! Úsalo solo para corregir desfaces</span>
                  </Label>
                  <Input 
                    id="stock_current" 
                    type="number" 
                    className="bg-slate-950 border-amber-500/30 focus-visible:ring-amber-500/50" 
                    value={Number.isNaN(formData.stock_current) ? "" : formData.stock_current}
                    onChange={(e) => setFormData({...formData, stock_current: e.target.value === "" ? 0 : parseInt(e.target.value, 10)})}
                    required 
                  />
                </div>
              )}
              <Button type="submit" className="w-full mt-4 bg-teal-500 hover:bg-teal-600 text-slate-900 font-bold">
                {editingId ? "Actualizar Producto" : "Guardar Producto"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border border-slate-800 bg-slate-900/50 backdrop-blur-xl shrink-0 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar productos..."
              className="pl-9 bg-slate-950 border-slate-800 text-slate-300 ring-offset-slate-950 placeholder:text-slate-600"
            />
          </div>
          <Button onClick={exportToExcel} variant="outline" className="border-teal-500/50 text-teal-400 hover:bg-teal-500/10 hover:text-teal-300">
            <Download className="h-4 w-4 mr-2" /> Exportar a Excel
          </Button>
        </div>
        <Table>
          <TableHeader className="bg-slate-900">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Producto /Categoría</TableHead>
              <TableHead className="text-slate-400">Stock Actual</TableHead>
              <TableHead className="text-slate-400">Costo Unit.</TableHead>
              <TableHead className="text-right text-slate-400">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-slate-800 hover:bg-slate-800/50">
                <TableCell colSpan={4} className="h-24 text-center text-slate-500">Cargando catálogo...</TableCell>
              </TableRow>
            ) : productos.length === 0 ? (
              <TableRow className="border-slate-800 hover:bg-slate-800/50">
                <TableCell colSpan={4} className="h-24 text-center text-slate-500">No hay productos registrados. Crea uno nuevo.</TableCell>
              </TableRow>
            ) : (
              productos.map((prod) => (
                <TableRow key={prod.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <TableCell className="font-medium text-slate-200">
                    {prod.name}
                    <div className="text-xs text-slate-500 font-normal mt-0.5">{prod.category}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <span className={`font-semibold ${prod.stock_current <= prod.stock_min ? "text-rose-400" : "text-emerald-400"}`}>
                        {prod.stock_current} {prod.unit}s
                      </span>
                      {prod.stock_current <= prod.stock_min && (
                        <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-400 bg-rose-500/10">Bajo</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {prod.cost_price?.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => {
                      setFormData({
                        name: prod.name,
                        category: prod.category,
                        unit: prod.unit,
                        stock_min: prod.stock_min,
                        cost_price: prod.cost_price || 0,
                        stock_current: prod.stock_current || 0
                      });
                      setEditingId(prod.id);
                      setIsDialogOpen(true);
                    }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" onClick={() => handleDelete(prod.id, prod.name)}>
                      <Trash2 className="h-4 w-4" />
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
