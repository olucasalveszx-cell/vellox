import type { Pedido } from "@/types";
import { buildReceipt } from "@/lib/escpos";
import { printViaUsb, getSavedPrinterName } from "@/lib/usbPrinter";

const PRINTED_KEY = "vellox-printed-orders";
const MAX_TRACKED = 300;

const PRINT_DIV_ID   = "vellox-receipt-print";
const PRINT_STYLE_ID = "vellox-receipt-style";

function getTracked(): Set<string> {
  try {
    const raw = localStorage.getItem(PRINTED_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {}
  return new Set();
}

function trackPrinted(id: string) {
  try {
    const ids = [...getTracked(), id].slice(-MAX_TRACKED);
    localStorage.setItem(PRINTED_KEY, JSON.stringify(ids));
  } catch {}
}

const PGTO_LABELS: Record<string, string> = {
  dinheiro:       "Dinheiro",
  cartao_credito: "Cartão de Crédito",
  cartao_debito:  "Cartão de Débito",
  pix:            "PIX",
  ja_pago:        "Já pago",
};

// Constrói o HTML do cupom (usado também para preview)
export function formatReceipt(pedido: Pedido, empresaNome = "PEDIDO"): string {
  const data  = new Date(pedido.created_at).toLocaleString("pt-BR");
  const total = pedido.valor_pedido + pedido.valor_motoboy;
  const pgto  = pedido.forma_pagamento
    ? (PGTO_LABELS[pedido.forma_pagamento] ?? pedido.forma_pagamento)
    : "—";

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${empresaNome} · #${pedido.id.slice(0, 8).toUpperCase()}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{
  width:100%;
  font-family:"Courier New",Courier,monospace;
  font-size:12px;font-weight:700;line-height:1.5;
  padding:1mm;color:#000;background:#fff;
  -webkit-print-color-adjust:exact;print-color-adjust:exact
}
h1{font-size:15px;font-weight:900;text-align:center;margin-bottom:2px;
   text-transform:uppercase;letter-spacing:.06em}
.sub{text-align:center;font-size:11px;font-weight:700;margin-bottom:4px}
.sep{border:none;border-top:2px solid #000;margin:6px 0}
.row{display:flex;justify-content:space-between;margin:2px 0;font-weight:700}
.lbl{font-weight:900;font-size:11px;text-transform:uppercase;
     letter-spacing:.04em;margin:5px 0 1px}
.v{font-weight:700}
.total{font-size:16px;font-weight:900}
.itens{white-space:pre-wrap;font-size:13px;font-weight:700;line-height:1.6;margin:3px 0}
.footer{text-align:center;font-size:10px;font-weight:700;margin-top:8px}
@media print{@page{margin:2mm}html,body{width:100%;padding:0}}
</style></head><body>
<h1>${empresaNome}</h1>
<div class="sub">${data}</div>
<hr class="sep">
<div class="lbl">Nº do pedido</div>
<div style="font-weight:900;font-size:14px">#${pedido.id.slice(0, 8).toUpperCase()}</div>
<hr class="sep">
<div class="lbl">Cliente</div>
<div class="v">${pedido.cliente_nome}</div>
${pedido.cliente_telefone ? `<div class="v">${pedido.cliente_telefone}</div>` : ""}
<hr class="sep">
<div class="lbl">Tipo</div>
<div style="font-weight:900">${pedido.tipo_pedido === "entrega" ? "★ DELIVERY" : "★ RETIRADA"}</div>
${pedido.tipo_pedido === "entrega"
  ? `<div class="lbl" style="margin-top:4px">Endereço</div><div class="v">${pedido.endereco_entrega}${pedido.bairro ? ` — ${pedido.bairro}` : ""}</div>`
  : ""}
<hr class="sep">
<div class="lbl">Itens</div>
<div class="itens">${(pedido.descricao_itens ?? "—").replace(/\n/g, "<br>")}</div>
${pedido.observacoes
  ? `<hr class="sep"><div class="lbl">Observações</div><div class="v">${pedido.observacoes}</div>`
  : ""}
<hr class="sep">
<div class="row"><span>Subtotal</span><span>R$ ${pedido.valor_pedido.toFixed(2).replace(".", ",")}</span></div>
${pedido.valor_motoboy > 0
  ? `<div class="row"><span>Entrega</span><span>R$ ${pedido.valor_motoboy.toFixed(2).replace(".", ",")}</span></div>`
  : ""}
<div class="row" style="margin-top:3px"><span class="total">TOTAL</span><span class="total">R$ ${total.toFixed(2).replace(".", ",")}</span></div>
<hr class="sep">
<div class="lbl">Pagamento</div>
<div style="font-weight:900">${pgto}${pedido.troco_para ? ` · Troco p/ R$ ${pedido.troco_para.toFixed(2).replace(".", ",")}` : ""}</div>
<hr class="sep">
<div class="footer">Vellox · appvellox.online</div>
</body></html>`;
}

export function printOrder(pedido: Pedido, empresaNome?: string, empresaCnpj?: string): boolean {
  const dataObj  = new Date(pedido.created_at);
  const hora     = dataObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const data     = dataObj.toLocaleDateString("pt-BR");
  const total    = pedido.valor_pedido + pedido.valor_motoboy;
  const pgto     = pedido.forma_pagamento
    ? (PGTO_LABELS[pedido.forma_pagamento] ?? pedido.forma_pagamento)
    : "—";
  const empresa  = (empresaNome ?? "PEDIDO").toUpperCase();
  const now      = new Date();
  const printedAt = `${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

  const SEP = `<div style="border-top:1px dashed #000;margin:5px 0"></div>`;

  function row(left: string, right: string, bold = false): string {
    return `<div style="display:flex;justify-content:space-between;align-items:baseline;${bold ? "font-weight:900;font-size:13px;" : ""}">
      <span>${left}</span><span style="white-space:nowrap">${right}</span>
    </div>`;
  }

  const itensLinhas = (pedido.descricao_itens ?? "—").split("\n");
  const itensHtml = itensLinhas
    .map(l => `<div style="font-size:11px;line-height:1.5">${l || "&nbsp;"}</div>`)
    .join("");

  const receiptHtml = `
    <div style="font-family:'Courier New',Courier,monospace;font-size:12px;width:100%;color:#000;background:#fff;padding:3mm 2mm">

      <div style="text-align:center;font-weight:900;font-size:15px;text-transform:uppercase;line-height:1.3">${empresa}</div>
      ${empresaCnpj ? `<div style="text-align:center;font-size:10px;margin-top:2px">${empresaCnpj}</div>` : ""}

      ${SEP}

      <div style="text-align:center;font-weight:900;font-size:14px">PEDIDO #${pedido.id.slice(0, 8).toUpperCase()}</div>

      ${SEP}

      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:900;font-size:13px">${pedido.cliente_nome}</span>
        <span style="font-size:10px">${hora} ${data}</span>
      </div>

      ${SEP}

      <div style="text-align:center;font-weight:900;font-size:15px;margin:4px 0">
        ${pedido.tipo_pedido === "entrega" ? "ENTREGA" : "RETIRADA"}
      </div>

      ${SEP}

      <div style="font-size:10px;font-weight:700;margin-bottom:1px">CLIENTE/CELULAR</div>
      <div style="font-weight:700">${pedido.cliente_nome} - ${pedido.cliente_telefone}</div>

      ${pedido.tipo_pedido === "entrega" ? `
        <div style="font-size:10px;font-weight:700;margin-top:4px;margin-bottom:1px">ENDEREÇO DE ENTREGA:</div>
        <div>${pedido.endereco_entrega}${pedido.bairro ? `, ${pedido.bairro}` : ""}</div>
      ` : ""}

      ${pedido.observacoes ? `
        <div style="font-size:10px;font-weight:700;margin-top:4px;margin-bottom:1px">OBSERVAÇÕES:</div>
        <div>${pedido.observacoes}</div>
      ` : ""}

      ${SEP}

      ${itensHtml}

      ${SEP}

      ${row("SUBTOTAL", "R$ " + pedido.valor_pedido.toFixed(2).replace(".", ","))}
      ${pedido.valor_motoboy > 0 ? row("TAXA DE ENTREGA", "R$ " + pedido.valor_motoboy.toFixed(2).replace(".", ",")) : ""}
      <div style="margin-top:3px">${row("TOTAL DO PEDIDO", "R$ " + total.toFixed(2).replace(".", ","), true)}</div>

      ${SEP}

      <div style="font-size:10px;font-weight:700;margin-bottom:2px">TIPO DE PAGAMENTO</div>
      <div style="display:flex;justify-content:space-between">
        <span>${pgto}${pedido.troco_para ? ` - Troco p/ R$ ${pedido.troco_para.toFixed(2).replace(".", ",")}` : ""}</span>
        <span>R$ ${total.toFixed(2).replace(".", ",")}</span>
      </div>

      ${SEP}

      <div style="font-size:10px">IMPRESSO EM ${printedAt}</div>
      <div style="text-align:center;font-weight:900;font-size:12px;margin-top:6px">appvellox.online</div>

    </div>
  `;

  try {
    // Remove instâncias anteriores
    document.getElementById(PRINT_DIV_ID)?.remove();
    document.getElementById(PRINT_STYLE_ID)?.remove();

    // CSS: esconde cupom na tela, mostra só na impressão
    const style = document.createElement("style");
    style.id = PRINT_STYLE_ID;
    style.textContent = `
      #${PRINT_DIV_ID}{display:none}
      @media print{
        @page{margin:0;size:58mm auto}
        html,body{background:#fff!important;color:#000!important}
        body>*{display:none!important}
        #${PRINT_DIV_ID}{
          display:block!important;
          background:#fff!important;
          color:#000!important;
          -webkit-print-color-adjust:exact!important;
          print-color-adjust:exact!important;
        }
        #${PRINT_DIV_ID} *{
          color:#000!important;
          background:#fff!important;
          -webkit-print-color-adjust:exact!important;
          print-color-adjust:exact!important;
        }
      }
    `;
    document.head.appendChild(style);

    // Injeta o cupom ANTES de print() — garante que Chrome tem o layout calculado
    const div = document.createElement("div");
    div.id = PRINT_DIV_ID;
    div.innerHTML = receiptHtml;
    document.body.appendChild(div);

    // Limpa após fechar o diálogo
    window.addEventListener("afterprint", () => {
      document.getElementById(PRINT_DIV_ID)?.remove();
      document.getElementById(PRINT_STYLE_ID)?.remove();
    }, { once: true });

    // Dois frames para garantir que o DOM foi pintado antes de print()
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    return true;
  } catch {
    return false;
  }
}

export async function autoPrint(
  pedido: Pedido,
  empresaNome?: string,
): Promise<{ ok: boolean; method: "usb" | "dialog" | "skip" | "error" }> {
  const tracked = getTracked();
  if (tracked.has(pedido.id)) return { ok: false, method: "skip" };

  // Tenta USB primeiro (100% silencioso, sem diálogo)
  if (getSavedPrinterName()) {
    try {
      const bytes = buildReceipt(pedido, empresaNome);
      await printViaUsb(bytes);
      trackPrinted(pedido.id);
      return { ok: true, method: "usb" };
    } catch (e) {
      // "Access denied" = Windows bloqueou o driver USB.
      // Remove a config salva para não tentar USB de novo.
      const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
      const isAccessDenied = msg.includes("access denied") || msg.includes("access_denied") ||
        (e instanceof DOMException && (e.name === "SecurityError" || e.name === "NotAllowedError"));
      if (isAccessDenied) {
        const { removeSavedPrinter } = await import("@/lib/usbPrinter");
        removeSavedPrinter();
      }
      // Cai no window.print() independente do erro
    }
  }

  // Fallback: window.print() via div injetado na página
  // Com Chrome --kiosk-printing: imprime silenciosamente
  // Sem --kiosk-printing: abre diálogo de impressão
  try {
    const ok = printOrder(pedido, empresaNome);
    if (ok) trackPrinted(pedido.id);
    return { ok, method: ok ? "dialog" : "error" };
  } catch {
    return { ok: false, method: "error" };
  }
}
