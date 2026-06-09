import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

interface SaborExtraido {
  nome: string;
  descricao: string;
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
            text: `Analise este cardápio/lista e extraia TODOS os sabores ou opções visíveis.
Para cada sabor retorne um objeto JSON com:
- nome: string (nome do sabor, obrigatório)
- descricao: string (ingredientes ou descrição breve se houver, senão string vazia)

Responda APENAS com um JSON array válido, sem markdown, sem explicações, sem \`\`\`.
Exemplo: [{"nome":"Mussarela","descricao":"Molho de tomate, mussarela e orégano"},{"nome":"Calabresa","descricao":""}]`,
          },
        ],
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";

  let sabores: SaborExtraido[] = [];
  try {
    const jsonStr = raw.replace(/```json?/g, "").replace(/```/g, "").trim();
    sabores = JSON.parse(jsonStr);
    if (!Array.isArray(sabores)) throw new Error("Não é array");
    sabores = sabores
      .filter(s => s && typeof s.nome === "string" && s.nome.trim())
      .map(s => ({
        nome: String(s.nome).trim(),
        descricao: String(s.descricao ?? "").trim(),
      }));
  } catch {
    return NextResponse.json({ error: "Não foi possível ler os sabores. Tente uma foto mais nítida." }, { status: 422 });
  }

  if (sabores.length === 0) {
    return NextResponse.json({ error: "Nenhum sabor encontrado na imagem." }, { status: 422 });
  }

  return NextResponse.json({ sabores });
}
