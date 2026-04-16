import { NextResponse } from "next/server";
import { loadMaintenancePhotoQueue } from "@/lib/maintenance-photo-queue";
import { getPhotoValidations, listValidatedPhotos } from "@/lib/maintenance-photo-validations";

export async function GET() {
  try {
    const items = loadMaintenancePhotoQueue();
    const validations = await getPhotoValidations();
    const enriched = items.map((row) => {
      const v = validations[row.slug];
      const validatedList = v?.status === "validated" ? listValidatedPhotos(v) : [];
      return {
        ...row,
        validationStatus: v?.status ?? null,
        hasValidatedPhoto: v?.status === "validated" && validatedList.length > 0,
        validatedPhotoCount: validatedList.length,
        validatedUrls: validatedList.map((p) => p.url),
      };
    });
    return NextResponse.json({
      total: enriched.length,
      items: enriched,
    });
  } catch (e) {
    console.error("maintenance photo-queue:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
