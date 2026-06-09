-- Adiciona coluna slug na tabela empresas
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS slug TEXT;

-- Função para gerar slug a partir de texto
CREATE OR REPLACE FUNCTION slugify(txt TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE RETURNS NULL ON NULL INPUT AS $$
  SELECT regexp_replace(
    regexp_replace(
      lower(
        translate(
          txt,
          'áàãâäéèêëíìîïóòõôöúùûüçñýÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑÝ',
          'aaaaaeeeeiiiiooooouuuucnyaaaaaeeeeiiiiooooouuuucny'
        )
      ),
      '[^a-z0-9]+', '-', 'g'
    ),
    '^-+|-+$', '', 'g'
  );
$$;

-- Popula slugs para empresas existentes (resolve conflitos com sufixo numérico)
DO $$
DECLARE
  emp RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INT;
BEGIN
  FOR emp IN SELECT id, nome FROM empresas WHERE slug IS NULL OR slug = '' ORDER BY created_at ASC LOOP
    base_slug := slugify(emp.nome);
    final_slug := base_slug;
    counter := 1;
    WHILE EXISTS (SELECT 1 FROM empresas WHERE slug = final_slug AND id != emp.id) LOOP
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    UPDATE empresas SET slug = final_slug WHERE id = emp.id;
  END LOOP;
END;
$$;

-- Índice único para busca eficiente por slug
CREATE UNIQUE INDEX IF NOT EXISTS empresas_slug_unique ON empresas (slug);

-- Trigger: gera slug automaticamente ao criar nova empresa
CREATE OR REPLACE FUNCTION trg_auto_slug_empresa_fn() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := slugify(NEW.nome);
    final_slug := base_slug;
    counter := 1;
    WHILE EXISTS (SELECT 1 FROM empresas WHERE slug = final_slug AND id != NEW.id) LOOP
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_slug_empresa ON empresas;
CREATE TRIGGER trg_auto_slug_empresa
BEFORE INSERT ON empresas
FOR EACH ROW EXECUTE FUNCTION trg_auto_slug_empresa_fn();
