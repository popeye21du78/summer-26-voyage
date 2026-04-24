import { NextRequest, NextResponse } from "next/server";
import { getSessionProfileId } from "@/lib/auth-session";
import { supabaseAdmin } from "@/lib/supabase-admin";

const MAX_BYTES = 12 * 1024 * 1024; // 12 Mo

export async function POST(request: NextRequest) {
  const client = supabaseAdmin;
  if (!client) {
    return NextResponse.json(
      { error: "Supabase non configuré" },
      { status: 503 }
    );
  }
  const userId = getSessionProfileId(request);
  if (!userId) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "FormData requis" }, { status: 400 });
  }
  const file = formData.get("file") as File | null;
  const voyageId = String(formData.get("voyageId") ?? "").trim();
  const stepId = String(formData.get("stepId") ?? "").trim();
  const kind = String(formData.get("kind") ?? "polaroid").trim();
  if (!file || !voyageId || !stepId) {
    return NextResponse.json(
      { error: "file, voyageId, stepId requis" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop lourd" }, { status: 400 });
  }
  const t = (file.type || "").toLowerCase();
  if (!t.startsWith("image/") && t !== "application/octet-stream") {
    return NextResponse.json({ error: "Fichier non supporté" }, { status: 400 });
  }
  const ext =
    (file.name?.split(".").pop() || (t === "image/png" ? "png" : "jpg"))
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";
  const safeV = encodeURIComponent(voyageId).replace(/[^a-zA-Z0-9_%\-.~]/g, "_");
  const safeS = encodeURIComponent(stepId).replace(/[^a-zA-Z0-9_%\-.~]/g, "_");
  const path = `${userId}/viago/${kind}/${safeV}/${safeS}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { data, error } = await client.storage.from("photos").upload(path, buf, {
    contentType: t || "image/jpeg",
    upsert: false,
  });
  if (error) {
    console.error("viago upload storage:", error);
    return NextResponse.json(
      { error: error.message || "Échec upload" },
      { status: 500 }
    );
  }
  const { data: urlData } = client.storage.from("photos").getPublicUrl(data.path);
  return NextResponse.json({ url: urlData.publicUrl, path: data.path });
}
