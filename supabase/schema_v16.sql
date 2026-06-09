-- schema_v16: campo tipo_pedido (entrega | retirada) na tabela pedidos

alter table public.pedidos
  add column if not exists tipo_pedido text default 'entrega';

alter table public.pedidos
  drop constraint if exists pedidos_tipo_pedido_check;

alter table public.pedidos
  add constraint pedidos_tipo_pedido_check
  check (tipo_pedido in ('entrega', 'retirada'));

-- Pedidos existentes sem tipo ficam como entrega
update public.pedidos set tipo_pedido = 'entrega' where tipo_pedido is null;
