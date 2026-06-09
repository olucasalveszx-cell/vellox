-- ────────────────────────────────────────────────────────────────
-- Multi-loja + ajustes de plano
-- ────────────────────────────────────────────────────────────────

-- Tabela de lojas (Business plan)
CREATE TABLE IF NOT EXISTS public.lojas (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  nome        text NOT NULL,
  slug        text,
  descricao   text DEFAULT '',
  cor         text DEFAULT '#ef4444',
  logo_url    text,
  ativo       boolean DEFAULT true,
  ordem       int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lojas_empresa_id_idx ON public.lojas (empresa_id);
CREATE UNIQUE INDEX IF NOT EXISTS lojas_empresa_slug_unique
  ON public.lojas (empresa_id, slug) WHERE slug IS NOT NULL;

ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='lojas' AND policyname='empresa vê suas lojas'
  ) THEN
    CREATE POLICY "empresa vê suas lojas" ON public.lojas
      FOR ALL USING (empresa_id = auth.uid()) WITH CHECK (empresa_id = auth.uid());
  END IF;
END $$;

-- Adicionar loja_id em pedidos (nullable para compatibilidade)
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS pedidos_loja_id_idx ON public.pedidos (loja_id);

-- Adicionar loja_id em produtos (nullable para compatibilidade)
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS produtos_loja_id_idx ON public.produtos (loja_id);

-- Slug automático para lojas
CREATE OR REPLACE FUNCTION public.auto_slug_loja()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  base text;
  attempt text;
  counter int := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN RETURN NEW; END IF;
  base := lower(NEW.nome);
  base := translate(base, 'àáâãäåèéêëìíîïòóôõöùúûüç', 'aaaaaaeeeeiiiioooooouuuuc');
  base := regexp_replace(base, '[^a-z0-9]', '-', 'g');
  base := regexp_replace(base, '-+', '-', 'g');
  base := trim(both '-' from base);
  IF base = '' THEN base := 'loja'; END IF;
  attempt := base;
  WHILE EXISTS (SELECT 1 FROM public.lojas l WHERE l.empresa_id = NEW.empresa_id AND l.slug = attempt AND l.id <> NEW.id) LOOP
    attempt := base || '-' || counter;
    counter := counter + 1;
  END LOOP;
  NEW.slug := attempt;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_slug_loja ON public.lojas;
CREATE TRIGGER trg_auto_slug_loja
  BEFORE INSERT OR UPDATE OF nome ON public.lojas
  FOR EACH ROW EXECUTE FUNCTION public.auto_slug_loja();
