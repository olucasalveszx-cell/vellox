import { createClient } from "@/lib/supabase/server";
import LojasClient from "./LojasClient";
import UpgradeWall from "@/components/UpgradeWall";
import type { Loja, Plano } from "@/types";

export const dynamic = "force-dynamic";

export interface LojaComStats extends Loja {
  pedidos_hoje: number;
  faturamento_hoje: number;
  entregues_hoje: number;
}

export interface GlobalStats {
  total: number;
  ativas: number;
  motoboys_total: number;
  motoboys_disponiveis: number;
  pedidos_hoje: number;
  faturamento_hoje: number;
}

export default async function LojasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: empresaData } = await supabase
    .from("empresas").select("plano").eq("id", user.id).single();
  const plano = (empresaData?.plano ?? "basic") as Plano;

  if (plano !== "enterprise") {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
        <UpgradeWall
          recurso="Multi-loja"
          descricao="Gerencie várias franquias em uma única conta. Pedidos, catálogos e motoboys independentes por loja. Exclusivo do plano Business."
          planoNecessario="enterprise"
          planoAtual={plano}
        />
      </div>
    );
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [lojasRes, pedidosRes, motoboysRes] = await Promise.all([
    supabase.from("lojas").select("*").eq("empresa_id", user.id).order("ordem").order("created_at"),
    supabase.from("pedidos").select("loja_id, valor_pedido, status").eq("empresa_id", user.id).gte("created_at", hoje.toISOString()),
    supabase.from("motoboys").select("id, status").eq("empresa_id", user.id),
  ]);

  const lojas = (lojasRes.data ?? []) as Loja[];
  const pedidosHoje = pedidosRes.data ?? [];
  const motoboys = motoboysRes.data ?? [];

  const lojasComStats: LojaComStats[] = lojas.map(loja => {
    const pp = pedidosHoje.filter(p => p.loja_id === loja.id);
    return {
      ...loja,
      pedidos_hoje: pp.length,
      faturamento_hoje: pp.reduce((s, p) => s + (p.valor_pedido ?? 0), 0),
      entregues_hoje: pp.filter(p => p.status === "entregue").length,
    };
  });

  const globalStats: GlobalStats = {
    total: lojas.length,
    ativas: lojas.filter(l => l.ativo).length,
    motoboys_total: motoboys.length,
    motoboys_disponiveis: motoboys.filter(m => m.status === "disponivel").length,
    pedidos_hoje: pedidosHoje.length,
    faturamento_hoje: pedidosHoje.reduce((s, p) => s + (p.valor_pedido ?? 0), 0),
  };

  return <LojasClient initialLojas={lojasComStats} empresaId={user.id} globalStats={globalStats} />;
}
