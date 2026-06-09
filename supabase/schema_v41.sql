-- schema_v41: horario_funcionamento em configuracao_loja

ALTER TABLE public.configuracao_loja
  ADD COLUMN IF NOT EXISTS horario_funcionamento text;
