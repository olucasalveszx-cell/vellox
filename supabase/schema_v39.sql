-- schema_v39: campos WhatsApp (Z-API) em configuracao_loja
ALTER TABLE public.configuracao_loja
  ADD COLUMN IF NOT EXISTS whatsapp_instance_id TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_token       TEXT;
