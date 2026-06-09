-- ── Novo fluxo de status de pedidos ─────────────────────────────
-- em_fila → em_preparo → finalizado → em_rota_de_entrega → entregue

-- 1. Remove constraint antiga
alter table public.pedidos drop constraint if exists pedidos_status_check;

-- 2. Adiciona constraint com novos status
alter table public.pedidos
  add constraint pedidos_status_check
  check (status in ('em_fila', 'em_preparo', 'finalizado', 'em_rota_de_entrega', 'entregue', 'cancelado'));

-- 3. Atualiza default
alter table public.pedidos alter column status set default 'em_fila';

-- 4. Migra dados existentes
update public.pedidos set status = 'em_fila'             where status = 'pendente';
update public.pedidos set status = 'em_rota_de_entrega'  where status = 'em_rota';
