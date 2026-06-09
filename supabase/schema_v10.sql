-- ── Distância da entrega ─────────────────────────────────────────
-- Calculada via Haversine no cliente ao criar o pedido

alter table public.pedidos
  add column if not exists distancia_km double precision;
