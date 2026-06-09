import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Kirvano Webhook Handler
 *
 * Configure no painel Kirvano:
 *   URL: https://appvellox.online/api/kirvano/webhook
 *   Token: o valor de KIRVANO_WEBHOOK_SECRET
 *
 * Variáveis de ambiente necessárias:
 *   KIRVANO_WEBHOOK_SECRET      — token de validação
 *   KIRVANO_BASIC_PRODUCT_ID    — ID do produto Básico no Kirvano
 *   KIRVANO_PRO_PRODUCT_ID      — ID do produto Pro no Kirvano
 *   KIRVANO_BUSINESS_PRODUCT_ID — ID do produto Business no Kirvano
 *
 * Eventos tratados:
 *   PURCHASE_APPROVED / SUBSCRIPTION_ACTIVE / SUBSCRIPTION_RENEWED → ativa + define plano
 *   PURCHASE_REFUNDED / PURCHASE_CHARGEBACK / SUBSCRIPTION_CANCELED / SUBSCRIPTION_EXPIRED → desativa
 */

const ACTIVATE_EVENTS = new Set([
  "PURCHASE_APPROVED",
  "SUBSCRIPTION_ACTIVE",
  "SUBSCRIPTION_RENEWED",
]);

const DEACTIVATE_EVENTS = new Set([
  "PURCHASE_REFUNDED",
  "PURCHASE_CHARGEBACK",
  "PURCHASE_CANCELED",
  "SUBSCRIPTION_CANCELED",
  "SUBSCRIPTION_EXPIRED",
  "SUBSCRIPTION_SUSPENDED",
]);

type Plano = "basic" | "pro" | "enterprise";

function detectarPlano(productId: string | undefined, productName: string | undefined): Plano | null {
  const basicId    = process.env.KIRVANO_BASIC_PRODUCT_ID;
  const proId      = process.env.KIRVANO_PRO_PRODUCT_ID;
  const businessId = process.env.KIRVANO_BUSINESS_PRODUCT_ID;

  // Primeiro tenta pelo ID exato
  if (productId) {
    if (basicId    && productId === basicId)    return "basic";
    if (proId      && productId === proId)      return "pro";
    if (businessId && productId === businessId) return "enterprise";
  }

  // Fallback: pelo nome do produto (case insensitive)
  if (productName) {
    const name = productName.toLowerCase();
    if (name.includes("business") || name.includes("enterprise")) return "enterprise";
    if (name.includes("pro"))                                      return "pro";
    if (name.includes("basic") || name.includes("básico"))         return "basic";
  }

  return null;
}

export async function POST(req: NextRequest) {
  // ── Validar token ──────────────────────────────────────────────
  const webhookSecret = process.env.KIRVANO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[kirvano-webhook] KIRVANO_WEBHOOK_SECRET não configurado");
    return NextResponse.json({ error: "Webhook não configurado" }, { status: 500 });
  }

  const headerToken = req.headers.get("x-kirvano-token");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const bodyToken    = body?.token as string | undefined;
  const receivedToken = headerToken ?? bodyToken ?? "";

  if (receivedToken !== webhookSecret) {
    console.warn("[kirvano-webhook] Token inválido recebido");
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  // ── Extrair dados ──────────────────────────────────────────────
  const event = (body?.event as string ?? "").toUpperCase();
  const data  = (body?.data ?? body) as Record<string, unknown>;

  const buyer    = (data?.buyer ?? data?.customer) as Record<string, unknown> | undefined;
  const email    = (buyer?.email as string | undefined)?.toLowerCase().trim();

  if (!email) {
    console.warn("[kirvano-webhook] E-mail do comprador ausente no payload", body);
    return NextResponse.json({ error: "E-mail não encontrado no payload" }, { status: 400 });
  }

  const subscription   = data?.subscription as Record<string, unknown> | undefined;
  const subscriptionId = (subscription?.id ?? body?.subscription_id) as string | undefined;

  // Produto — Kirvano pode enviar em data.product ou data.items[0].product
  const productRaw  = (data?.product ?? (data?.items as Record<string, unknown>[])?.[0]?.product) as Record<string, unknown> | undefined;
  const productId   = (productRaw?.id   ?? productRaw?.product_id)   as string | undefined;
  const productName = (productRaw?.name ?? productRaw?.product_name) as string | undefined;

  const plano = detectarPlano(productId, productName);

  console.log(`[kirvano-webhook] event=${event} email=${email} productId=${productId} productName=${productName} plano=${plano}`);

  const admin = createAdminClient();

  // ── Ativar ─────────────────────────────────────────────────────
  if (ACTIVATE_EVENTS.has(event)) {
    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + 31);

    const { data: ok, error } = await admin.rpc("ativar_assinatura", {
      p_email:      email,
      p_expira_em:  expiraEm.toISOString(),
      p_kirvano_id: subscriptionId ?? null,
      p_plano:      plano,        // null se não detectado → preserva plano atual ou usa 'basic'
    });

    if (error) {
      console.error("[kirvano-webhook] Erro ao ativar assinatura:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!ok) {
      console.warn(`[kirvano-webhook] Nenhuma empresa encontrada com e-mail: ${email}`);
    }

    return NextResponse.json({ ok: true, action: "activated", email, plano });
  }

  // ── Desativar ──────────────────────────────────────────────────
  if (DEACTIVATE_EVENTS.has(event)) {
    const { error } = await admin.rpc("desativar_assinatura", { p_email: email });

    if (error) {
      console.error("[kirvano-webhook] Erro ao desativar assinatura:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, action: "deactivated", email });
  }

  console.log(`[kirvano-webhook] Evento ignorado: ${event}`);
  return NextResponse.json({ ok: true, action: "ignored", event });
}
