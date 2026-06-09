"use client";

import { useState } from "react";
import { Copy, CheckCircle } from "lucide-react";

export default function CodigoCopy({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    navigator.clipboard.writeText(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button
      onClick={copiar}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
      style={{
        background: "rgba(251,191,36,0.08)",
        border: "1px solid rgba(251,191,36,0.2)",
        color: copiado ? "#22c55e" : "#fbbf24",
      }}
      title="Copiar código para compartilhar com motoboys"
    >
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>Código</span>
      <span className="font-black tracking-widest text-sm" style={{ fontFamily: "monospace", color: copiado ? "#22c55e" : "#fbbf24" }}>
        {codigo}
      </span>
      {copiado
        ? <CheckCircle size={13} style={{ color: "#22c55e" }} />
        : <Copy size={13} />
      }
    </button>
  );
}
