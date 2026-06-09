-- schema_v37: garantir bucket motoboy-fotos e policies de storage

INSERT INTO storage.buckets (id, name, public)
VALUES ('motoboy-fotos', 'motoboy-fotos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "motoboy_foto_insert" ON storage.objects;
DROP POLICY IF EXISTS "motoboy_foto_update" ON storage.objects;
DROP POLICY IF EXISTS "motoboy_foto_select" ON storage.objects;
DROP POLICY IF EXISTS "motoboy_foto_delete" ON storage.objects;

CREATE POLICY "motoboy_foto_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'motoboy-fotos');

CREATE POLICY "motoboy_foto_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'motoboy-fotos');

CREATE POLICY "motoboy_foto_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'motoboy-fotos')
  WITH CHECK (bucket_id = 'motoboy-fotos');

CREATE POLICY "motoboy_foto_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'motoboy-fotos');
