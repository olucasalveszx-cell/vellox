-- Lista todos os motoboys com stats para o painel God
CREATE OR REPLACE FUNCTION public.god_list_motoboys()
RETURNS TABLE(
  id              uuid,
  nome            text,
  telefone        text,
  email           text,
  status          text,
  codigo          varchar,
  posicao_fila    int,
  empresa_id      uuid,
  empresa_nome    text,
  empresa_plano   text,
  total_entregas  bigint,
  entregas_hoje   bigint,
  ganho_total     numeric,
  ganho_hoje      numeric,
  created_at      timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    m.id,
    m.nome,
    m.telefone,
    m.email,
    m.status::text,
    m.codigo,
    m.posicao_fila,
    m.empresa_id,
    e.nome                          AS empresa_nome,
    COALESCE(e.plano, 'basic')      AS empresa_plano,
    (SELECT count(*)
       FROM public.pedidos p
      WHERE p.motoboy_id = m.id
        AND p.status = 'entregue')  AS total_entregas,
    (SELECT count(*)
       FROM public.pedidos p
      WHERE p.motoboy_id = m.id
        AND p.status = 'entregue'
        AND p.updated_at >= CURRENT_DATE) AS entregas_hoje,
    (SELECT COALESCE(sum(p.valor_motoboy), 0)
       FROM public.pedidos p
      WHERE p.motoboy_id = m.id
        AND p.status = 'entregue')  AS ganho_total,
    (SELECT COALESCE(sum(p.valor_motoboy), 0)
       FROM public.pedidos p
      WHERE p.motoboy_id = m.id
        AND p.status = 'entregue'
        AND p.updated_at >= CURRENT_DATE) AS ganho_hoje,
    m.created_at
  FROM public.motoboys m
  LEFT JOIN public.empresas e ON e.id = m.empresa_id
  ORDER BY
    CASE m.status WHEN 'em_entrega' THEN 0 WHEN 'disponivel' THEN 1 ELSE 2 END,
    e.nome ASC,
    m.nome ASC;
$$;
