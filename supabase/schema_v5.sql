-- ══════════════════════════════════════════
-- MIGRAÇÃO V5 (completa) — Rodar no SQL Editor do Supabase
-- Inclui tudo de v2, v3, v4 + novidades de v5
-- Seguro rodar mesmo que versões anteriores já tenham sido aplicadas
-- ══════════════════════════════════════════

-- ── Colunas: pedidos ──────────────────────
alter table public.pedidos
  add column if not exists descricao_itens  text,
  add column if not exists valor_pedido     numeric(10,2) default 0,
  add column if not exists valor_motoboy    numeric(10,2) default 0,
  add column if not exists observacoes      text,
  add column if not exists status_cozinha   varchar(20) not null default 'na_fila';

-- ── Colunas: empresas ─────────────────────
alter table public.empresas
  add column if not exists codigo  varchar(6),
  add column if not exists cnpj    text,
  add column if not exists ativo   boolean not null default true;

-- Gera código para empresas sem código
update public.empresas
set codigo = upper(substring(md5(id::text) from 1 for 6))
where codigo is null;

-- ── Colunas: motoboys ─────────────────────
alter table public.motoboys
  add column if not exists auth_id      uuid references auth.users(id) on delete cascade,
  add column if not exists email        text,
  add column if not exists posicao_fila integer;

-- empresa_id opcional (motoboy cadastra-se sem empresa)
alter table public.motoboys alter column empresa_id drop not null;

-- ── Índice único CNPJ ─────────────────────
create unique index if not exists empresas_cnpj_unique
  on public.empresas(cnpj) where cnpj is not null;

-- ── Policies RLS ─────────────────────────
drop policy if exists "empresas_self_select"   on public.empresas;
create policy "empresas_self_select"
  on public.empresas for select using (id = auth.uid());

drop policy if exists "motoboys_self_insert"   on public.motoboys;
create policy "motoboys_self_insert"
  on public.motoboys for insert with check (auth_id = auth.uid());

drop policy if exists "motoboy_see_own"        on public.motoboys;
create policy "motoboy_see_own"
  on public.motoboys for select
  using (auth.uid() = auth_id OR empresa_id = auth.uid());

drop policy if exists "motoboys_empresa_crud"  on public.motoboys;
create policy "motoboys_empresa_crud"
  on public.motoboys for all
  using (empresa_id = auth.uid() OR auth_id = auth.uid());

drop policy if exists "pedidos_motoboy_select" on public.pedidos;
create policy "pedidos_motoboy_select"
  on public.pedidos for select
  using (
    empresa_id = auth.uid()
    OR motoboy_id IN (select id from public.motoboys where auth_id = auth.uid())
  );

drop policy if exists "pedidos_empresa_crud"   on public.pedidos;
create policy "pedidos_empresa_crud"
  on public.pedidos for all
  using (
    empresa_id = auth.uid()
    OR motoboy_id IN (select id from public.motoboys where auth_id = auth.uid())
  );

-- ── Trigger: novo usuário ─────────────────
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_tipo   text;
  v_nome   text;
  v_codigo text;
begin
  v_tipo := coalesce(new.raw_user_meta_data->>'tipo', 'empresa');
  v_nome := coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1));

  if v_tipo = 'empresa' then
    loop
      v_codigo := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
      exit when not exists (select 1 from public.empresas where codigo = v_codigo);
    end loop;

    insert into public.empresas(id, nome, email, codigo)
    values (new.id, v_nome, new.email, v_codigo)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── RPC: get_empresa_id_by_codigo ─────────
create or replace function public.get_empresa_id_by_codigo(p_codigo text)
returns uuid
language sql security definer stable
as $$
  select id from public.empresas
  where upper(codigo) = upper(p_codigo)
  limit 1;
$$;
grant execute on function public.get_empresa_id_by_codigo(text) to anon, authenticated;

-- ── RPC: get_motoboy_by_email ──────────────
create or replace function public.get_motoboy_by_email(p_email text)
returns table(id uuid, nome text, telefone text, email text, empresa_id uuid)
language sql security definer stable
as $$
  select id, nome, telefone, email, empresa_id
  from public.motoboys
  where lower(email) = lower(p_email)
  limit 1;
$$;
grant execute on function public.get_motoboy_by_email(text) to authenticated;

-- ── RPC: hire_motoboy ─────────────────────
create or replace function public.hire_motoboy(p_motoboy_id uuid, p_empresa_id uuid)
returns boolean
language plpgsql security definer
as $$
begin
  if auth.uid() != p_empresa_id then return false; end if;
  update public.motoboys
  set empresa_id = p_empresa_id, posicao_fila = 999
  where id = p_motoboy_id;
  return found;
end;
$$;
grant execute on function public.hire_motoboy(uuid, uuid) to authenticated;

-- ── RPC: get_pedidos_cozinha ──────────────
create or replace function public.get_pedidos_cozinha(p_empresa_id uuid)
returns table(
  id              uuid,
  cliente_nome    text,
  descricao_itens text,
  valor_pedido    numeric,
  status          text,
  status_cozinha  text,
  created_at      timestamptz
)
language sql security definer stable
as $$
  select id, cliente_nome, descricao_itens, valor_pedido,
         status, status_cozinha, created_at
  from public.pedidos
  where empresa_id = p_empresa_id
    and status not in ('entregue', 'cancelado')
  order by created_at asc;
$$;
grant execute on function public.get_pedidos_cozinha(uuid) to anon, authenticated;

-- ── RPC: update_status_cozinha ────────────
create or replace function public.update_status_cozinha(
  p_pedido_id  uuid,
  p_status     text,
  p_empresa_id uuid
)
returns boolean
language plpgsql security definer
as $$
begin
  if p_status not in ('na_fila', 'em_producao', 'finalizado') then
    return false;
  end if;
  update public.pedidos
  set status_cozinha = p_status
  where id = p_pedido_id and empresa_id = p_empresa_id;
  return found;
end;
$$;
grant execute on function public.update_status_cozinha(uuid, text, uuid) to anon, authenticated;

-- ── RPC: set_empresa_ativo ────────────────
create or replace function public.set_empresa_ativo(p_ativo boolean)
returns void
language plpgsql security definer
as $$
begin
  update public.empresas set ativo = p_ativo where id = auth.uid();
end;
$$;
grant execute on function public.set_empresa_ativo(boolean) to authenticated;

-- ── RPC: update_empresa ───────────────────
create or replace function public.update_empresa(p_nome text, p_cnpj text)
returns void
language plpgsql security definer
as $$
begin
  update public.empresas set nome = p_nome, cnpj = p_cnpj where id = auth.uid();
end;
$$;
grant execute on function public.update_empresa(text, text) to authenticated;
