# Sistema de Inventario con Next.js + Supabase

## Stack
- Next.js 14 (App Router)
- Supabase (PostgreSQL)
- Shadcn/ui + Tailwind CSS
- TypeScript

## Módulos
1. **Productos** - CRUD de productos con stock actual
2. **Entradas** - Registro de mercancía que entra
3. **Salidas** - Registro de mercancía que sale (descuenta stock)
4. **Cierre Mensual** - Reporte de movimientos del mes
5. **Dashboard** - Resumen general

## Tablas Supabase
- products (id, name, category, unit, stock_min, stock_current, cost_price, sale_price)
- inventory_movements (id, product_id, type[entrada/salida], quantity, unit_cost, total, reason, created_at)
- monthly_closings (id, month, year, total_entries, total_exits, total_cost, created_at)
