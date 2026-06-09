-- schema_v13: perfil completo do motoboy + bucket de fotos
alter table public.motoboys
  add column if not exists foto_url        text,
  add column if not exists veiculo_tipo    text default 'moto',
  add column if not exists area_atuacao    text,
  add column if not exists avaliacao_media numeric(3,2) default 5.00;

-- Bucket público para fotos de perfil dos motoboys
insert into storage.buckets (id, name, public)
values ('motoboy-fotos', 'motoboy-fotos', true)
on conflict (id) do nothing;

drop policy if exists "motoboy_foto_insert" on storage.objects;
create policy "motoboy_foto_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'motoboy-fotos');

drop policy if exists "motoboy_foto_update" on storage.objects;
create policy "motoboy_foto_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'motoboy-fotos');

drop policy if exists "motoboy_foto_select" on storage.objects;
create policy "motoboy_foto_select" on storage.objects
  for select to public
  using (bucket_id = 'motoboy-fotos');
