import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PLANOS_VALIDOS = ["basic", "pro", "enterprise", "ktl"] as const;
type Plano = typeof PLANOS_VALIDOS[number];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.GOD_EMAIL) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { empresaId, plano } = await req.json() as { empresaId: string; plano: Plano };
  if (!empresaId || !PLANOS_VALIDOS.includes(plano)) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("empresas")
    .update({ plano })
    .eq("id", empresaId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, plano });
}
