-- schema_v46: campo origem nos pedidos para separar catalogo de manual
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'manual'
  CHECK (origem IN ('manual', 'catalogo'));
