-- ══════════════════════════════════════════
-- MIGRAÇÃO V6 — Rodar no SQL Editor do Supabase
-- ══════════════════════════════════════════

-- 1. Garante colunas que podem não existir ainda (schema_v2 pode não ter sido rodado)
alter table public.motoboys
  add column if not exists auth_id uuid references auth.users(id) on delete cascade,
  add column if not exists email   text;

-- 2. empresa_id agora é opcional (motoboy pode se cadastrar sem empresa)
alter table public.motoboys
  alter column empresa_id drop not null;

-- 2. Tabela de convites (empresa → motoboy)
create table if not exists public.convites (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  motoboy_id  uuid not null references public.motoboys(id) on delete cascade,
  status      varchar(20) not null default 'pendente'
                check (status in ('pendente', 'aceito', 'recusado')),
  created_at  timestamptz not null default now(),
  unique (empresa_id, motoboy_id)
);

-- 3. RPC: empresa envia convite para motoboy (usa auth.uid() como empresa_id)
create or replace function public.send_convite(p_motoboy_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Não autorizado';
  end if;

  -- Motoboy já é da empresa?
  if exists (
    select 1 from public.motoboys
    where id = p_motoboy_id and empresa_id = auth.uid()
  ) then
    raise exception 'Motoboy já faz parte da sua equipe';
  end if;

  -- Reenvia se já existia como recusado
  insert into public.convites (empresa_id, motoboy_id, status)
  values (auth.uid(), p_motoboy_id, 'pendente')
  on conflict (empresa_id, motoboy_id)
    do update set status = 'pendente', created_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.send_convite(uuid) to authenticated;

-- 4. RPC: motoboy lista seus convites pendentes
create or replace function public.get_meus_convites()
returns table(
  id           uuid,
  empresa_id   uuid,
  empresa_nome text,
  status       text,
  created_at   timestamptz
)
language sql
security definer
stable
as $$
  select c.id, c.empresa_id, e.nome as empresa_nome, c.status, c.created_at
  from public.convites c
  join public.empresas e on e.id = c.empresa_id
  join public.motoboys m on m.id = c.motoboy_id and m.auth_id = auth.uid()
  where c.status = 'pendente'
  order by c.created_at desc;
$$;

grant execute on function public.get_meus_convites() to authenticated;

-- 5. RPC: motoboy aceita ou recusa um convite
create or replace function public.responder_convite(p_convite_id uuid, p_aceitar boolean)
returns boolean
language plpgsql
security definer
as $$
declare
  v_motoboy_id uuid;
  v_convite    public.convites%rowtype;
begin
  select id into v_motoboy_id
  from public.motoboys
  where auth_id = auth.uid();

  if v_motoboy_id is null then return false; end if;

  select * into v_convite
  from public.convites
  where id = p_convite_id
    and motoboy_id = v_motoboy_id
    and status = 'pendente';

  if not found then return false; end if;

  if p_aceitar then
    update public.convites set status = 'aceito'  where id = p_convite_id;
    update public.motoboys
       set empresa_id = v_convite.empresa_id, posicao_fila = 999
     where id = v_motoboy_id;
  else
    update public.convites set status = 'recusado' where id = p_convite_id;
  end if;

  return true;
end;
$$;

grant execute on function public.responder_convite(uuid, boolean) to authenticated;
