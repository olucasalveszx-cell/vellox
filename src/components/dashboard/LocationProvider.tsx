"use client";

import { useEffect } from "react";

interface Props {
  children: React.ReactNode;
  lat: number | null;
  lng: number | null;
}

export default function LocationProvider({ children, lat, lng }: Props) {
  useEffect(() => {
    if (lat != null && lng != null) {
      localStorage.setItem("empresa_lat", String(lat));
      localStorage.setItem("empresa_lng", String(lng));
    }
  }, [lat, lng]);

  return <>{children}</>;
}
