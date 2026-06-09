-- MIGRAÇÃO V25 — Planos de acesso (limite de motoboys por plano)

-- Coluna plano na tabela empresas
alter table empresas
  add column if not exists plano text not null default 'basic'
    check (plano in ('basic', 'pro', 'enterprise'));

-- Limites por plano (referência):
--   basic      → 3  motoboys
--   pro        → 15 motoboys
--   enterprise → ilimitado (999)

-- Função que retorna o limite de motoboys para o plano
create or replace function limite_motoboys(p_plano text)
returns int
language sql
immutable
as $$
  select case p_plano
    when 'basic'      then 3
    when 'pro'        then 15
    when 'enterprise' then 999
    else 3
  end;
$$;

-- Função que verifica se a empresa pode cadastrar mais motoboys
create or replace function pode_cadastrar_motoboy(p_empresa_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_plano   text;
  v_limite  int;
  v_atual   int;
begin
  select plano into v_plano from empresas where id = p_empresa_id;
  v_limite := limite_motoboys(v_plano);
  select count(*) into v_atual from motoboys where empresa_id = p_empresa_id;
  return v_atual < v_limite;
end;
$$;
