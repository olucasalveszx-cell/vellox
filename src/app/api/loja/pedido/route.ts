import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// In-memory rate limit: máx 5 pedidos por IP a cada 5 minutos
const ipHits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS  = 5 * 60 * 1000;
const MAX_HITS   = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_HITS) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
    }

    const body = await req.json();

    const {
      empresa_id, cliente_nome, cliente_telefone,
      endereco_entrega, bairro, tipo_pedido, descricao_itens,
      observacoes, valor_pedido, valor_motoboy, forma_pagamento,
      troco_para, status, endereco_lat, endereco_lng,
    } = body;

    if (!empresa_id || !cliente_nome || !cliente_telefone) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }
    if (status !== "em_fila") {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verifica se a empresa existe
    const { data: empresa, error: empErr } = await supabase
      .from("empresas")
      .select("id")
      .eq("id", empresa_id)
      .single();

    if (empErr || !empresa) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    // Gera token único de rastreamento (24 chars hex)
    const tokenBytes = new Uint8Array(12);
    crypto.getRandomValues(tokenBytes);
    const tracking_token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, "0")).join("");

    // Insere o pedido
    const { data, error } = await supabase
      .from("pedidos")
      .insert({
        empresa_id,
        cliente_nome:     cliente_nome.trim(),
        cliente_telefone: cliente_telefone.trim(),
        endereco_entrega: endereco_entrega?.trim() ?? "",
        bairro:           bairro ?? null,
        tipo_pedido:      tipo_pedido ?? "entrega",
        descricao_itens:  descricao_itens ?? null,
        observacoes:      observacoes ?? null,
        valor_pedido:     Number(valor_pedido) || 0,
        valor_motoboy:    Number(valor_motoboy) || 0,
        forma_pagamento:  forma_pagamento ?? null,
        troco_para:       troco_para ?? null,
        endereco_lat:     endereco_lat != null ? Number(endereco_lat) : null,
        endereco_lng:     endereco_lng != null ? Number(endereco_lng) : null,
        origem:           "catalogo",
        tracking_token,
        status:           "em_fila",
        motoboy_id:       null,
        route_id:         null,
      })
      .select("id, tracking_token")
      .single();

    if (error) {
      console.error("Erro ao inserir pedido:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, tracking_token: data.tracking_token }, { status: 201 });
  } catch (err) {
    console.error("Erro inesperado:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
