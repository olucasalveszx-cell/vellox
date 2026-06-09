-- Atualiza god_list_empresas para incluir plano
DROP FUNCTION IF EXISTS public.god_list_empresas();
CREATE OR REPLACE FUNCTION public.god_list_empresas()
RETURNS TABLE(
  id                    uuid,
  nome                  text,
  email                 text,
  cnpj                  text,
  codigo                varchar,
  ativo                 boolean,
  assinatura_ativa      boolean,
  assinatura_expira_em  timestamptz,
  kirvano_subscriber_id text,
  created_at            timestamptz,
  total_pedidos         bigint,
  total_motoboys        bigint,
  plano                 text
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    e.id,
    e.nome,
    e.email,
    e.cnpj,
    e.codigo,
    e.ativo,
    e.assinatura_ativa,
    e.assinatura_expira_em,
    e.kirvano_subscriber_id,
    e.created_at,
    (SELECT count(*) FROM public.pedidos  p WHERE p.empresa_id = e.id) AS total_pedidos,
    (SELECT count(*) FROM public.motoboys m WHERE m.empresa_id = e.id) AS total_motoboys,
    COALESCE(e.plano, 'basic') AS plano
  FROM public.empresas e
  ORDER BY e.created_at DESC;
$$;
