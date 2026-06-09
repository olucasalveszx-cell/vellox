-- v26: campo verificado na empresa
alter table empresas add column if not exists verificado boolean not null default false;
