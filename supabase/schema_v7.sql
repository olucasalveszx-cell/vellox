-- ══════════════════════════════════════════
-- MIGRAÇÃO V7 — God Account + Assinaturas Kirvano
-- Rodar no SQL Editor do Supabase
-- ══════════════════════════════════════════

-- ── Colunas de assinatura em empresas ────
alter table public.empresas
  add column if not exists assinatura_ativa       boolean     not null default false,
  add column if not exists assinatura_expira_em   timestamptz,
  add column if not exists kirvano_subscriber_id  text;

-- ── RPC: ativar assinatura (via webhook com service role) ─
-- Usado pelo webhook do Kirvano para ativar/renovar assinatura
create or replace function public.ativar_assinatura(
  p_email              text,
  p_expira_em          timestamptz,
  p_kirvano_id         text default null
)
returns boolean
language plpgsql security definer
as $$
begin
  update public.empresas
  set
    assinatura_ativa      = true,
    assinatura_expira_em  = p_expira_em,
    kirvano_subscriber_id = coalesce(p_kirvano_id, kirvano_subscriber_id)
  where email = p_email;
  return found;
end;
$$;

-- ── RPC: desativar assinatura ─────────────
create or replace function public.desativar_assinatura(p_email text)
returns boolean
language plpgsql security definer
as $$
begin
  update public.empresas
  set assinatura_ativa = false
  where email = p_email;
  return found;
end;
$$;

-- ── RPC: god — listar todas as empresas ──
-- Retorna todas as empresas com stats (usado pelo painel god)
create or replace function public.god_list_empresas()
returns table(
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
  total_motoboys        bigint
)
language sql security definer stable
as $$
  select
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
    (select count(*) from public.pedidos  p where p.empresa_id = e.id) as total_pedidos,
    (select count(*) from public.motoboys m where m.empresa_id = e.id) as total_motoboys
  from public.empresas e
  order by e.created_at desc;
$$;
-- Apenas service role pode chamar esta função (sem grant para anon/authenticated)

-- ── RPC: god — toggle assinatura manualmente ─
create or replace function public.god_toggle_assinatura(
  p_empresa_id  uuid,
  p_ativo       boolean,
  p_expira_em   timestamptz default null
)
returns boolean
language plpgsql security definer
as $$
begin
  update public.empresas
  set
    assinatura_ativa     = p_ativo,
    assinatura_expira_em = case when p_ativo then coalesce(p_expira_em, now() + interval '30 days') else assinatura_expira_em end
  where id = p_empresa_id;
  return found;
end;
$$;
-- Apenas service role pode chamar esta função (sem grant para anon/authenticated)
