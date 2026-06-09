-- schema_v47: tracking_token para rastreamento de pedidos sem login
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS tracking_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pedidos_tracking_token
  ON public.pedidos(tracking_token)
  WHERE tracking_token IS NOT NULL;
