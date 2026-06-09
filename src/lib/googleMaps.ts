let loadPromise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as { google?: { maps?: object } }).google?.maps) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const result: { lat: number; lng: number }[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, n = 0;
    do { b = encoded.charCodeAt(index++) - 63; n |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (n & 1) ? ~(n >> 1) : n >> 1;
    shift = 0; n = 0;
    do { b = encoded.charCodeAt(index++) - 63; n |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (n & 1) ? ~(n >> 1) : n >> 1;
    result.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return result;
}

export async function fetchGoogleDirections(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
): Promise<{ lat: number; lng: number }[]> {
  try {
    const res  = await fetch(`/api/geocode?type=directions&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}`);
    const data = await res.json();
    const encoded = data.routes?.[0]?.overview_polyline?.points as string | undefined;
    if (encoded) return decodePolyline(encoded);
  } catch { /* fallback: straight line */ }
  return [{ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng }];
}

export const DARK_MAP_STYLE = [
  { elementType: "geometry",                                    stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.stroke",                          stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill",                            stylers: [{ color: "#7a7a8c" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#c0956e" }] },
  { featureType: "poi",                     elementType: "labels.text.fill", stylers: [{ color: "#c0956e" }] },
  { featureType: "poi.park",                elementType: "geometry",         stylers: [{ color: "#1f3022" }] },
  { featureType: "road",                    elementType: "geometry",         stylers: [{ color: "#38414e" }] },
  { featureType: "road",                    elementType: "geometry.stroke",  stylers: [{ color: "#212a37" }] },
  { featureType: "road",                    elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway",            elementType: "geometry",         stylers: [{ color: "#746855" }] },
  { featureType: "road.highway",            elementType: "geometry.stroke",  stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway",            elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit",                 elementType: "geometry",         stylers: [{ color: "#2f3948" }] },
  { featureType: "water",                   elementType: "geometry",         stylers: [{ color: "#17263c" }] },
  { featureType: "water",                   elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
];
