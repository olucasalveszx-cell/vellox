"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { printOrder } from "@/lib/printService";
import type { Pedido } from "@/types";

interface Props {
  empresaId: string;
  empresaNome: string;
  empresaCnpj?: string | null;
}

export default function PrintListener({ empresaId, empresaNome, empresaCnpj }: Props) {
  useEffect(() => {
    const supabase = createClient();

    const ch = supabase
      .channel(`print-listener-${empresaId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "pedidos",
        filter: `empresa_id=eq.${empresaId}`,
      }, (payload) => {
        const pedido = payload.new as Pedido;
        if (pedido.status !== "em_fila") return;
        try {
          if (localStorage.getItem("vellox-autoprint-ativo") !== "1") return;
        } catch { return; }
        // Pequeno delay para garantir que o DOM está pronto
        setTimeout(() => {
          printOrder(pedido, empresaNome, empresaCnpj ?? undefined);
        }, 300);
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [empresaId, empresaNome, empresaCnpj]);

  return null;
}
