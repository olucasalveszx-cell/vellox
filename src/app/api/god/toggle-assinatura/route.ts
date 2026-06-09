import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  // Verificar que o chamador é o god
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.GOD_EMAIL) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { empresaId, ativo } = await req.json() as { empresaId: string; ativo: boolean };
  if (!empresaId || typeof ativo !== "boolean") {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("god_toggle_assinatura", {
    p_empresa_id: empresaId,
    p_ativo: ativo,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
