import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.GOD_EMAIL) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { empresaId, dias } = await req.json() as { empresaId: string; dias: number };
  if (!empresaId || typeof dias !== "number" || dias < 1 || dias > 3650) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const expiraEm = new Date();
  expiraEm.setDate(expiraEm.getDate() + dias);

  const admin = createAdminClient();
  const { error } = await admin
    .from("empresas")
    .update({ assinatura_ativa: true, assinatura_expira_em: expiraEm.toISOString() })
    .eq("id", empresaId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, expira_em: expiraEm.toISOString() });
}
