-- schema_v23: catálogo de produtos + configuração da loja pública

-- ── Tabela de produtos ──────────────────────────────────────────────
create table if not exists public.produtos (
  id           uuid          default gen_random_uuid() primary key,
  empresa_id   uuid          not null references auth.users(id) on delete cascade,
  nome         text          not null,
  descricao    text          not null default '',
  preco        numeric(10,2) not null default 0,
  categoria    text          not null default 'Outros',
  imagem_url   text,
  ativo        boolean       not null default true,
  ordem        int           not null default 0,
  created_at   timestamptz   not null default now()
);

alter table public.produtos enable row level security;

drop policy if exists "empresa_owns_produtos" on public.produtos;
drop policy if exists "public_read_produtos"  on public.produtos;

-- empresa pode fazer tudo nos seus próprios produtos
create policy "empresa_owns_produtos" on public.produtos
  for all using (auth.uid() = empresa_id);

-- qualquer pessoa pode ler produtos (necessário para loja pública)
create policy "public_read_produtos" on public.produtos
  for select using (true);

-- ── Tabela de configuração da loja ──────────────────────────────────
create table if not exists public.configuracao_loja (
  empresa_id    uuid          primary key references auth.users(id) on delete cascade,
  cor_principal text          not null default '#ef4444',
  logo_url      text,
  banner_url    text,
  descricao     text          not null default '',
  aberto        boolean       not null default true,
  tempo_entrega text          not null default '30-45 min',
  taxa_entrega  numeric(10,2) not null default 0,
  updated_at    timestamptz   not null default now()
);

alter table public.configuracao_loja enable row level security;

drop policy if exists "empresa_owns_config_loja" on public.configuracao_loja;
drop policy if exists "public_read_config_loja"  on public.configuracao_loja;

create policy "empresa_owns_config_loja" on public.configuracao_loja
  for all using (auth.uid() = empresa_id);

create policy "public_read_config_loja" on public.configuracao_loja
  for select using (true);

-- ── Permite inserção anônima de pedidos via loja pública ────────────
drop policy if exists "anon_insert_pedido" on public.pedidos;
create policy "anon_insert_pedido" on public.pedidos
  for insert with check (
    empresa_id in (select id from auth.users)
    and status = 'em_fila'
  );

-- ── Storage bucket público para imagens de produtos ─────────────────
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;

drop policy if exists "public_read_produtos_storage"    on storage.objects;
drop policy if exists "empresa_insert_produtos_storage" on storage.objects;
drop policy if exists "empresa_update_produtos_storage" on storage.objects;
drop policy if exists "empresa_delete_produtos_storage" on storage.objects;

create policy "public_read_produtos_storage" on storage.objects
  for select using (bucket_id = 'produtos');

create policy "empresa_insert_produtos_storage" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'produtos');

create policy "empresa_update_produtos_storage" on storage.objects
  for update to authenticated
  using (bucket_id = 'produtos');

create policy "empresa_delete_produtos_storage" on storage.objects
  for delete to authenticated
  using (bucket_id = 'produtos');

-- ── Realtime para produtos e configuração ───────────────────────────
alter publication supabase_realtime add table public.produtos;
alter publication supabase_realtime add table public.configuracao_loja;
