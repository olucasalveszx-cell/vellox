ALTER TABLE public.configuracao_loja
  ADD COLUMN IF NOT EXISTS modo_calculo_pizza text DEFAULT 'maior_valor'
  CHECK (modo_calculo_pizza IN ('maior_valor', 'proporcional'));
