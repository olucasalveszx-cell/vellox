import { createClient } from "@/lib/supabase/server";
import AuditoriaClient from "./AuditoriaClient";
import DbError from "@/components/DbError";

export const dynamic = "force-dynamic";

export default async function AuditoriaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("logs_auditoria")
    .select("id, acao, descricao, meta, created_at")
    .eq("empresa_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return <DbError message="Erro ao carregar logs de auditoria." />;

  return <AuditoriaClient logs={data ?? []} />;
}
