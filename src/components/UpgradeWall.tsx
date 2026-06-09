"use client";

import Link from "next/link";
import { Lock, ArrowRight, Zap, Crown } from "lucide-react";
import type { Plano } from "@/types";
import { PLANO_LABEL } from "@/contexts/PlanoContext";

interface Props {
  recurso: string;
  descricao?: string;
  planoNecessario: "pro" | "enterprise";
  planoAtual: Plano;
}

const PLANO_ICON = {
  pro:        { icon: Zap,   color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  enterprise: { icon: Crown, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
};

export default function UpgradeWall({ recurso, descricao, planoNecessario, planoAtual }: Props) {
  const cfg = PLANO_ICON[planoNecessario];
  const Icon = cfg.icon;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "80px 24px", gap: 20, textAlign: "center",
      background: "#fff", borderRadius: 20, border: "1px solid #f0f0f0",
      minHeight: 360,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Lock size={28} style={{ color: cfg.color }} />
      </div>

      <div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", margin: "0 0 8px" }}>
          {recurso}
        </h2>
        <p style={{ fontSize: 15, color: "#64748b", maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
          {descricao ?? `Este recurso está disponível a partir do plano ${PLANO_LABEL[planoNecessario]}.`}
        </p>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        borderRadius: 12, padding: "10px 18px",
      }}>
        <Icon size={15} style={{ color: cfg.color }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>
          Disponível no plano {PLANO_LABEL[planoNecessario]}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <Link
          href="/#planos"
          target="_blank"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 24px", borderRadius: 12,
            background: cfg.color, color: "#fff",
            fontWeight: 800, fontSize: 14, textDecoration: "none",
          }}
        >
          Fazer upgrade <ArrowRight size={14} />
        </Link>
        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
          Plano atual: <strong style={{ color: "#64748b" }}>{PLANO_LABEL[planoAtual]}</strong>
        </p>
      </div>
    </div>
  );
}
