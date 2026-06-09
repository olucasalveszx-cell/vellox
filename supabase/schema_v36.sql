-- schema_v36: tipo_preco por sabor + preco_padrao_sabor global na configuracao_loja

ALTER TABLE public.produto_sabores
  ADD COLUMN IF NOT EXISTS tipo_preco text NOT NULL DEFAULT 'padrao'
  CHECK (tipo_preco IN ('padrao', 'classico', 'premium'));

ALTER TABLE public.configuracao_loja
  ADD COLUMN IF NOT EXISTS preco_padrao_sabor numeric(10,2) NOT NULL DEFAULT 0;
