-- schema_v12: codigo unico por motoboy + funcao de busca por codigo
alter table public.motoboys
  add column if not exists codigo text unique;

-- Gera codigo para motoboys existentes
update public.motoboys
set codigo = upper(substring(md5(random()::text || id::text), 1, 6))
where codigo is null;

-- Trigger para gerar codigo automaticamente em novos motoboys
create or replace function public.gerar_codigo_motoboy()
returns trigger language plpgsql as $$
declare
  novo_codigo text;
begin
  loop
    novo_codigo := upper(substring(md5(random()::text), 1, 6));
    exit when not exists (select 1 from public.motoboys where codigo = novo_codigo);
  end loop;
  new.codigo := novo_codigo;
  return new;
end;
$$;

drop trigger if exists trg_gerar_codigo_motoboy on public.motoboys;
create trigger trg_gerar_codigo_motoboy
  before insert on public.motoboys
  for each row
  when (new.codigo is null)
  execute function public.gerar_codigo_motoboy();

-- Busca motoboy por codigo (security definer para cruzar empresas)
create or replace function public.get_motoboy_by_codigo(p_codigo text)
returns table (
  id         uuid,
  nome       text,
  telefone   text,
  email      text,
  empresa_id uuid
)
language sql
security definer
stable
as $$
  select m.id, m.nome, m.telefone, m.email, m.empresa_id
  from public.motoboys m
  where upper(m.codigo) = upper(trim(p_codigo))
  limit 1;
$$;
