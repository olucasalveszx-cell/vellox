-- Índices de performance para a query principal da loja
CREATE INDEX IF NOT EXISTS produtos_empresa_ativo_idx
  ON public.produtos (empresa_id, ativo);

CREATE INDEX IF NOT EXISTS produtos_empresa_categoria_idx
  ON public.produtos (empresa_id, ativo, categoria);

CREATE INDEX IF NOT EXISTS configuracao_loja_empresa_id_idx
  ON public.configuracao_loja (empresa_id);

CREATE INDEX IF NOT EXISTS bairros_taxa_empresa_ativo_idx
  ON public.bairros_taxa (empresa_id, ativo);

CREATE INDEX IF NOT EXISTS produto_categorias_sabor_produto_id_idx
  ON public.produto_categorias_sabor (produto_id);
