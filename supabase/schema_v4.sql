-- ══════════════════════════════════════════
-- MIGRAÇÃO V4 — Rodar no SQL Editor do Supabase
-- ══════════════════════════════════════════

-- 1. CNPJ na tabela de empresas (nullable para não quebrar contas existentes)
alter table public.empresas
  add column if not exists cnpj varchar(18);

-- Índice único para CNPJs não nulos
create unique index if not exists empresas_cnpj_unique
  on public.empresas(cnpj)
  where cnpj is not null;

-- 2. RPC: buscar motoboy por email (para "contratar por email")
create or replace function public.get_motoboy_by_email(p_email text)
returns table(id uuid, nome text, telefone text, email text, empresa_id uuid)
language sql
security definer
stable
as $$
  select id, nome, telefone, email, empresa_id
  from public.motoboys
  where lower(email) = lower(p_email)
  limit 1;
$$;

grant execute on function public.get_motoboy_by_email(text) to authenticated;

-- 3. RPC: empresa contrata motoboy (atualiza empresa_id do motoboy)
create or replace function public.hire_motoboy(p_motoboy_id uuid, p_empresa_id uuid)
returns boolean
language plpgsql
security definer
as $$
begin
  -- Garante que quem chama é realmente a empresa
  if auth.uid() != p_empresa_id then
    return false;
  end if;

  update public.motoboys
  set empresa_id = p_empresa_id,
      posicao_fila = 999
  where id = p_motoboy_id;

  return found;
end;
$$;

grant execute on function public.hire_motoboy(uuid, uuid) to authenticated;
