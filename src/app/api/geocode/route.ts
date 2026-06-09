import { NextRequest, NextResponse } from "next/server";

const KEY = process.env.GOOGLE_MAPS_KEY!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  try {
    if (type === "autocomplete") {
      const q      = searchParams.get("q") ?? "";
      const lat    = searchParams.get("lat");
      const lng    = searchParams.get("lng");
      const radius = searchParams.get("radius") ?? "50000";
      const loc    = lat && lng ? `&location=${lat},${lng}&radius=${radius}` : "";
      const origin = lat && lng ? `&origin=${lat},${lng}` : "";
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&key=${KEY}&language=pt-BR&components=country:br${loc}${origin}`;
      const res  = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (type === "details") {
      const placeId = searchParams.get("place_id") ?? "";
      const url  = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,address_components&key=${KEY}&language=pt-BR`;
      const res  = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (type === "reverse") {
      const lat = searchParams.get("lat") ?? "";
      const lng = searchParams.get("lng") ?? "";
      const url  = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${KEY}&language=pt-BR&result_type=street_address`;
      const res  = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (type === "directions") {
      const origin = searchParams.get("origin") ?? "";
      const dest   = searchParams.get("destination") ?? "";
      const url    = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&key=${KEY}&mode=driving&language=pt-BR`;
      const res    = await fetch(url, { cache: "no-store" });
      const data   = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  } catch (err) {
    console.error("[api/geocode]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
