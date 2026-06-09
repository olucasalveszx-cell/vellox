import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.GOD_EMAIL) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { empresaId } = await req.json() as { empresaId: string };
  if (!empresaId) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Deletar o auth user — o CASCADE do banco remove empresa, motoboys e pedidos
  const { error } = await admin.auth.admin.deleteUser(empresaId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
