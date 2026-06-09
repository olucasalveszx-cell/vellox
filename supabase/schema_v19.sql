-- schema_v19: add despacho_automatico to empresas
alter table public.empresas
  add column if not exists despacho_automatico boolean not null default false;
