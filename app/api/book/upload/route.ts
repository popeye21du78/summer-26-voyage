import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { supabase } from "../../../../lib/supabase";

export async function POST(request: NextRequest) {
  const client = supabaseAdmin ?? supabase;
  if (!client) {
    return NextResponse.json(
      { error: "Supabase non configuré" },
      { status: 503 }
    );
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const stepId = formData.get("step_id") as string | null;
    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier" },
        { status: 400 }
      );
    }
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${stepId ?? "temp"}/${Date.now()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { data, error } = await client.storage
      .from("photos")
      .upload(path, buf, {
        contentType: file.type,
        upsert: false,
      });
    if (error) {
      console.error("Upload Supabase:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    const { data: urlData } = client.storage
      .from("photos")
      .getPublicUrl(data.path);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e) {
    console.error("API upload:", e);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
