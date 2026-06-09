import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function authorize() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.GOD_EMAIL) return null;
  return user;
}

// GET /api/god/motoboys?empresaId=xxx
export async function GET(req: NextRequest) {
  if (!await authorize()) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const empresaId = req.nextUrl.searchParams.get("empresaId");
  if (!empresaId) return NextResponse.json({ error: "empresaId obrigatório" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("motoboys")
    .select("id, nome, telefone, status, posicao_fila, codigo")
    .eq("empresa_id", empresaId)
    .order("posicao_fila", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/god/motoboys  { empresaId, nome, telefone }
export async function POST(req: NextRequest) {
  if (!await authorize()) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const { empresaId, nome, telefone } = await req.json();
  if (!empresaId || !nome || !telefone) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existentes } = await admin
    .from("motoboys")
    .select("id")
    .eq("empresa_id", empresaId);

  const { data, error } = await admin
    .from("motoboys")
    .insert({ empresa_id: empresaId, nome, telefone, status: "disponivel", posicao_fila: (existentes?.length ?? 0) + 1 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/god/motoboys  { motoboyId }
export async function DELETE(req: NextRequest) {
  if (!await authorize()) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const { motoboyId } = await req.json();
  if (!motoboyId) return NextResponse.json({ error: "motoboyId obrigatório" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("motoboys").delete().eq("id", motoboyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
