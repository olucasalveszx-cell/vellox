import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PLANOS_VALIDOS = ["basic", "pro", "enterprise", "ktl"] as const;

function gerarCodigo(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function gerarSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.GOD_EMAIL) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { nome, email, senha, plano, dias } = await req.json() as {
    nome: string; email: string; senha: string;
    plano: string; dias: number;
  };

  if (!nome?.trim() || !email?.trim() || !senha || senha.length < 6) {
    return NextResponse.json({ error: "Dados inválidos (senha mínimo 6 caracteres)" }, { status: 400 });
  }
  if (!PLANOS_VALIDOS.includes(plano as typeof PLANOS_VALIDOS[number])) {
    return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const emailLower = email.trim().toLowerCase();
  const nomeClean = nome.trim();

  // ── 1. Criar usuário no Auth (sem email_confirm para evitar conflitos internos) ──
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: emailLower,
    password: senha,
    user_metadata: { tipo: "empresa", nome: nomeClean },
  });

  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 500 });
  }

  const userId = authData.user.id;

  // ── 2. Confirmar email separadamente (mais estável que email_confirm no createUser) ──
  await admin.auth.admin.updateUserById(userId, { email_confirm: true });

  // ── 3. Aguarda o trigger handle_new_user materializar a linha em empresas ──
  await new Promise((r) => setTimeout(r, 800));

  const expira = new Date();
  expira.setDate(expira.getDate() + Math.max(1, dias ?? 365));

  // ── 4. Garantir que a linha em empresas existe (trigger pode ter falhado pelo slug trigger) ──
  // Gera código único sem depender do DB
  let codigo = gerarCodigo();
  // Verifica unicidade do código
  for (let i = 0; i < 5; i++) {
    const { data: existe } = await admin
      .from("empresas").select("id").eq("codigo", codigo).maybeSingle();
    if (!existe) break;
    codigo = gerarCodigo();
  }

  // Gera slug único
  let slug = gerarSlug(nomeClean);
  const { data: slugExiste } = await admin
    .from("empresas").select("id").eq("slug", slug).maybeSingle();
  if (slugExiste) slug = `${slug}-${codigo.toLowerCase()}`;

  // Upsert: se o trigger já criou a linha, atualiza; se não criou, insere
  const { data: empresa, error: upsertErr } = await admin
    .from("empresas")
    .upsert({
      id: userId,
      nome: nomeClean,
      email: emailLower,
      codigo,
      slug,
      plano,
      assinatura_ativa: true,
      assinatura_expira_em: expira.toISOString(),
      verificado: true,
    }, { onConflict: "id" })
    .select("id, nome, email, codigo, plano, assinatura_expira_em")
    .single();

  if (upsertErr) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, empresa });
}
