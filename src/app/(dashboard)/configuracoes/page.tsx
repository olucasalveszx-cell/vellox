import { createClient } from "@/lib/supabase/server";
import type { Empresa } from "@/types";
import ConfiguracoesClient from "./ConfiguracoesClient";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: empresa } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", user!.id)
    .single();

  return <ConfiguracoesClient empresa={empresa as Empresa} />;
}
