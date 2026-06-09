"use client";

import dynamic from "next/dynamic";
import type { Motoboy, Pedido } from "@/types";

const TrackingMap = dynamic(() => import("./TrackingMap"), { ssr: false });

interface Props {
  motoboys: Motoboy[];
  pedidos: Pedido[];
  empresaId: string;
  height?: string;
}

export default function TrackingMapClient(props: Props) {
  return <TrackingMap {...props} />;
}
