import { createClient } from "@/lib/supabase/server";
import MotoboysClient from "./MotoboysClient";
import DbError from "@/components/DbError";
import type { Motoboy } from "@/types";

export default async function MotoboysPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [motoboysRes, empresaRes] = await Promise.all([
    supabase
      .from("motoboys")
      .select("*")
      .eq("empresa_id", user!.id)
      .order("posicao_fila", { ascending: true }),
    supabase
      .from("empresas")
      .select("plano, assinatura_ativa")
      .eq("id", user!.id)
      .single(),
  ]);

  if (motoboysRes.error) return <DbError message="Erro ao carregar motoboys. Tente novamente." />;

  return (
    <MotoboysClient
      motoboys={(motoboysRes.data ?? []) as Motoboy[]}
      empresaId={user!.id}
      plano={empresaRes.data?.plano ?? "basic"}
      assinaturaAtiva={empresaRes.data?.assinatura_ativa ?? false}
    />
  );
}
