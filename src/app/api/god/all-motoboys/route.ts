import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.GOD_EMAIL) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("god_list_motoboys");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
