-- schema_v38: categorias_preco (faixas de preço por tamanho reutilizáveis)

-- ── Categorias de preço (empresa-level) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categorias_preco (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  uuid        NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome        text        NOT NULL,
  cor         text        NOT NULL DEFAULT '#6366f1',
  ordem       int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS categorias_preco_empresa_id
  ON public.categorias_preco (empresa_id, ordem);

-- ── Tamanhos dentro de cada categoria ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categorias_preco_tamanhos (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_preco_id  uuid          NOT NULL REFERENCES public.categorias_preco(id) ON DELETE CASCADE,
  nome                text          NOT NULL,
  preco               numeric(10,2) NOT NULL DEFAULT 0,
  max_sabores         int           NOT NULL DEFAULT 1,
  ordem               int           NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS categorias_preco_tamanhos_cat_id
  ON public.categorias_preco_tamanhos (categoria_preco_id, ordem);

-- ── Produto ganha referência à categoria de preço ──────────────────────────────
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS categoria_preco_id uuid
  REFERENCES public.categorias_preco(id) ON DELETE SET NULL;

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.categorias_preco         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_preco_tamanhos ENABLE ROW LEVEL SECURITY;

-- Leitura pública (loja precisa ler para exibir preços)
CREATE POLICY "publico_le_categorias_preco" ON public.categorias_preco
  FOR SELECT USING (true);

CREATE POLICY "publico_le_tamanhos_cat_preco" ON public.categorias_preco_tamanhos
  FOR SELECT USING (true);

-- Empresa gerencia as próprias categorias
CREATE POLICY "empresa_insere_cat_preco" ON public.categorias_preco
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = auth.uid());

CREATE POLICY "empresa_atualiza_cat_preco" ON public.categorias_preco
  FOR UPDATE TO authenticated
  USING (empresa_id = auth.uid())
  WITH CHECK (empresa_id = auth.uid());

CREATE POLICY "empresa_deleta_cat_preco" ON public.categorias_preco
  FOR DELETE TO authenticated
  USING (empresa_id = auth.uid());

-- Empresa gerencia tamanhos das próprias categorias
CREATE POLICY "empresa_gerencia_tamanhos_cat_preco" ON public.categorias_preco_tamanhos
  FOR ALL TO authenticated
  USING (
    categoria_preco_id IN (
      SELECT id FROM public.categorias_preco WHERE empresa_id = auth.uid()
    )
  )
  WITH CHECK (
    categoria_preco_id IN (
      SELECT id FROM public.categorias_preco WHERE empresa_id = auth.uid()
    )
  );
