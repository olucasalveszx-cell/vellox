import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

interface ProdutoExtraido {
  nome: string;
  preco: number;
  descricao: string;
  categoria: string;
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
            text: `Analise este cardápio e extraia TODOS os produtos visíveis.
Para cada produto retorne um objeto JSON com:
- nome: string (nome do produto, obrigatório)
- preco: number (preço em reais como número, ex: 29.90 — se não houver preço use 0)
- descricao: string (descrição breve se houver, senão string vazia)
- categoria: string (escolha a mais adequada: "Lanches", "Bebidas", "Combos", "Sobremesas", "Entradas", "Pizzas", "Porções", "Pratos", "Outros")

Responda APENAS com um JSON array válido, sem markdown, sem explicações, sem \`\`\`.
Exemplo: [{"nome":"X-Burguer","preco":25.90,"descricao":"Pão, carne, queijo","categoria":"Lanches"}]`,
          },
        ],
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";

  let produtos: ProdutoExtraido[] = [];
  try {
    const jsonStr = raw.replace(/```json?/g, "").replace(/```/g, "").trim();
    produtos = JSON.parse(jsonStr);
    if (!Array.isArray(produtos)) throw new Error("Não é array");
    produtos = produtos
      .filter(p => p && typeof p.nome === "string" && p.nome.trim())
      .map(p => ({
        nome: String(p.nome).trim(),
        preco: typeof p.preco === "number" ? p.preco : parseFloat(String(p.preco)) || 0,
        descricao: String(p.descricao ?? "").trim(),
        categoria: String(p.categoria ?? "Outros").trim(),
      }));
  } catch {
    return NextResponse.json({ error: "Não foi possível ler o cardápio. Tente uma foto mais nítida." }, { status: 422 });
  }

  if (produtos.length === 0) {
    return NextResponse.json({ error: "Nenhum produto encontrado na imagem." }, { status: 422 });
  }

  return NextResponse.json({ produtos });
}
