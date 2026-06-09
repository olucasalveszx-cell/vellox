import type { SupabaseClient } from "@supabase/supabase-js";

export type AcaoLog =
  | "pedido_criado"
  | "pedido_excluido"
  | "status_atualizado"
  | "motoboy_cadastrado"
  | "motoboy_removido";

export async function log(
  supabase: SupabaseClient,
  empresaId: string,
  acao: AcaoLog,
  descricao: string,
  meta?: Record<string, unknown>,
) {
  await supabase.from("logs_auditoria").insert({
    empresa_id: empresaId,
    acao,
    descricao,
    meta: meta ?? null,
  });
}
