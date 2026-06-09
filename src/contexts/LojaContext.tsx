"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Loja } from "@/types";

interface LojaCtx {
  lojas: Loja[];
  lojaAtiva: Loja | null;
  setLojaAtiva: (loja: Loja | null) => void;
  reload: () => Promise<void>;
}

const LojaContext = createContext<LojaCtx>({
  lojas: [],
  lojaAtiva: null,
  setLojaAtiva: () => {},
  reload: async () => {},
});

export function LojaProvider({
  children,
  initialLojas,
  empresaId,
}: {
  children: React.ReactNode;
  initialLojas: Loja[];
  empresaId: string;
}) {
  const [lojas, setLojas] = useState<Loja[]>(initialLojas);
  const [lojaAtiva, setLojaAtivaState] = useState<Loja | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined"
      ? localStorage.getItem(`loja_ativa_${empresaId}`)
      : null;
    if (saved) {
      const found = initialLojas.find((l) => l.id === saved);
      if (found) setLojaAtivaState(found);
    }
  }, [initialLojas, empresaId]);

  function setLojaAtiva(loja: Loja | null) {
    setLojaAtivaState(loja);
    if (loja) localStorage.setItem(`loja_ativa_${empresaId}`, loja.id);
    else localStorage.removeItem(`loja_ativa_${empresaId}`);
  }

  const reload = useCallback(async () => {
    const res = await fetch("/api/lojas");
    if (res.ok) {
      const data: Loja[] = await res.json();
      setLojas(data);
      // sync lojaAtiva com dados atualizados
      setLojaAtivaState((prev) => {
        if (!prev) return null;
        return data.find((l) => l.id === prev.id) ?? null;
      });
    }
  }, []);

  return (
    <LojaContext.Provider value={{ lojas, lojaAtiva, setLojaAtiva, reload }}>
      {children}
    </LojaContext.Provider>
  );
}

export function useLoja() {
  return useContext(LojaContext);
}
