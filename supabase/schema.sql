-- Extensões
create extension if not exists "uuid-ossp";

-- Tabela empresas (espelha auth.users)
create table if not exists public.empresas (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  created_at timestamptz default now()
);

-- Tabela motoboys
create table if not exists public.motoboys (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  telefone text not null,
  status text not null default 'disponivel' check (status in ('disponivel', 'em_entrega', 'offline')),
  latitude double precision,
  longitude double precision,
  ultima_localizacao_at timestamptz,
  posicao_fila integer,
  created_at timestamptz default now()
);

-- Tabela pedidos
create table if not exists public.pedidos (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  motoboy_id uuid references public.motoboys(id) on delete set null,
  cliente_nome text not null,
  cliente_telefone text not null,
  endereco_entrega text not null,
  endereco_lat double precision,
  endereco_lng double precision,
  status text not null default 'pendente' check (status in ('pendente', 'em_rota', 'entregue', 'cancelado')),
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices
create index if not exists idx_motoboys_empresa on public.motoboys(empresa_id);
create index if not exists idx_pedidos_empresa on public.pedidos(empresa_id);
create index if not exists idx_pedidos_status on public.pedidos(status);

-- RLS (Row Level Security) — multiempresa
alter table public.empresas enable row level security;
alter table public.motoboys enable row level security;
alter table public.pedidos enable row level security;

-- Policies: empresa só vê os próprios dados
create policy "empresa_select_own" on public.empresas
  for select using (auth.uid() = id);

create policy "empresa_update_own" on public.empresas
  for update using (auth.uid() = id);

create policy "motoboys_empresa_crud" on public.motoboys
  for all using (empresa_id = auth.uid());

create policy "pedidos_empresa_crud" on public.pedidos
  for all using (empresa_id = auth.uid());

-- Trigger: cria registro em empresas ao registrar usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.empresas(id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: atualiza updated_at nos pedidos
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_pedidos_updated_at on public.pedidos;
create trigger set_pedidos_updated_at
  before update on public.pedidos
  for each row execute function public.update_updated_at();

-- Realtime: habilitar para as tabelas necessárias
alter publication supabase_realtime add table public.motoboys;
alter publication supabase_realtime add table public.pedidos;
