-- schema_v20: rotas de entrega múltipla + endereço manual

-- 1. Tabela de rotas de entrega
create table if not exists public.delivery_routes (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  motoboy_id uuid not null references public.motoboys(id),
  status     text not null default 'aguardando_saida'
               check (status in ('aguardando_saida','em_rota','parcialmente_entregue','concluida')),
  saiu_em    timestamptz,
  created_at timestamptz not null default now()
);

alter table public.delivery_routes enable row level security;

drop policy if exists "routes_empresa" on public.delivery_routes;
create policy "routes_empresa" on public.delivery_routes for all
  using (empresa_id = auth.uid());

drop policy if exists "routes_motoboy_select" on public.delivery_routes;
create policy "routes_motoboy_select" on public.delivery_routes for select
  using (
    motoboy_id in (select id from public.motoboys where auth_id = auth.uid())
  );

drop policy if exists "routes_motoboy_update" on public.delivery_routes;
create policy "routes_motoboy_update" on public.delivery_routes for update
  using (
    motoboy_id in (select id from public.motoboys where auth_id = auth.uid())
  );

-- 2. Colunas em pedidos para rota e endereço manual
alter table public.pedidos
  add column if not exists route_id      uuid references public.delivery_routes(id) on delete set null,
  add column if not exists route_address text;

-- 3. Realtime para rotas
alter publication supabase_realtime add table public.delivery_routes;
