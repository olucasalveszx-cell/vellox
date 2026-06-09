-- schema_v34: logs_auditoria + mensagens (chat empresa <-> motoboy)

-- ── Logs de auditoria ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.logs_auditoria (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  uuid        NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  acao        text        NOT NULL,
  descricao   text        NOT NULL,
  meta        jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS logs_auditoria_empresa_id_created_at
  ON public.logs_auditoria (empresa_id, created_at DESC);

ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_seleciona_logs" ON public.logs_auditoria
  FOR SELECT USING (empresa_id = auth.uid());

CREATE POLICY "empresa_insere_logs" ON public.logs_auditoria
  FOR INSERT WITH CHECK (empresa_id = auth.uid());

-- ── Chat empresa <-> motoboy ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mensagens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  uuid        NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  motoboy_id  uuid        NOT NULL REFERENCES public.motoboys(id) ON DELETE CASCADE,
  remetente   text        NOT NULL CHECK (remetente IN ('empresa', 'motoboy')),
  texto       text        NOT NULL,
  lido        boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mensagens_empresa_motoboy
  ON public.mensagens (empresa_id, motoboy_id, created_at ASC);

ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_acessa_mensagens" ON public.mensagens
  FOR ALL USING (empresa_id = auth.uid());

CREATE POLICY "motoboy_acessa_mensagens" ON public.mensagens
  FOR ALL USING (
    motoboy_id IN (SELECT id FROM public.motoboys WHERE auth_id = auth.uid())
  );

-- Habilita realtime nas duas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.logs_auditoria;
