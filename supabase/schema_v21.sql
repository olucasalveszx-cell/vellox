-- schema_v21: forma de pagamento e troco nos pedidos

alter table public.pedidos
  add column if not exists forma_pagamento text,
  add column if not exists troco_para      numeric(10,2);
