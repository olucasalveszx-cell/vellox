-- schema_v44: corrige assinatura_ativa padrão e trigger para novas contas
-- Problema: coluna pode ter DEFAULT true no banco, liberando acesso a contas novas
-- Solução: garante DEFAULT false e trigger explícito

-- 1. Força DEFAULT false na coluna (caso tenha sido alterado para true)
ALTER TABLE public.empresas
  ALTER COLUMN assinatura_ativa SET DEFAULT false;

-- 2. Atualiza handle_new_user para inserir assinatura_ativa = false explicitamente
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
      INSERT INTO public.empresas(id, nome, email, codigo, assinatura_ativa, assinatura_expira_em)
      VALUES (new.id, v_nome, new.email, v_codigo, false, NULL)
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- silencia erros do trigger; API faz upsert depois
    END;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
