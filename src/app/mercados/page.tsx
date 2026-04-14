"use client";

import { useState, useEffect } from "react";
import { Plus, Boxes, Layers, Trash2, Pencil, Copy } from "lucide-react";
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

export default function MercadosPage() {
  const [kits, setKits] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const supabase = createClient();
  
  // Kit creation state
  const [kitName, setKitName] = useState("");
  const [kitDesc, setKitDesc] = useState("");
  const [selectedItems, setSelectedItems] = useState<{product_id: string, name: string, quantity: number}[]>([]);
  const [currentItem, setCurrentItem] = useState({ product_id: "", name: "", quantity: 1 });
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setKitName("");
    setKitDesc("");
    setSelectedItems([]);
    setCurrentItem({ product_id: "", name: "", quantity: 1 });
    setEditingId(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) resetForm();
    setIsDialogOpen(open);
  };

  const fetchData = async () => {
    setLoading(true);
    // Fetch kits with their items
    const { data: kitsData, error: kitsErr } = await supabase
      .from("kits")
      .select(`
        id, name, description, created_at,
        kit_items (
          product_id,
          quantity,
          products (id, name, unit)
        )
      `)
      .order("created_at", { ascending: false });
      
    // Fetch products catalog
    const { data: prodsData } = await supabase
      .from("products")
      .select("id, name, unit")
      .order("name", { ascending: true });

    if (kitsErr) {
      toast.error("Error al cargar mercados", { description: kitsErr.message });
    } else {
      setKits(kitsData || []);
      setProducts(prodsData || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddItemToKit = () => {
    if (!currentItem.product_id || currentItem.quantity <= 0) return;
    
    // Check if product is already in the list to just update quantity
    const existingIndex = selectedItems.findIndex(i => i.product_id === currentItem.product_id);
    if (existingIndex >= 0) {
       const updated = [...selectedItems];
       updated[existingIndex].quantity += currentItem.quantity;
       setSelectedItems(updated);
    } else {
       setSelectedItems([...selectedItems, { ...currentItem }]);
    }
    
    // Reset current item selector
    setCurrentItem({ product_id: "", name: "", quantity: 1 });
  };

  const handleRemoveItemFromKit = (productId: string) => {
    setSelectedItems(selectedItems.filter(i => i.product_id !== productId));
  };

  const handleProductSelect = (val: string | null) => {
    if (!val) return;
    const prod = products.find(p => p.id === val);
    if (prod) {
      setCurrentItem({ ...currentItem, product_id: prod.id, name: prod.name });
    }
  };

  const handleSaveKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitName) return toast.error("Por favor asigna un nombre al Mercado.");
    if (selectedItems.length === 0) return toast.error("El Mercado debe contener al menos 1 producto.");

    if (editingId) {
      // 1. Update Kit details
      const { error: kitErr } = await supabase
        .from("kits")
        .update({ name: kitName, description: kitDesc })
        .eq("id", editingId);

      if (kitErr) return toast.error("Error actualizando el Mercado", { description: kitErr.message });

      // 2. Delete old kit items
      await supabase.from("kit_items").delete().eq("kit_id", editingId);

      // 3. Insert new kit items
      const itemsToInsert = selectedItems.map(item => ({
        kit_id: editingId,
        product_id: item.product_id,
        quantity: item.quantity
      }));
      const { error: itemsErr } = await supabase.from("kit_items").insert(itemsToInsert);

      if (itemsErr) {
        toast.error("Advertencia: El Mercado se actualizó pero sus productos fallaron.", { description: itemsErr.message });
      } else {
        toast.success("Mercado actualizado exitosamente.");
        setIsDialogOpen(false);
        resetForm();
        fetchData();
      }
    } else {
      // 1. Insert Kit details
      const { data: newKit, error: kitErr } = await supabase
        .from("kits")
        .insert([{ name: kitName, description: kitDesc }])
        .select()
        .single();

      if (kitErr) {
        return toast.error("Error creando el Mercado", { description: kitErr.message });
      }

      // 2. Insert Kit Items recipes
      const itemsToInsert = selectedItems.map(item => ({
        kit_id: newKit.id,
        product_id: item.product_id,
        quantity: item.quantity
      }));

      const { error: itemsErr } = await supabase.from("kit_items").insert(itemsToInsert);

      if (itemsErr) {
        toast.error("Advertencia: El Mercado se creó pero sus productos fallaron.", { description: itemsErr.message });
      } else {
        toast.success("Mercado creado exitosamente.");
        setIsDialogOpen(false);
        resetForm();
        fetchData();
      }
    }
  };

  const handleDeleteKit = async (id: string, name: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el mercado "${name}"? Esta acción no se puede deshacer.`)) return;
    
    const { error } = await supabase.from("kits").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar", { description: error.message });
    } else {
      toast.success("Mercado eliminado exitosamente");
      fetchData();
    }
  };

  return (
             <div className="flex-1 space-y-8 p-8 pt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Boxes className="h-8 w-8 text-fuchsia-400" />
          Armado de Mercados
        </h2>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger render={<Button className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-semibold shadow-[0_0_20px_rgba(217,70,239,0.3)]" />}>
            <Plus className="mr-2 h-4 w-4" /> Crear Mercado Base
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] bg-slate-900 border-slate-800 text-slate-200">
            <DialogHeader>
              <DialogTitle className="text-xl text-white">
                {editingId ? "Editar Mercado (Ensamblaje)" : "Configurar Nuevo Mercado (Ensamblaje)"}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {editingId ? "Modifica los productos que componen este mercado." : "Añade los productos que componen una unidad de este 'Mercado'."}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid gap-2">
                <Label htmlFor="kitName">Nombre del Mercado</Label>
                <Input 
                  id="kitName" 
                  className="bg-slate-950 border-slate-800" 
                  value={kitName}
                  onChange={(e) => setKitName(e.target.value)}
                  placeholder="Ej: Mercado Especial ICBF"
                  required 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="kitDesc">Descripción / Notas</Label>
                <Input 
                  id="kitDesc" 
                  className="bg-slate-950 border-slate-800" 
                  value={kitDesc}
                  onChange={(e) => setKitDesc(e.target.value)}
                  placeholder="Ej: Ración para zonas rurales..."
                />
              </div>

              {/* Recipe builder */}
              <div className="mt-4 p-4 border border-slate-800 rounded-lg bg-slate-950/50">
                <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2"><Layers className="h-4 w-4" /> Componentes del Mercado</h4>
                
                <div className="flex gap-2 items-end mb-4">
                  <div className="flex-1">
                    <Label className="text-xs text-slate-500 mb-1 block">Producto</Label>
                    <Select onValueChange={handleProductSelect} value={currentItem.product_id}>
                      <SelectTrigger className="bg-slate-900 border-slate-800">
                        <SelectValue placeholder="Seleccionar..." />
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
                  <div className="w-24">
                    <Label className="text-xs text-slate-500 mb-1 block">Cantidad</Label>
                    <Input 
                        type="number" min="1" 
                        className="bg-slate-900 border-slate-800" 
                        value={currentItem.quantity}
                        onChange={(e) => setCurrentItem({...currentItem, quantity: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  <Button type="button" onClick={handleAddItemToKit} variant="secondary" className="bg-slate-800 hover:bg-slate-700 text-white">
                    Añadir
                  </Button>
                </div>

                {selectedItems.length > 0 ? (
                    <div className="space-y-2">
                      {selectedItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-900 p-2 rounded text-sm border border-slate-800">
                           <span className="text-slate-300">{item.name}</span>
                           <div className="flex items-center gap-3">
                             <span className="font-bold text-fuchsia-400">x{item.quantity}</span>
                             <button type="button" onClick={() => handleRemoveItemFromKit(item.product_id)} className="text-rose-400 hover:text-rose-300"><Trash2 className="h-4 w-4"/></button>
                           </div>
                        </div>
                      ))}
                    </div>
                ) : (
                    <p className="text-xs text-slate-500 text-center py-2">No has agregado productos a este mercado.</p>
                )}
              </div>

            </div>
            
            <Button onClick={handleSaveKit} className="w-full mt-2 bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold disabled:opacity-50" disabled={selectedItems.length === 0 || !kitName}>
               {editingId ? "Actualizar Plantilla de Mercado" : "Guardar Plantilla de Mercado"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
             <p className="text-slate-500">Cargando mercados...</p>
        ) : kits.length === 0 ? (
             <div className="col-span-full p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                 <Boxes className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                 <h3 className="text-lg font-medium text-slate-300">Aún no hay Mercados creados</h3>
                 <p className="text-slate-500 text-sm mt-1">Crea tu primer ensamblaje para poder utilizar el sistema de despachos por camión.</p>
             </div>
        ) : (
          kits.map((kit) => (
            <div key={kit.id} className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl shrink-0 overflow-hidden shadow-2xl flex flex-col">
              <div className="p-5 border-b border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 flex justify-between items-start">
                 <div>
                   <h3 className="text-xl font-bold text-white mb-1">{kit.name}</h3>
                   <p className="text-sm text-slate-400">{kit.description || "Sin descripción"}</p>
                 </div>
                 <div className="flex items-center gap-1">
                   <Button variant="ghost" size="icon" title="Duplicar Mercado" className="h-8 w-8 text-fuchsia-400 hover:text-fuchsia-300 hover:bg-fuchsia-500/10" onClick={() => {
                      setKitName(kit.name + " (Copiar)");
                      setKitDesc(kit.description || "");
                      setSelectedItems(kit.kit_items.map((item: any) => ({
                         product_id: item.product_id,
                         name: item.products.name,
                         quantity: item.quantity
                      })));
                      setEditingId(null);  // null indicates it's a new kit creation, not an edit!
                      setIsDialogOpen(true);
                   }}>
                     <Copy className="h-4 w-4" />
                   </Button>
                   <Button variant="ghost" size="icon" title="Editar Mercado" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => {
                      setKitName(kit.name);
                      setKitDesc(kit.description || "");
                      setSelectedItems(kit.kit_items.map((item: any) => ({
                         product_id: item.product_id,
                         name: item.products.name,
                         quantity: item.quantity
                      })));
                      setEditingId(kit.id);
                      setIsDialogOpen(true);
                   }}>
                     <Pencil className="h-4 w-4" />
                   </Button>
                   <Button variant="ghost" size="icon" title="Eliminar Mercado" className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" onClick={() => handleDeleteKit(kit.id, kit.name)}>
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 </div>
              </div>
              <div className="p-5 flex-1">
                 <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Contenido Unitario:</h4>
                 <ul className="space-y-2">
                    {kit.kit_items && kit.kit_items.map((item: any, idx: number) => (
                        <li key={idx} className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2 last:border-0">
                           <span className="text-slate-300">{item.products?.name}</span>
                           <span className="font-medium text-fuchsia-400">{item.quantity} <span className="text-xs text-slate-500">{item.products?.unit}</span></span>
                        </li>
                    ))}
                 </ul>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
