-- schema_v33: handle_new_user tolerante a falhas (fix "Database error creating new user")
-- O trigger envolve o INSERT em empresas com EXCEPTION para que erros na chain
-- trg_auto_slug_empresa não cancelem a criação do usuário no Auth.
-- A API (god/create-empresa) faz upsert em seguida e garante a linha em empresas.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_tipo   text;
  v_nome   text;
  v_codigo text;
BEGIN
  v_tipo := coalesce(new.raw_user_meta_data->>'tipo', 'empresa');
  v_nome := coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1));

  IF v_tipo = 'empresa' THEN
    LOOP
      v_codigo := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 6));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.empresas WHERE codigo = v_codigo);
    END LOOP;

    BEGIN
      INSERT INTO public.empresas(id, nome, email, codigo)
      VALUES (new.id, v_nome, new.email, v_codigo)
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- silencia erros do trigger; API faz upsert depois
    END;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
