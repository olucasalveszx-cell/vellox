-- schema_v45: adiciona plano "ktl" ao check constraint da coluna plano
-- KTL = painel reduzido: apenas pedidos, financeiro e catálogo

-- Remove o constraint antigo e recria incluindo 'ktl'
ALTER TABLE public.empresas DROP CONSTRAINT IF EXISTS empresas_plano_check;
ALTER TABLE public.empresas
  ADD CONSTRAINT empresas_plano_check
  CHECK (plano IN ('basic', 'pro', 'enterprise', 'ktl'));

-- Também garante que o DEFAULT da coluna plano continue sendo 'basic'
ALTER TABLE public.empresas ALTER COLUMN plano SET DEFAULT 'basic';
