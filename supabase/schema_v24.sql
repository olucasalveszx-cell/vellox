-- MIGRAÇÃO V24 — Taxa de entrega por bairro

-- Tabela de bairros com taxa de entrega por empresa
create table if not exists bairros_taxa (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  bairro      text not null,
  taxa        numeric(10,2) not null default 0,
  ativo       boolean not null default true,
  ordem       int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists bairros_taxa_empresa_idx on bairros_taxa(empresa_id);

-- Coluna bairro no pedido
alter table pedidos
  add column if not exists bairro text;

-- RLS
alter table bairros_taxa enable row level security;

-- Empresa vê/gerencia seus próprios bairros
create policy "empresa_manage_bairros" on bairros_taxa
  for all
  using (empresa_id = auth.uid())
  with check (empresa_id = auth.uid());

-- Anônimo pode ler bairros ativos (para a loja pública)
create policy "anon_read_bairros" on bairros_taxa
  for select
  using (ativo = true);
