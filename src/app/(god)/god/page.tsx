import { createAdminClient } from "@/lib/supabase/admin";
import GodClient from "./GodClient";

export const dynamic = "force-dynamic";

export default async function GodPage() {
  const admin = createAdminClient();

  const { data: empresas, error } = await admin.rpc("god_list_empresas");

  return <GodClient empresas={empresas ?? []} error={error?.message ?? null} />;
}
