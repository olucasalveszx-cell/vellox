-- schema_v15: RPCs para o painel do motoboy acessar pedidos da empresa

-- 1. RPC: retorna fila completa de pedidos ativos da empresa do motoboy
create or replace function public.get_fila_pedidos_motoboy()
returns table (
  id                uuid,
  empresa_id        uuid,
  motoboy_id        uuid,
  cliente_nome      text,
  cliente_telefone  text,
  endereco_entrega  text,
  endereco_lat      double precision,
  endereco_lng      double precision,
  descricao_itens   text,
  valor_pedido      numeric,
  valor_motoboy     numeric,
  status            text,
  observacoes       text,
  distancia_km      double precision,
  created_at        timestamptz,
  updated_at        timestamptz
)
language sql security definer stable
as $$
  select
    p.id, p.empresa_id, p.motoboy_id,
    p.cliente_nome, p.cliente_telefone, p.endereco_entrega,
    p.endereco_lat, p.endereco_lng, p.descricao_itens,
    p.valor_pedido, p.valor_motoboy, p.status::text,
    p.observacoes, p.distancia_km, p.created_at, p.updated_at
  from public.pedidos p
  join public.motoboys m on m.empresa_id = p.empresa_id
  where m.auth_id = auth.uid()
    and m.empresa_id is not null
    and p.status in ('em_fila','em_preparo','finalizado','em_coleta','em_rota_de_entrega')
  order by p.created_at asc;
$$;

grant execute on function public.get_fila_pedidos_motoboy() to authenticated;

-- 2. RPC: motoboy aceita pedido disponivel (bypass RLS)
create or replace function public.aceitar_pedido(p_pedido_id uuid)
returns boolean
language plpgsql security definer
as $$
declare
  v_motoboy_id uuid;
begin
  select id into v_motoboy_id
  from public.motoboys
  where auth_id = auth.uid() and empresa_id is not null;

  if v_motoboy_id is null then return false; end if;

  update public.pedidos
  set motoboy_id = v_motoboy_id, status = 'em_coleta', updated_at = now()
  where id = p_pedido_id
    and status = 'finalizado'
    and motoboy_id is null;

  if found then
    update public.motoboys set status = 'em_entrega' where id = v_motoboy_id;
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.aceitar_pedido(uuid) to authenticated;

-- 3. Atualiza policy de SELECT para motoboy ver todos pedidos da sua empresa
--    (necessário também para Realtime funcionar)
drop policy if exists "pedidos_motoboy_select" on public.pedidos;
create policy "pedidos_motoboy_select"
  on public.pedidos for select
  using (
    empresa_id = auth.uid()
    OR motoboy_id in (select id from public.motoboys where auth_id = auth.uid())
    OR empresa_id in (
      select empresa_id from public.motoboys
      where auth_id = auth.uid() and empresa_id is not null
    )
  );

-- 4. Policy de UPDATE para motoboy atualizar pedidos atribuidos a ele
drop policy if exists "pedidos_motoboy_update" on public.pedidos;
create policy "pedidos_motoboy_update"
  on public.pedidos for update
  using (
    empresa_id = auth.uid()
    OR motoboy_id in (select id from public.motoboys where auth_id = auth.uid())
  );
