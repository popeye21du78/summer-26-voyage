import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/types/supabase";
import type { ViagoStepContent } from "@/lib/viago-storage";
import { assertPersistableViagoContent } from "@/lib/viago-persist-validate";
import { parseViagoStepFromUnknown } from "@/lib/viago-storage";

export type ViagoPersistResult =
  | { ok: true; content: ViagoStepContent; updatedAt: string }
  | { ok: false; error: string; status: number };

/**
 * Récupère le JSON Viago côté serveur (déjà typé côté client).
 */
export async function serverGetViagoStep(
  client: SupabaseClient,
  userId: string,
  voyageId: string,
  stepId: string
): Promise<ViagoStepContent | null> {
  const { data, error } = await client
    .from("viago_step_contents")
    .select("content, updated_at")
    .eq("user_id", userId)
    .eq("voyage_id", voyageId)
    .eq("step_id", stepId)
    .maybeSingle();
  if (error || !data) return null;
  const c = parseViagoStepFromUnknown(data.content);
  if (!c) return null;
  if (data.updated_at) c.updatedAt = data.updated_at;
  return c;
}

export async function serverUpsertViagoStep(
  client: SupabaseClient,
  userId: string,
  voyageId: string,
  stepId: string,
  content: ViagoStepContent
): Promise<ViagoPersistResult> {
  const check = assertPersistableViagoContent(content);
  if (!check.ok) {
    return { ok: false, error: check.error, status: 400 };
  }
  const asJson: Json = JSON.parse(
    JSON.stringify({
      ...content,
      updatedAt: new Date().toISOString(),
    })
  );
  const { data, error } = await client
    .from("viago_step_contents")
    .upsert(
      {
        user_id: userId,
        voyage_id: voyageId,
        step_id: stepId,
        content: asJson,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,voyage_id,step_id" }
    )
    .select("content, updated_at")
    .single();
  if (error) {
    console.error("viago upsert", error);
    return { ok: false, error: "Échec enregistrement serveur", status: 500 };
  }
  const parsed = parseViagoStepFromUnknown(data.content);
  if (!parsed) return { ok: false, error: "Réponse illisible", status: 500 };
  if (data.updated_at) parsed.updatedAt = data.updated_at;
  return { ok: true, content: parsed, updatedAt: data.updated_at };
}
