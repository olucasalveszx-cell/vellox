import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const tel = req.nextUrl.searchParams.get("tel")?.replace(/\D/g, "");
  if (!tel || tel.length < 8) {
    return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Divide os últimos 8 dígitos em 2 partes para funcionar com
  // telefones formatados "(11) 99999-9999" (o hífen quebra busca direta)
  const digits8 = tel.slice(-8);
  const part1 = digits8.slice(0, 4);
  const part2 = digits8.slice(4);

  const { data, error } = await supabase
    .from("pedidos")
    .select(`
      id, tracking_token, status, created_at,
      valor_pedido, valor_motoboy, tipo_pedido,
      empresa:empresas(nome)
    `)
    .ilike("cliente_telefone", `%${part1}%${part2}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[meus-pedidos]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pedidos: data ?? [] }, {
    headers: { "Cache-Control": "no-store" },
  });
}
