import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
