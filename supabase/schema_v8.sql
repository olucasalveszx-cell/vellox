-- ── Endereço da empresa ──────────────────────────────────────────
-- Adiciona endereço manual + coordenadas geocodificadas na tabela empresas
-- Substitui o GPS do navegador que dava localização errada

alter table public.empresas
  add column if not exists endereco text,
  add column if not exists lat      double precision,
  add column if not exists lng      double precision;
