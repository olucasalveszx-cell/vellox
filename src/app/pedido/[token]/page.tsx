import { Metadata } from "next";
import TrackingClient from "./TrackingClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Acompanhar Pedido · Vellox",
  description: "Acompanhe seu pedido em tempo real",
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function TrackingPage({ params }: Props) {
  const { token } = await params;
  return <TrackingClient token={token} />;
}
