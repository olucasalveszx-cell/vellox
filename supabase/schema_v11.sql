-- schema_v11: geofence + cidade/estado/pais na tabela empresas
alter table public.empresas
  add column if not exists raio_geofence integer default 50,
  add column if not exists cidade        text,
  add column if not exists estado        text,
  add column if not exists pais          text;
