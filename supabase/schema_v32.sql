-- schema_v32: loja_id em motoboys + stats por loja

-- ── 1. Coluna loja_id na tabela motoboys ────────────────────────────
-- Permite vincular motoboys a uma loja específica (NULL = pool compartilhado)
ALTER TABLE public.motoboys
  ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_motoboys_loja_id ON public.motoboys(loja_id);

-- ── 2. Função: stats por loja (para o painel de franquias) ──────────
CREATE OR REPLACE FUNCTION public.loja_stats(p_empresa_id uuid)
RETURNS TABLE (
  loja_id          uuid,
  pedidos_hoje     bigint,
  faturamento_hoje numeric,
  entregues_hoje   bigint,
  motoboys_total   bigint,
  motoboys_livres  bigint
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    l.id                                                    AS loja_id,
    COUNT(DISTINCT p.id) FILTER (
      WHERE p.created_at >= date_trunc('day', now())
    )                                                       AS pedidos_hoje,
    COALESCE(SUM(p.valor_pedido) FILTER (
      WHERE p.created_at >= date_trunc('day', now())
    ), 0)                                                   AS faturamento_hoje,
    COUNT(DISTINCT p.id) FILTER (
      WHERE p.created_at >= date_trunc('day', now())
        AND p.status = 'entregue'
    )                                                       AS entregues_hoje,
    COUNT(DISTINCT mb.id)                                   AS motoboys_total,
    COUNT(DISTINCT mb.id) FILTER (
      WHERE mb.status = 'disponivel'
    )                                                       AS motoboys_livres
  FROM public.lojas l
  LEFT JOIN public.pedidos  p  ON p.loja_id   = l.id
  LEFT JOIN public.motoboys mb ON mb.loja_id  = l.id
  WHERE l.empresa_id = p_empresa_id
  GROUP BY l.id;
$$;
