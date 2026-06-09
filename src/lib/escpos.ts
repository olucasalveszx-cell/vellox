import type { Pedido } from "@/types";

const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

const INIT      = [ESC, 0x40];
const CENTER    = [ESC, 0x61, 0x01];
const LEFT      = [ESC, 0x61, 0x00];
const BOLD_ON   = [ESC, 0x45, 0x01];
const BOLD_OFF  = [ESC, 0x45, 0x00];
const BIG       = [ESC, 0x21, 0x30]; // double width + height
const NORMAL    = [ESC, 0x21, 0x00];
const CUT       = [GS,  0x56, 0x41, 0x03];

const W = 32; // columns for 58mm / 48 for 80mm

function txt(s: string): number[] {
  const bytes: number[] = [];
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0x3F;
    // Latin-1 range (covers pt-BR accented chars)
    bytes.push(code < 256 ? code : 0x3F);
  }
  return bytes;
}

function ln(s = ""): number[] { return [...txt(s), LF]; }

function sep(): number[] { return ln("-".repeat(W)); }

function row(label: string, value: string): number[] {
  const pad = W - value.length;
  return ln(label.padEnd(pad < 1 ? 1 : pad).slice(0, pad < 1 ? 1 : pad) + value);
}

const PGTO_LABELS: Record<string, string> = {
  dinheiro:      "Dinheiro",
  cartao_credito:"Cartao Credito",
  cartao_debito: "Cartao Debito",
  pix:           "PIX",
  ja_pago:       "Ja pago",
};

export function buildReceipt(pedido: Pedido, empresaNome = "PEDIDO"): Uint8Array {
  const data  = new Date(pedido.created_at).toLocaleString("pt-BR");
  const total = pedido.valor_pedido + pedido.valor_motoboy;
  const pgto  = pedido.forma_pagamento
    ? (PGTO_LABELS[pedido.forma_pagamento] ?? pedido.forma_pagamento)
    : "---";

  const buf: number[] = [
    ...INIT,
    ...CENTER, ...BIG, ...BOLD_ON,
    ...ln(empresaNome.toUpperCase().slice(0, 16)),
    ...NORMAL, ...BOLD_OFF,
    ...ln(data),
    ...sep(),
    ...LEFT, ...BOLD_ON,
    ...ln("PEDIDO #" + pedido.id.slice(0, 8).toUpperCase()),
    ...BOLD_OFF,
    ...sep(),
    ...ln("CLIENTE: " + pedido.cliente_nome),
    ...(pedido.cliente_telefone ? ln("TEL: " + pedido.cliente_telefone) : []),
    ...sep(),
    ...BOLD_ON,
    ...ln(pedido.tipo_pedido === "entrega" ? "** DELIVERY **" : "** RETIRADA **"),
    ...BOLD_OFF,
    ...(pedido.tipo_pedido === "entrega"
      ? [...ln("END: " + pedido.endereco_entrega), ...(pedido.bairro ? ln("BAI: " + pedido.bairro) : [])]
      : []),
    ...sep(),
    ...BOLD_ON, ...ln("ITENS:"), ...BOLD_OFF,
    ...ln(pedido.descricao_itens ?? "---"),
    ...(pedido.observacoes ? [...ln("OBS: " + pedido.observacoes)] : []),
    ...sep(),
    ...row("Subtotal:", "R$ " + pedido.valor_pedido.toFixed(2).replace(".", ",")),
    ...(pedido.valor_motoboy > 0
      ? row("Entrega:", "R$ " + pedido.valor_motoboy.toFixed(2).replace(".", ","))
      : []),
    ...BOLD_ON,
    ...row("TOTAL:", "R$ " + total.toFixed(2).replace(".", ",")),
    ...BOLD_OFF,
    ...sep(),
    ...BOLD_ON, ...ln("PGTO: " + pgto), ...BOLD_OFF,
    ...(pedido.troco_para
      ? ln("Troco p/ R$ " + pedido.troco_para.toFixed(2).replace(".", ","))
      : []),
    ...sep(),
    ...CENTER,
    ...ln("Vellox - appvellox.online"),
    LF, LF,
    ...CUT,
  ];

  return new Uint8Array(buf);
}
