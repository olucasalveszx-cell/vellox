"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Users, ShoppingBag, CheckCircle2,
  XCircle, LogOut, RefreshCw, Shield, Crown,
  TrendingUp, Search, Trash2, Clock, Check, ChevronDown,
  ChevronUp, Plus, Loader2, Bike, Phone,
  WifiOff, Wifi, Eye, EyeOff, Copy, KeyRound,
} from "lucide-react";

type Plano = "basic" | "pro" | "enterprise" | "ktl";

const PLANO_CFG: Record<Plano, { label: string; color: string; bg: string; border: string }> = {
  basic:      { label: "Basic",      color: "#9ca3af", bg: "rgba(156,163,175,0.12)", border: "rgba(156,163,175,0.25)" },
  pro:        { label: "Pro",        color: "#818cf8", bg: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.3)"  },
  enterprise: { label: "Enterprise", color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.35)" },
  ktl:        { label: "KTL",        color: "#22d3ee", bg: "rgba(34,211,238,0.12)",  border: "rgba(34,211,238,0.3)"  },
};

interface MotoboySummary {
  id: string;
  nome: string;
  telefone: string;
  status: string;
  posicao_fila: number | null;
  codigo: string | null;
}

interface MotoboyGod {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  status: string;
  codigo: string | null;
  posicao_fila: number | null;
  empresa_id: string;
  empresa_nome: string;
  empresa_plano: Plano;
  total_entregas: number;
  entregas_hoje: number;
  ganho_total: number;
  ganho_hoje: number;
  created_at: string;
}

interface EmpresaRow {
  id: string;
  nome: string;
  email: string;
  cnpj: string | null;
  codigo: string;
  ativo: boolean;
  assinatura_ativa: boolean;
  assinatura_expira_em: string | null;
  kirvano_subscriber_id: string | null;
  created_at: string;
  total_pedidos: number;
  total_motoboys: number;
  plano: Plano;
}

interface Props {
  empresas: EmpresaRow[];
  error: string | null;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function StatusBadge({ ativa }: { ativa: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        background: ativa ? "rgba(34,197,94,0.12)" : "rgba(255,106,0,0.12)",
        color: ativa ? "#4ade80" : "#FF8C1A",
        border: `1px solid ${ativa ? "rgba(34,197,94,0.25)" : "rgba(255,106,0,0.25)"}`,
      }}>
      {ativa ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {ativa ? "Ativa" : "Inativa"}
    </span>
  );
}

function PlanoBadge({ plano, onClick }: { plano: Plano; onClick?: () => void }) {
  const cfg = PLANO_CFG[plano] ?? PLANO_CFG.basic;
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, cursor: onClick ? "pointer" : "default" }}>
      {cfg.label}
      {onClick && <ChevronDown size={9} />}
    </button>
  );
}

export default function GodClient({ empresas, error }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"empresas" | "motoboys">("empresas");
  const [search, setSearch] = useState("");

  // Aba motoboys global
  const [allMotoboys,    setAllMotoboys]    = useState<MotoboyGod[]>([]);
  const [loadingAllMb,   setLoadingAllMb]   = useState(false);
  const [mbSearch,       setMbSearch]       = useState("");
  const [mbStatusFilter, setMbStatusFilter] = useState<"todos" | "disponivel" | "em_entrega" | "offline">("todos");

  useEffect(() => {
    if (view !== "motoboys") return;
    setLoadingAllMb(true);
    fetch("/api/god/all-motoboys")
      .then(r => r.json())
      .then(d => setAllMotoboys(Array.isArray(d) ? d : []))
      .finally(() => setLoadingAllMb(false));
  }, [view]);

  // Assinatura
  const [toggling,   setToggling]   = useState<string | null>(null);
  const [diasTarget, setDiasTarget] = useState<string | null>(null);
  const [diasInput,  setDiasInput]  = useState("30");
  const [savingDias, setSavingDias] = useState(false);

  // Plano
  const [planoTarget, setPlanoTarget] = useState<string | null>(null);
  const [savingPlano, setSavingPlano] = useState(false);

  // Delete empresa
  const [deleting, setDeleting] = useState<string | null>(null);

  // Criar empresa
  const [showCreate,    setShowCreate]    = useState(false);
  const [createForm,    setCreateForm]    = useState({ nome: "", email: "", senha: "", plano: "pro" as Plano, dias: 365 });
  const [creatingEmp,   setCreatingEmp]   = useState(false);
  const [createResult,  setCreateResult]  = useState<{ nome: string; email: string; codigo: string; plano: Plano } | null>(null);
  const [showSenha,     setShowSenha]     = useState(false);
  const [copiado,       setCopiado]       = useState(false);

  function fecharCreate() {
    setShowCreate(false);
    setCreateResult(null);
    setCreateForm({ nome: "", email: "", senha: "", plano: "pro", dias: 365 });
    setShowSenha(false);
  }

  async function handleCreateEmpresa(e: React.FormEvent) {
    e.preventDefault();
    setCreatingEmp(true);
    try {
      const res = await fetch("/api/god/create-empresa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar empresa");
      setCreateResult(data.empresa);
      startTransition(() => router.refresh());
    } catch (err) { alert("Erro: " + (err as Error).message); }
    finally { setCreatingEmp(false); }
  }

  function copiarCodigo(codigo: string) {
    navigator.clipboard.writeText(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  // Motoboys por empresa
  const [expandedMb,    setExpandedMb]    = useState<string | null>(null);
  const [mbData,        setMbData]        = useState<Record<string, MotoboySummary[]>>({});
  const [loadingMb,     setLoadingMb]     = useState(false);
  const [removingMb,    setRemovingMb]    = useState<string | null>(null);
  const [addMbTarget,   setAddMbTarget]   = useState<string | null>(null);
  const [addMbNome,     setAddMbNome]     = useState("");
  const [addMbTel,      setAddMbTel]      = useState("");
  const [savingMb,      setSavingMb]      = useState(false);

  const ativas = empresas.filter((e) => e.assinatura_ativa).length;
  const totalPedidos = empresas.reduce((s, e) => s + Number(e.total_pedidos), 0);
  const totalMotoboys = empresas.reduce((s, e) => s + Number(e.total_motoboys), 0);

  const filtered = empresas.filter(
    (e) =>
      e.nome.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.cnpj ?? "").includes(search)
  );

  async function handleLogout() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function toggleAssinatura(empresa: EmpresaRow) {
    setToggling(empresa.id);
    try {
      const res = await fetch("/api/god/toggle-assinatura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId: empresa.id, ativo: !empresa.assinatura_ativa }),
      });
      if (!res.ok) throw new Error(await res.text());
      startTransition(() => router.refresh());
    } catch (err) { alert("Erro: " + (err as Error).message); }
    finally { setToggling(null); }
  }

  async function handleSetDias(empresa: EmpresaRow) {
    const dias = parseInt(diasInput, 10);
    if (!dias || dias < 1) return;
    setSavingDias(true);
    try {
      const res = await fetch("/api/god/set-dias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId: empresa.id, dias }),
      });
      if (!res.ok) throw new Error(await res.text());
      setDiasTarget(null);
      startTransition(() => router.refresh());
    } catch (err) { alert("Erro: " + (err as Error).message); }
    finally { setSavingDias(false); }
  }

  async function handleSetPlano(empresaId: string, plano: Plano) {
    setSavingPlano(true);
    try {
      const res = await fetch("/api/god/set-plano", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId, plano }),
      });
      if (!res.ok) throw new Error(await res.text());
      setPlanoTarget(null);
      startTransition(() => router.refresh());
    } catch (err) { alert("Erro: " + (err as Error).message); }
    finally { setSavingPlano(false); }
  }

  async function deleteEmpresa(empresa: EmpresaRow) {
    if (!window.confirm(`Excluir "${empresa.nome}"?\n\nIsso remove a conta, todos os pedidos e motoboys. Ação irreversível.`)) return;
    setDeleting(empresa.id);
    try {
      const res = await fetch("/api/god/delete-empresa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId: empresa.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      startTransition(() => router.refresh());
    } catch (err) { alert("Erro: " + (err as Error).message); }
    finally { setDeleting(null); }
  }

  async function toggleMotoboys(empresaId: string) {
    if (expandedMb === empresaId) { setExpandedMb(null); return; }
    setLoadingMb(true);
    setExpandedMb(empresaId);
    try {
      const res = await fetch(`/api/god/motoboys?empresaId=${empresaId}`);
      const data = await res.json();
      setMbData(prev => ({ ...prev, [empresaId]: data }));
    } catch { /* silent */ }
    finally { setLoadingMb(false); }
  }

  async function removeMotoboy(empresaId: string, motoboyId: string) {
    if (!window.confirm("Remover este motoboy?")) return;
    setRemovingMb(motoboyId);
    try {
      const res = await fetch("/api/god/motoboys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motoboyId }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMbData(prev => ({ ...prev, [empresaId]: prev[empresaId].filter(m => m.id !== motoboyId) }));
    } catch (err) { alert("Erro: " + (err as Error).message); }
    finally { setRemovingMb(null); }
  }

  async function addMotoboy(empresaId: string) {
    if (!addMbNome.trim() || !addMbTel.trim()) return;
    setSavingMb(true);
    try {
      const res = await fetch("/api/god/motoboys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId, nome: addMbNome.trim(), telefone: addMbTel.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      const novo = await res.json();
      setMbData(prev => ({ ...prev, [empresaId]: [...(prev[empresaId] ?? []), novo] }));
      setAddMbNome(""); setAddMbTel(""); setAddMbTarget(null);
    } catch (err) { alert("Erro: " + (err as Error).message); }
    finally { setSavingMb(false); }
  }

  const STATUS_MB_COLOR: Record<string, string> = {
    disponivel: "#22c55e", em_entrega: "#fbbf24", offline: "#64748b",
  };

  return (
    <div data-god className="min-h-screen" style={{ background: "#070707", color: "#e5e7eb" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-8 py-4 md:py-5"
        style={{ borderBottom: "1px solid #1a1a1a", background: "#0a0a0a" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.25),rgba(251,191,36,0.06))", border: "1px solid rgba(251,191,36,0.3)", boxShadow: "0 0 20px rgba(251,191,36,0.15)" }}>
            <Crown size={18} style={{ color: "#fbbf24" }} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white" style={{ letterSpacing: "-0.03em" }}>Painel God</h1>
            <p className="text-xs" style={{ color: "#4b5563" }}>Vellox — Controle Total</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => startTransition(() => router.refresh())} disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ border: "1px solid #1f2937", color: "#6b7280", background: "transparent" }}>
            <RefreshCw size={13} className={isPending ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ border: "1px solid rgba(255,106,0,0.2)", color: "#FF8C1A", background: "rgba(255,106,0,0.06)" }}>
            <LogOut size={13} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 md:py-8 max-w-7xl mx-auto">

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
          style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }}>
          {([
            { key: "empresas",  label: "Empresas",  icon: Building2 },
            { key: "motoboys",  label: "Motoboys",  icon: Bike },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setView(key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={view === key
                ? { background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }
                : { background: "transparent", color: "#4b5563", border: "1px solid transparent" }}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* ── ABA MOTOBOYS ────────────────────────────────────────── */}
        {view === "motoboys" && (() => {
          const mbFiltered = allMotoboys.filter(m => {
            if (mbStatusFilter !== "todos" && m.status !== mbStatusFilter) return false;
            const q = mbSearch.toLowerCase();
            return !q || m.nome.toLowerCase().includes(q) || m.empresa_nome.toLowerCase().includes(q) || (m.telefone ?? "").includes(q) || (m.codigo ?? "").toLowerCase().includes(q);
          });
          const totDisp  = allMotoboys.filter(m => m.status === "disponivel").length;
          const totRota  = allMotoboys.filter(m => m.status === "em_entrega").length;
          const totOff   = allMotoboys.filter(m => m.status === "offline").length;
          const ganhoHoje = allMotoboys.reduce((s, m) => s + Number(m.ganho_hoje), 0);

          return (
            <>
              {/* Mini stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                  { label: "Total",        value: allMotoboys.length, color: "#e5e7eb" },
                  { label: "Disponíveis",  value: totDisp,            color: "#22c55e" },
                  { label: "Em entrega",   value: totRota,            color: "#fbbf24" },
                  { label: "Ganho hoje",   value: `R$ ${ganhoHoje.toFixed(2)}`, color: "#818cf8" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl p-4"
                    style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }}>
                    <p className="text-xs mb-1" style={{ color: "#4b5563" }}>{label}</p>
                    <p className="text-xl font-black" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Busca + filtro status */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="relative flex-1 min-w-48">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#4b5563" }} />
                  <input type="text" placeholder="Nome, empresa, telefone, código..."
                    value={mbSearch} onChange={e => setMbSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl text-sm text-white placeholder-gray-700 outline-none"
                    style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }} />
                </div>
                <div className="flex gap-1">
                  {(["todos", "disponivel", "em_entrega", "offline"] as const).map(s => (
                    <button key={s} onClick={() => setMbStatusFilter(s)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={mbStatusFilter === s
                        ? { background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }
                        : { background: "#0f0f0f", color: "#4b5563", border: "1px solid #1a1a1a" }}>
                      {s === "todos" ? "Todos" : s === "disponivel" ? "Disponível" : s === "em_entrega" ? "Em entrega" : "Offline"}
                    </button>
                  ))}
                </div>
              </div>

              {loadingAllMb ? (
                <div className="flex items-center gap-2 py-12 justify-center text-sm" style={{ color: "#4b5563" }}>
                  <Loader2 size={16} className="animate-spin" /> Carregando motoboys...
                </div>
              ) : mbFiltered.length === 0 ? (
                <div className="text-center py-12 text-sm" style={{ color: "#4b5563" }}>Nenhum motoboy encontrado.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {mbFiltered.map(mb => {
                    const statusColor = mb.status === "disponivel" ? "#22c55e" : mb.status === "em_entrega" ? "#fbbf24" : "#64748b";
                    const statusLabel = mb.status === "disponivel" ? "Disponível" : mb.status === "em_entrega" ? "Em entrega" : "Offline";
                    const planoCfg = PLANO_CFG[mb.empresa_plano ?? "basic"];
                    return (
                      <div key={mb.id} className="rounded-2xl p-4 space-y-3"
                        style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }}>
                        {/* Header */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                            style={{ background: `${statusColor}18`, color: statusColor }}>
                            {mb.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-white truncate">{mb.nome}</p>
                              {mb.status === "disponivel"
                                ? <Wifi size={11} style={{ color: "#22c55e", flexShrink: 0 }} />
                                : mb.status === "em_entrega"
                                  ? <Bike size={11} style={{ color: "#fbbf24", flexShrink: 0 }} />
                                  : <WifiOff size={11} style={{ color: "#374151", flexShrink: 0 }} />}
                            </div>
                            <p className="text-xs truncate" style={{ color: "#6b7280" }}>{mb.empresa_nome}</p>
                          </div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                            style={{ background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}>
                            {statusLabel}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg p-2.5" style={{ background: "#151515" }}>
                            <p className="text-xs mb-1" style={{ color: "#374151" }}>Hoje</p>
                            <p className="text-sm font-black" style={{ color: "#fbbf24" }}>
                              {mb.entregas_hoje} entregas
                            </p>
                            <p className="text-xs font-semibold" style={{ color: "#fbbf24" }}>
                              R$ {Number(mb.ganho_hoje).toFixed(2)}
                            </p>
                          </div>
                          <div className="rounded-lg p-2.5" style={{ background: "#151515" }}>
                            <p className="text-xs mb-1" style={{ color: "#374151" }}>Total</p>
                            <p className="text-sm font-black" style={{ color: "#818cf8" }}>
                              {mb.total_entregas} entregas
                            </p>
                            <p className="text-xs font-semibold" style={{ color: "#818cf8" }}>
                              R$ {Number(mb.ganho_total).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1 text-xs" style={{ color: "#4b5563" }}>
                            <Phone size={10} /> {mb.telefone}
                          </div>
                          {mb.codigo && (
                            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                              style={{ background: "#1a1a1a", color: "#6b7280", border: "1px solid #222" }}>
                              {mb.codigo}
                            </span>
                          )}
                          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: planoCfg.bg, color: planoCfg.color, border: `1px solid ${planoCfg.border}` }}>
                            {planoCfg.label}
                          </span>
                          {mb.posicao_fila != null && mb.status === "disponivel" && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(251,191,36,0.08)", color: "#fbbf24" }}>
                              #{mb.posicao_fila} fila
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}

        {/* ── ABA EMPRESAS ─────────────────────────────────────────── */}
        {view !== "motoboys" && <>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          {[
            { icon: Building2, label: "Empresas",           value: empresas.length, color: "#FF6A00" },
            { icon: Shield,    label: "Assinaturas Ativas", value: ativas,          color: "#4ade80" },
            { icon: ShoppingBag, label: "Total de Pedidos", value: totalPedidos,    color: "#fbbf24" },
            { icon: Users,     label: "Total de Motoboys",  value: totalMotoboys,   color: "#818cf8" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-2xl p-5"
              style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${color}14`, border: `1px solid ${color}22` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <p className="text-2xl font-black text-white" style={{ letterSpacing: "-0.05em" }}>{value}</p>
              <p className="text-xs mt-1" style={{ color: "#4b5563" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Search + Nova Empresa */}
        <div className="flex gap-2 mb-5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#4b5563" }} />
            <input type="text" placeholder="Buscar por nome, e-mail ou CNPJ..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-700 outline-none"
              style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }} />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shrink-0"
            style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }}>
            <Plus size={14} /> Nova empresa
          </button>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(255,106,0,0.08)", border: "1px solid rgba(255,106,0,0.2)", color: "#FF8C1A" }}>
            Erro ao carregar empresas: {error}
          </div>
        )}

        {/* Lista de empresas */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: "#4b5563" }}>Nenhuma empresa encontrada.</div>
          )}

          {filtered.map((empresa) => {
            const mbs = mbData[empresa.id] ?? [];
            const isExpanded = expandedMb === empresa.id;

            return (
              <div key={empresa.id} className="rounded-2xl overflow-hidden"
                style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }}>

                {/* ── Linha principal ── */}
                <div className="p-4 flex flex-wrap items-start gap-3">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-white">{empresa.nome}</p>
                      {/* Plano */}
                      {planoTarget === empresa.id ? (
                        <div className="flex items-center gap-1">
                          {(["basic", "pro", "enterprise", "ktl"] as Plano[]).map(p => (
                            <button key={p} onClick={() => handleSetPlano(empresa.id, p)} disabled={savingPlano}
                              className="px-2 py-0.5 rounded-full text-xs font-bold"
                              style={{ background: PLANO_CFG[p].bg, color: PLANO_CFG[p].color, border: `1px solid ${PLANO_CFG[p].border}`, cursor: "pointer" }}>
                              {savingPlano ? <Loader2 size={9} className="animate-spin" /> : PLANO_CFG[p].label}
                            </button>
                          ))}
                          <button onClick={() => setPlanoTarget(null)}
                            style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: 0 }}>
                            <XCircle size={12} />
                          </button>
                        </div>
                      ) : (
                        <PlanoBadge plano={empresa.plano ?? "basic"} onClick={() => setPlanoTarget(empresa.id)} />
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{empresa.email}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#374151" }}>
                      {empresa.cnpj ?? "Sem CNPJ"} · criada {fmtDate(empresa.created_at)}
                    </p>
                  </div>

                  {/* Controles */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Assinatura toggle */}
                    <button onClick={() => toggleAssinatura(empresa)} disabled={toggling === empresa.id}
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                      {toggling === empresa.id
                        ? <RefreshCw size={13} className="animate-spin" style={{ color: "#6b7280" }} />
                        : <StatusBadge ativa={empresa.assinatura_ativa} />}
                    </button>

                    {/* Dias */}
                    {diasTarget === empresa.id ? (
                      <div className="flex items-center gap-1">
                        <input type="number" min="1" max="3650" value={diasInput}
                          onChange={e => setDiasInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSetDias(empresa)}
                          autoFocus className="w-16 px-2 py-0.5 rounded text-xs text-white outline-none"
                          style={{ background: "#1a1a1a", border: "1px solid rgba(251,191,36,0.4)" }} />
                        <span className="text-xs" style={{ color: "#4b5563" }}>dias</span>
                        <button onClick={() => handleSetDias(empresa)} disabled={savingDias}
                          className="flex items-center justify-center w-5 h-5 rounded"
                          style={{ background: "rgba(251,191,36,0.2)", color: "#fbbf24", border: "none", cursor: "pointer" }}>
                          {savingDias ? <RefreshCw size={9} className="animate-spin" /> : <Check size={9} />}
                        </button>
                        <button onClick={() => setDiasTarget(null)}
                          className="flex items-center justify-center w-5 h-5 rounded"
                          style={{ background: "rgba(255,106,0,0.08)", color: "#FF8C1A", border: "none", cursor: "pointer" }}>
                          <XCircle size={9} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setDiasTarget(empresa.id); setDiasInput("30"); }}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                        style={{ color: "#6b7280", background: "#151515", border: "1px solid #222", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#fbbf24")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}>
                        <Clock size={11} />
                        {empresa.assinatura_expira_em ? `exp. ${fmtDate(empresa.assinatura_expira_em)}` : "definir dias"}
                      </button>
                    )}

                    {/* Motoboys expand */}
                    <button onClick={() => toggleMotoboys(empresa.id)}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                      style={{ color: "#818cf8", background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.2)", cursor: "pointer" }}>
                      <Bike size={11} />
                      {empresa.total_motoboys} motoboys
                      {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>

                    {/* Stats */}
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                      style={{ color: "#fbbf24", background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.12)" }}>
                      <TrendingUp size={11} /> {empresa.total_pedidos} pedidos
                    </span>

                    {/* Delete */}
                    <button onClick={() => deleteEmpresa(empresa)} disabled={deleting === empresa.id}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                      style={{ color: "#FF8C1A", background: "rgba(255,106,0,0.06)", border: "1px solid rgba(255,106,0,0.15)", cursor: "pointer" }}>
                      {deleting === empresa.id ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      {deleting === empresa.id ? "..." : "Excluir"}
                    </button>
                  </div>
                </div>

                {/* ── Painel de motoboys ── */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid #1a1a1a", background: "#080808", padding: "16px" }}>
                    {loadingMb && expandedMb === empresa.id ? (
                      <div className="flex items-center gap-2 text-xs" style={{ color: "#4b5563" }}>
                        <Loader2 size={13} className="animate-spin" /> Carregando motoboys...
                      </div>
                    ) : (
                      <>
                        {/* Lista */}
                        {mbs.length === 0 ? (
                          <p className="text-xs mb-3" style={{ color: "#4b5563" }}>Nenhum motoboy cadastrado.</p>
                        ) : (
                          <div className="space-y-2 mb-3">
                            {mbs.map(mb => (
                              <div key={mb.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                                style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }}>
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                  style={{ background: `${STATUS_MB_COLOR[mb.status] ?? "#64748b"}18`, color: STATUS_MB_COLOR[mb.status] ?? "#64748b" }}>
                                  {mb.nome.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-white truncate">{mb.nome}</p>
                                  <p className="text-xs" style={{ color: "#4b5563" }}>{mb.telefone}</p>
                                </div>
                                {mb.codigo && (
                                  <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                                    style={{ background: "#151515", color: "#6b7280", border: "1px solid #222" }}>
                                    {mb.codigo}
                                  </span>
                                )}
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                                  style={{ background: `${STATUS_MB_COLOR[mb.status] ?? "#64748b"}18`, color: STATUS_MB_COLOR[mb.status] ?? "#64748b" }}>
                                  {mb.status === "disponivel" ? "Disponível" : mb.status === "em_entrega" ? "Em entrega" : "Offline"}
                                </span>
                                <button onClick={() => removeMotoboy(empresa.id, mb.id)} disabled={removingMb === mb.id}
                                  className="p-1 rounded-lg shrink-0"
                                  style={{ color: "#374151", background: "none", border: "none", cursor: "pointer" }}
                                  onMouseEnter={e => (e.currentTarget.style.color = "#FF8C1A")}
                                  onMouseLeave={e => (e.currentTarget.style.color = "#374151")}>
                                  {removingMb === mb.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Form add motoboy */}
                        {addMbTarget === empresa.id ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <input type="text" placeholder="Nome" value={addMbNome}
                              onChange={e => setAddMbNome(e.target.value)}
                              className="px-3 py-1.5 rounded-lg text-xs text-white outline-none"
                              style={{ background: "#151515", border: "1px solid rgba(34,197,94,0.3)", width: 140 }} />
                            <input type="text" placeholder="Telefone" value={addMbTel}
                              onChange={e => setAddMbTel(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && addMotoboy(empresa.id)}
                              className="px-3 py-1.5 rounded-lg text-xs text-white outline-none"
                              style={{ background: "#151515", border: "1px solid rgba(34,197,94,0.3)", width: 130 }} />
                            <button onClick={() => addMotoboy(empresa.id)} disabled={savingMb}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                              style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)", cursor: "pointer" }}>
                              {savingMb ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                              Salvar
                            </button>
                            <button onClick={() => { setAddMbTarget(null); setAddMbNome(""); setAddMbTel(""); }}
                              style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", padding: 4 }}>
                              <XCircle size={13} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setAddMbTarget(empresa.id)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                            style={{ background: "rgba(34,197,94,0.08)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)", cursor: "pointer" }}>
                            <Plus size={12} /> Adicionar motoboy
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        </> /* fim aba empresas */}

        <p className="text-center text-xs mt-6" style={{ color: "#1f2937" }}>
          Vellox God Panel · {empresas.length} empresa{empresas.length !== 1 ? "s" : ""} · {allMotoboys.length > 0 ? `${allMotoboys.length} motoboys` : ""}
        </p>
      </div>

      {/* ── Modal: Criar Empresa ── */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
          onClick={(e) => e.target === e.currentTarget && fecharCreate()}
        >
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#0f0f0f", border: "1px solid #1f2937" }}>

            {createResult ? (
              /* ── Sucesso ── */
              <div className="text-center py-2">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}>
                  <CheckCircle2 size={26} style={{ color: "#4ade80" }} />
                </div>
                <h2 className="text-lg font-bold text-white mb-1">Empresa criada!</h2>
                <p className="text-sm mb-5" style={{ color: "#6b7280" }}>
                  {createResult.email} · plano <span style={{ color: PLANO_CFG[createResult.plano].color }}>{PLANO_CFG[createResult.plano].label}</span>
                </p>

                {/* Código */}
                <div className="rounded-xl p-4 mb-4" style={{ background: "#151515", border: "1px solid rgba(251,191,36,0.2)" }}>
                  <p className="text-xs mb-2 font-semibold uppercase tracking-wide" style={{ color: "#4b5563" }}>Código da empresa</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl font-black tracking-widest" style={{ color: "#fbbf24", fontFamily: "monospace" }}>
                      {createResult.codigo}
                    </span>
                    <button
                      onClick={() => copiarCodigo(createResult.codigo)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                      style={{ background: "rgba(251,191,36,0.1)", color: copiado ? "#4ade80" : "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>
                      {copiado ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>

                {/* Credenciais */}
                <div className="rounded-xl p-3 mb-5 text-left" style={{ background: "#151515", border: "1px solid #1f2937" }}>
                  <p className="text-xs mb-1.5 font-semibold uppercase tracking-wide" style={{ color: "#4b5563" }}>Credenciais de acesso</p>
                  <p className="text-xs" style={{ color: "#9ca3af" }}>Email: <span className="text-white font-mono">{createResult.email}</span></p>
                  <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>Senha: <span className="text-white font-mono">{createForm.senha}</span></p>
                </div>

                <button
                  onClick={fecharCreate}
                  className="w-full py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }}>
                  Fechar
                </button>
              </div>
            ) : (
              /* ── Formulário ── */
              <>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                      <Building2 size={16} style={{ color: "#4ade80" }} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Nova empresa</h2>
                      <p className="text-xs" style={{ color: "#4b5563" }}>Conta criada sem precisar de pagamento</p>
                    </div>
                  </div>
                  <button onClick={fecharCreate} style={{ color: "#4b5563", background: "none", border: "none", cursor: "pointer" }}>
                    <XCircle size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreateEmpresa} className="space-y-4">
                  {/* Nome */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#4b5563" }}>Nome da empresa</label>
                    <input
                      type="text" required
                      value={createForm.nome}
                      onChange={(e) => setCreateForm(f => ({ ...f, nome: e.target.value }))}
                      placeholder="Ex: Delivery Exemplo"
                      className="w-full px-4 py-2.5 rounded-xl text-sm placeholder-gray-500 outline-none"
                      style={{ background: "#151515", border: "1px solid #1f2937", color: "#e5e7eb" }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(34,197,94,0.4)")}
                      onBlur={(e) => (e.target.style.borderColor = "#1f2937")}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#4b5563" }}>Email</label>
                    <input
                      type="email" required
                      value={createForm.email}
                      onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="empresa@exemplo.com"
                      className="w-full px-4 py-2.5 rounded-xl text-sm placeholder-gray-500 outline-none"
                      style={{ background: "#151515", border: "1px solid #1f2937", color: "#e5e7eb" }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(34,197,94,0.4)")}
                      onBlur={(e) => (e.target.style.borderColor = "#1f2937")}
                    />
                  </div>

                  {/* Senha */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#4b5563" }}>Senha</label>
                    <div className="relative">
                      <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#374151" }} />
                      <input
                        type={showSenha ? "text" : "password"} required minLength={6}
                        value={createForm.senha}
                        onChange={(e) => setCreateForm(f => ({ ...f, senha: e.target.value }))}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm placeholder-gray-500 outline-none"
                        style={{ background: "#151515", border: "1px solid #1f2937", color: "#e5e7eb" }}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(34,197,94,0.4)")}
                        onBlur={(e) => (e.target.style.borderColor = "#1f2937")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSenha(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: "#374151", background: "none", border: "none", cursor: "pointer" }}>
                        {showSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Plano */}
                  <div>
                    <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "#4b5563" }}>Plano</label>
                    <div className="flex gap-2">
                      {(["basic", "pro", "enterprise", "ktl"] as Plano[]).map(p => {
                        const cfg = PLANO_CFG[p];
                        const selected = createForm.plano === p;
                        return (
                          <button
                            key={p} type="button"
                            onClick={() => setCreateForm(f => ({ ...f, plano: p }))}
                            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                            style={{
                              background: selected ? cfg.bg : "#151515",
                              color: selected ? cfg.color : "#4b5563",
                              border: `1px solid ${selected ? cfg.border : "#1f2937"}`,
                            }}>
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dias de assinatura */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#4b5563" }}>
                      Dias de assinatura
                    </label>
                    <div className="flex gap-2">
                      {[30, 90, 365].map(d => (
                        <button
                          key={d} type="button"
                          onClick={() => setCreateForm(f => ({ ...f, dias: d }))}
                          className="flex-1 py-2 rounded-xl text-xs font-bold"
                          style={{
                            background: createForm.dias === d ? "rgba(251,191,36,0.12)" : "#151515",
                            color: createForm.dias === d ? "#fbbf24" : "#4b5563",
                            border: `1px solid ${createForm.dias === d ? "rgba(251,191,36,0.3)" : "#1f2937"}`,
                          }}>
                          {d === 365 ? "1 ano" : `${d} dias`}
                        </button>
                      ))}
                      <input
                        type="number" min="1" max="3650"
                        value={createForm.dias}
                        onChange={(e) => setCreateForm(f => ({ ...f, dias: parseInt(e.target.value) || 365 }))}
                        className="w-20 px-3 py-2 rounded-xl text-xs text-white outline-none text-center"
                        style={{ background: "#151515", border: "1px solid #1f2937" }}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(251,191,36,0.4)")}
                        onBlur={(e) => (e.target.style.borderColor = "#1f2937")}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={creatingEmp}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold mt-2"
                    style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}>
                    {creatingEmp
                      ? <><Loader2 size={15} className="animate-spin" /> Criando empresa...</>
                      : <><Plus size={15} /> Criar empresa</>}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
