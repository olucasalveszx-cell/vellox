import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LandingPage from "./LandingPage";

export const metadata: Metadata = {
  title: "Vellox — Sistema de Delivery em Tempo Real",
  description: "Gerencie pedidos, motoboys e rotas em tempo real. Catálogo digital, despacho automático e relatórios financeiros. Ative em minutos, a partir de R$79/mês.",
  keywords: "sistema delivery, gestão de motoboys, painel de pedidos, catálogo digital, despacho automático, software delivery",
  openGraph: {
    title: "Vellox — Sistema de Delivery em Tempo Real",
    description: "Gerencie pedidos, motoboys e rotas em tempo real. Ative em minutos, a partir de R$79/mês.",
    type: "website",
    locale: "pt_BR",
    siteName: "Vellox",
    images: [{ url: "/linkvellox.jpg", width: 1200, height: 630, alt: "Vellox" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vellox — Sistema de Delivery em Tempo Real",
    description: "Gerencie pedidos, motoboys e rotas em tempo real. Ative em minutos.",
    images: ["/linkvellox.jpg"],
  },
  robots: { index: true, follow: true },
};

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const tipo = user.user_metadata?.tipo as string | undefined;
    if (tipo === "motoboy") redirect("/motoboy");
    if (user.email === process.env.GOD_EMAIL) redirect("/god");
    redirect("/dashboard");
  }

  return <LandingPage />;
}
