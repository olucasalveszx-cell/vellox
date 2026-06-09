-- ══════════════════════════════════════════
-- MIGRAÇÃO V3 — Rodar no SQL Editor do Supabase
-- ══════════════════════════════════════════

-- 1. RPC pública: buscar empresa por código (usada no cadastro de motoboy)
create or replace function public.get_empresa_id_by_codigo(p_codigo text)
returns uuid
language sql
security definer
stable
as $$
  select id from public.empresas
  where upper(codigo) = upper(p_codigo)
  limit 1;
$$;

-- Permitir execução por usuários anônimos e autenticados
grant execute on function public.get_empresa_id_by_codigo(text) to anon, authenticated;

-- 2. Policy: empresa pode ver seus próprios dados
-- (garante que after signUp o trigger pode inserir)
drop policy if exists "empresas_self_select" on public.empresas;
create policy "empresas_self_select"
  on public.empresas for select
  using (id = auth.uid());

-- 3. Motoboy pode inserir seu próprio registro após signup
-- (cobre o caso onde auth_id = auth.uid() no insert)
drop policy if exists "motoboys_self_insert" on public.motoboys;
create policy "motoboys_self_insert"
  on public.motoboys for insert
  with check (auth_id = auth.uid());
