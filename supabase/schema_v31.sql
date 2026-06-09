-- Atualiza ativar_assinatura para receber e gravar o plano
CREATE OR REPLACE FUNCTION public.ativar_assinatura(
  p_email        text,
  p_expira_em    timestamptz,
  p_kirvano_id   text DEFAULT NULL,
  p_plano        text DEFAULT NULL   -- 'basic' | 'pro' | 'enterprise'
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.empresas WHERE lower(email) = lower(p_email) LIMIT 1;
  IF v_id IS NULL THEN RETURN false; END IF;

  UPDATE public.empresas SET
    assinatura_ativa     = true,
    assinatura_expira_em = p_expira_em,
    kirvano_subscriber_id = COALESCE(p_kirvano_id, kirvano_subscriber_id),
    plano                = COALESCE(p_plano, plano, 'basic')
  WHERE id = v_id;

  RETURN true;
END;
$$;
