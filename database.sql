-- Limpiar base de datos para evitar errores de ejecución previa (OJO: borra la información de prueba)
DROP TABLE IF EXISTS public.dispatch_items CASCADE;
DROP TABLE IF EXISTS public.dispatches CASCADE;
DROP TABLE IF EXISTS public.kit_items CASCADE;
DROP TABLE IF EXISTS public.kits CASCADE;
DROP TABLE IF EXISTS public.monthly_closings CASCADE;
DROP TABLE IF EXISTS public.inventory_movements CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP FUNCTION IF EXISTS update_product_stock() CASCADE;

-- 1. Tabla: Products
CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT DEFAULT 'unidad',
    stock_min INTEGER DEFAULT 0,
    stock_current INTEGER DEFAULT 0,
    cost_price NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla: Inventory Movements
-- type: 'entrada' o 'salida'
CREATE TABLE public.inventory_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('entrada', 'salida')),
    quantity INTEGER NOT NULL,
    unit_cost NUMERIC(10,2) NOT NULL,
    total NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla: Monthly Closings
CREATE TABLE public.monthly_closings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_entries NUMERIC(10,2) DEFAULT 0,
    total_exits NUMERIC(10,2) DEFAULT 0,
    total_cost NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS (Asumimos que solo usuarios autenticados pueden ver y modificar)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access on products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on inventory_movements" ON public.inventory_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on monthly_closings" ON public.monthly_closings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- TRIGGER PARA ACTUALIZAR STOCK AUTOMÁTICAMENTE
-- ==========================================
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'entrada' THEN
        UPDATE public.products 
        SET 
            cost_price = CASE 
                WHEN (stock_current + NEW.quantity) > 0 THEN 
                    ((stock_current * cost_price) + (NEW.quantity * NEW.unit_cost)) / (stock_current + NEW.quantity)
                ELSE cost_price 
            END,
            stock_current = stock_current + NEW.quantity 
        WHERE id = NEW.product_id;
    ELSIF NEW.type = 'salida' THEN
        UPDATE public.products 
        SET stock_current = stock_current - NEW.quantity 
        WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock
AFTER INSERT ON public.inventory_movements
FOR EACH ROW
EXECUTE FUNCTION update_product_stock();

-- ==========================================
-- LOGÍSTICA ICBF: MERCADOS Y CAMIONES
-- ==========================================

-- 4. Tabla: Kits (Mercados prearmados)
CREATE TABLE public.kits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla: Kit Items (La "receta" de productos de cada mercado)
CREATE TABLE public.kit_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kit_id UUID REFERENCES public.kits(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- 6. Tabla: Dispatches (Despachos de Camiones)
CREATE TABLE public.dispatches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    truck_plate TEXT NOT NULL,
    driver_name TEXT,
    destination TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabla: Dispatch Items (Qué kits se llevó el camión)
CREATE TABLE public.dispatch_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dispatch_id UUID REFERENCES public.dispatches(id) ON DELETE CASCADE,
    kit_id UUID REFERENCES public.kits(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- Modificar inventory_movements para rastrear a qué despacho pertenece una salida masiva
ALTER TABLE public.inventory_movements 
ADD COLUMN dispatch_id UUID REFERENCES public.dispatches(id) ON DELETE CASCADE;

-- Expandir RLS para las nuevas tablas
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access on kits" ON public.kits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on kit_items" ON public.kit_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on dispatches" ON public.dispatches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on dispatch_items" ON public.dispatch_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
