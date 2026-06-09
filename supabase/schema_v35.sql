-- schema_v35: produto_variacoes, produto_sabores, produto_adicionais + tipo em produtos

-- Adiciona tipo ao catálogo
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'simples'
  CHECK (tipo IN ('simples', 'pizza'));

-- ── Variações de tamanho/versão ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.produto_variacoes (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id  uuid          NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  nome        text          NOT NULL,
  preco       numeric(10,2) NOT NULL DEFAULT 0,
  max_sabores int           NOT NULL DEFAULT 1,
  ordem       int           NOT NULL DEFAULT 0,
  ativo       boolean       NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS produto_variacoes_produto_id
  ON public.produto_variacoes (produto_id, ordem);

-- ── Sabores (pizzas e similares) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.produto_sabores (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id  uuid  NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  nome        text  NOT NULL,
  descricao   text  NOT NULL DEFAULT '',
  imagem_url  text,
  ordem       int   NOT NULL DEFAULT 0,
  ativo       boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS produto_sabores_produto_id
  ON public.produto_sabores (produto_id, ordem);

-- ── Adicionais (bordas, extras, acompanhamentos) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.produto_adicionais (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id  uuid          NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  nome        text          NOT NULL,
  preco       numeric(10,2) NOT NULL DEFAULT 0,
  obrigatorio boolean       NOT NULL DEFAULT false,
  ordem       int           NOT NULL DEFAULT 0,
  ativo       boolean       NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS produto_adicionais_produto_id
  ON public.produto_adicionais (produto_id, ordem);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.produto_variacoes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_sabores    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_adicionais ENABLE ROW LEVEL SECURITY;

-- Leitura pública (loja)
CREATE POLICY "publico_le_variacoes" ON public.produto_variacoes
  FOR SELECT USING (true);

CREATE POLICY "publico_le_sabores" ON public.produto_sabores
  FOR SELECT USING (true);

CREATE POLICY "publico_le_adicionais" ON public.produto_adicionais
  FOR SELECT USING (true);

-- Empresa gerencia os próprios
CREATE POLICY "empresa_gerencia_variacoes" ON public.produto_variacoes
  FOR ALL USING (
    produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = auth.uid())
  );

CREATE POLICY "empresa_gerencia_sabores" ON public.produto_sabores
  FOR ALL USING (
    produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = auth.uid())
  );

CREATE POLICY "empresa_gerencia_adicionais" ON public.produto_adicionais
  FOR ALL USING (
    produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = auth.uid())
  );
