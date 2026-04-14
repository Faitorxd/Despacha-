"use client";

import { useState, useEffect } from "react";
import { Truck, Plus, CheckCircle2, History, Pencil } from "lucide-react";
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

export default function DespachosPage() {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const supabase = createClient();
  
  // Dispatch form state
  const [truckPlate, setTruckPlate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [destination, setDestination] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [selectedKits, setSelectedKits] = useState<{kit_id: string, name: string, quantity: number}[]>([]);
  const [currentKit, setCurrentKit] = useState({ kit_id: "", name: "", quantity: 1 });

  const resetForm = () => {
    setTruckPlate("");
    setDriverName("");
    setDestination("");
    setSelectedKits([]);
    setCurrentKit({ kit_id: "", name: "", quantity: 1 });
    setEditingId(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) resetForm();
    setIsDialogOpen(open);
  };

  const fetchData = async () => {
    setLoading(true);
    // Fetch dispatches history
    const { data: dispatchesData, error: dispErr } = await supabase
      .from("dispatches")
      .select(`
        *,
        dispatch_items (
           quantity,
           kits (name)
        )
      `)
      .order("created_at", { ascending: false });
      
    // Fetch kits catalog
    const { data: kitsData } = await supabase
      .from("kits")
      .select(`
        id, name,
        kit_items (product_id, quantity, products(stock_current, name, cost_price))
      `)
      .order("name", { ascending: true });

    if (dispErr) {
      toast.error("Error al cargar despachos", { description: dispErr.message });
    } else {
      setDispatches(dispatchesData || []);
      setKits(kitsData || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddKitToDispatch = () => {
    if (!currentKit.kit_id || currentKit.quantity <= 0) return;
    
    // Check if kit is already in the list
    const existingIndex = selectedKits.findIndex(k => k.kit_id === currentKit.kit_id);
    if (existingIndex >= 0) {
       const updated = [...selectedKits];
       updated[existingIndex].quantity += currentKit.quantity;
       setSelectedKits(updated);
    } else {
       setSelectedKits([...selectedKits, { ...currentKit }]);
    }
    
    setCurrentKit({ kit_id: "", name: "", quantity: 1 });
  };

  const handleKitSelect = (val: string | null) => {
    if (!val) return;
    const kit = kits.find(k => k.id === val);
    if (kit) {
      setCurrentKit({ ...currentKit, kit_id: kit.id, name: kit.name });
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
       // Only update metadata
       if (!truckPlate) return toast.error("Datos incompletos", { description: "La placa es obligatoria." });
       const { error } = await supabase.from("dispatches").update({
          truck_plate: truckPlate,
          driver_name: driverName,
          destination: destination
       }).eq("id", editingId);

       if (error) {
          toast.error("Error al actualizar despacho", { description: error.message });
       } else {
          toast.success("Despacho actualizado", { description: "Los detalles de envío han sido guardados."});
          setIsDialogOpen(false);
          resetForm();
          fetchData();
       }
       return;
    }

    if (!truckPlate || selectedKits.length === 0) {
       return toast.error("Datos incompletos", { description: "Debe haber una placa y al menos un mercado agregado." });
    }

    // --- LOGIC: Validate Stock before dispatching ---
    // 1. Calculate total products required across all selected kits
    const requiredProducts: { [key: string]: { name: string, required: number, inStock: number, unit_cost: number } } = {};
    
    for (const sk of selectedKits) {
       const kitDef = kits.find(k => k.id === sk.kit_id);
       if (!kitDef) continue;
       
       for (const kItem of kitDef.kit_items) {
          const reqQty = kItem.quantity * sk.quantity;
          if (requiredProducts[kItem.product_id]) {
             requiredProducts[kItem.product_id].required += reqQty;
          } else {
             requiredProducts[kItem.product_id] = {
                name: kItem.products.name,
                required: reqQty,
                inStock: kItem.products.stock_current,
                unit_cost: kItem.products.cost_price || 0
             };
          }
       }
    }

    // 2. Check if we have enough stock
    let hasInsufficientStock = false;
    let errorMsg = "";
    Object.values(requiredProducts).forEach(rp => {
       if (rp.required > rp.inStock) {
          hasInsufficientStock = true;
          errorMsg += `\n- ${rp.name}: requiere ${rp.required}, hay ${rp.inStock}`;
       }
    });

    if (hasInsufficientStock) {
       return toast.error("Stock Insuficiente en Almacén", { description: `Falta mercancía para armar estos mercados:${errorMsg}` });
    }

    // --- LOGIC: Execution ---
    // 3. Create Dispatch Record
    const { data: newDispatch, error: dispatchErr } = await supabase
       .from("dispatches")
       .insert([{ truck_plate: truckPlate, driver_name: driverName, destination }])
       .select()
       .single();

    if (dispatchErr) return toast.error("Error fatal creando el despacho", { description: dispatchErr.message });

    // 4. Create Dispatch Items
    const dispatchItemsPayload = selectedKits.map(sk => ({
       dispatch_id: newDispatch.id,
       kit_id: sk.kit_id,
       quantity: sk.quantity
    }));
    await supabase.from("dispatch_items").insert(dispatchItemsPayload);

    // 5. Create Inventory Movements for EVERY underlying product
    // The database trigger will automatically discount the stock!
    const movementsPayload = Object.keys(requiredProducts).map(productId => ({
       product_id: productId,
       type: "salida",
       quantity: requiredProducts[productId].required,
       unit_cost: requiredProducts[productId].unit_cost,
       reason: `Despacho ICBF: Camión ${truckPlate} -> ${destination || 'Sin destino'}`,
       dispatch_id: newDispatch.id
    }));

    const { error: movsErr } = await supabase.from("inventory_movements").insert(movementsPayload);

    if (movsErr) {
       toast.error("Advertencia grave", { description: "El camión se creó pero hubo error descontando stock: " + movsErr.message });
    } else {
       toast.success("Camión despachado maravillosamente", { description: `Se descontaron ${movementsPayload.length} productos diferentes del almacén.` });
       setIsDialogOpen(false);
       resetForm();
       fetchData();
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Truck className="h-8 w-8 text-amber-500" />
          Despacho Logístico (Flotas)
        </h2>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger render={<Button className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold shadow-[0_0_20px_rgba(245,158,11,0.3)]" />}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Despacho
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-800 text-slate-200">
            <DialogHeader>
              <DialogTitle className="text-xl text-white">
                {editingId ? "Editar Despacho" : "Generar Despacho a Camión"}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {editingId 
                  ? "Modifica los detalles logísticos del envío. Los kits no se pueden editar."
                  : "Selecciona la flota y los mercados ICBF que se enviarán. El stock se deducirá automáticamente."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleDispatch} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                 <div className="grid gap-2">
                   <Label htmlFor="truckPlate" className="text-amber-400">Placa Camión *</Label>
                   <Input 
                     id="truckPlate" 
                     className="bg-slate-950 border-slate-800 uppercase" 
                     value={truckPlate}
                     onChange={(e) => setTruckPlate(e.target.value.toUpperCase())}
                     placeholder="AAA-123"
                     required 
                   />
                 </div>
                 <div className="grid gap-2">
                   <Label htmlFor="driverName">Conductor</Label>
                   <Input 
                     id="driverName" 
                     className="bg-slate-950 border-slate-800" 
                     value={driverName}
                     onChange={(e) => setDriverName(e.target.value)}
                     placeholder="Nombre..."
                   />
                 </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="destination">Punto de Destino</Label>
                <Input 
                  id="destination" 
                  className="bg-slate-950 border-slate-800" 
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Municipio o vereda..."
                />
              </div>

              {/* Kits Selector */}
              {!editingId && (
                <div className="mt-2 p-4 border border-slate-800 rounded-lg bg-slate-950/50">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Carga del Camión (Kits ICBF)</h4>
                  
                  <div className="flex gap-2 items-end mb-4">
                    <div className="flex-1">
                      <Select onValueChange={handleKitSelect} value={currentKit.kit_id}>
                        <SelectTrigger className="bg-slate-900 border-slate-800">
                          <SelectValue placeholder="Seleccionar mercado..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          {kits.map(k => (
                            <SelectItem key={k.id} value={k.id} className="focus:bg-slate-800">
                              {k.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Input 
                          type="number" min="1" 
                          className="bg-slate-900 border-slate-800" 
                          value={currentKit.quantity}
                          onChange={(e) => setCurrentKit({...currentKit, quantity: parseInt(e.target.value) || 1})}
                      />
                    </div>
                    <Button type="button" onClick={handleAddKitToDispatch} variant="secondary" className="bg-slate-800 hover:bg-slate-700 text-white">
                      Subir a Flota
                    </Button>
                  </div>

                  {selectedKits.length > 0 ? (
                      <div className="space-y-2">
                        {selectedKits.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-slate-900 p-3 rounded text-sm border border-slate-800">
                             <span className="text-slate-200 font-medium">{item.name}</span>
                             <span className="font-bold text-amber-500">{item.quantity} unidades</span>
                          </div>
                        ))}
                      </div>
                  ) : (
                      <p className="text-xs text-slate-500 text-center py-2">El camión está vacío.</p>
                  )}
                </div>
              )}

              {editingId && (
                <div className="mt-2 p-4 border border-slate-800 rounded-lg bg-slate-950/50">
                   <h4 className="text-sm font-semibold text-slate-400">Modificación de stock desactivada</h4>
                   <p className="text-xs text-slate-500 mt-1">Por seguridad, para modificar los productos que lleva un camión, debe crear uno nuevo.</p>
                </div>
              )}

              <Button type="submit" className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold" disabled={!truckPlate || (!editingId && selectedKits.length === 0)}>
                 {editingId ? "Actualizar Datos de Flota" : "Confirmar Despacho"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border border-slate-800 bg-slate-900/50 backdrop-blur-xl shrink-0 overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
           <History className="h-5 w-5 text-slate-400" />
           <h3 className="font-semibold text-slate-200">Historial de Camiones</h3>
        </div>
        <Table>
          <TableHeader className="bg-slate-900">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Fecha</TableHead>
              <TableHead className="text-slate-400">Placa</TableHead>
              <TableHead className="text-slate-400">Conductor</TableHead>
              <TableHead className="text-slate-400">Destino</TableHead>
              <TableHead className="text-slate-400 text-right">Carga Transportada</TableHead>
              <TableHead className="text-slate-400 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-slate-800 hover:bg-slate-800/50">
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">Cargando bitácora...</TableCell>
              </TableRow>
            ) : dispatches.length === 0 ? (
              <TableRow className="border-slate-800 hover:bg-slate-800/50">
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">No hay despachos registrados aún.</TableCell>
              </TableRow>
            ) : (
              dispatches.map((disp) => (
                <TableRow key={disp.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <TableCell className="text-slate-400 text-sm">
                       {new Date(disp.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-bold text-amber-400">
                      {disp.truck_plate}
                  </TableCell>
                  <TableCell className="text-slate-300">
                      {disp.driver_name || "N/A"}
                  </TableCell>
                  <TableCell className="text-slate-300">
                      {disp.destination || "N/A"}
                  </TableCell>
                  <TableCell className="text-right text-slate-300 text-xs">
                      {disp.dispatch_items?.map((di: any, i: number) => (
                         <div key={i}><span className="text-amber-500 font-bold">{di.quantity}x</span> {di.kits?.name}</div>
                      ))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => {
                        setTruckPlate(disp.truck_plate);
                        setDriverName(disp.driver_name || "");
                        setDestination(disp.destination || "");
                        setEditingId(disp.id);
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
