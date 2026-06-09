import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

interface AdicionalExtraido {
  nome: string;
  preco: number;
  obrigatorio: boolean;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("imagem") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhuma imagem enviada" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mediaType = (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: `Analise esta imagem e extraia TODOS os itens extras/adicionais visíveis (bordas recheadas, ingredientes extras, complementos, acompanhamentos, etc.).
Para cada item retorne um objeto JSON com:
- nome: string (nome do item, obrigatório)
- preco: number (preço em reais como número, ex: 5.00 — se não houver preço use 0)
- obrigatorio: boolean (true se for obrigatório, senão false)

Responda APENAS com um JSON array válido, sem markdown, sem explicações, sem \`\`\`.
Exemplo: [{"nome":"Borda de Catupiry","preco":8.00,"obrigatorio":false},{"nome":"Bacon extra","preco":4.50,"obrigatorio":false}]`,
          },
        ],
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";

  let adicionais: AdicionalExtraido[] = [];
  try {
    const jsonStr = raw.replace(/```json?/g, "").replace(/```/g, "").trim();
    adicionais = JSON.parse(jsonStr);
    if (!Array.isArray(adicionais)) throw new Error("Não é array");
    adicionais = adicionais
      .filter(a => a && typeof a.nome === "string" && a.nome.trim())
      .map(a => ({
        nome: String(a.nome).trim(),
        preco: typeof a.preco === "number" ? a.preco : parseFloat(String(a.preco)) || 0,
        obrigatorio: Boolean(a.obrigatorio),
      }));
  } catch {
    return NextResponse.json({ error: "Não foi possível ler os adicionais. Tente uma foto mais nítida." }, { status: 422 });
  }

  if (adicionais.length === 0) {
    return NextResponse.json({ error: "Nenhum adicional encontrado na imagem." }, { status: 422 });
  }

  return NextResponse.json({ adicionais });
}
