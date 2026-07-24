import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const supabase = createSupabaseClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type BugReport = Database["public"]["Tables"]["bug_reports"]["Row"];

export const MAX_IMAGES_PER_REPORT = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/**
 * Upload one screenshot for a bug report. Files are namespaced per user so a
 * malicious filename can't overwrite someone else's upload (Storage paths are
 * the only thing separating objects inside a public bucket).
 */
async function uploadReportImage(userId: string, file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(
      `Tipo de archivo no permitido (${file.type || "desconocido"}). Usa PNG, JPG, WEBP o GIF.`
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(
      `La imagen "${file.name}" pesa ${(file.size / 1024 / 1024).toFixed(1)} MB; el máximo es 5 MB.`
    );
  }

  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${crypto.randomUUID()}.${ext || "png"}`;

  const { error } = await supabase.storage
    .from("bug-report-images")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error("Error uploading bug report image:", error);
    throw new Error(`No se pudo subir la imagen: ${error.message || "error desconocido"}`);
  }

  const { data } = supabase.storage.from("bug-report-images").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * File a bug report, uploading any attached screenshots first. Length limits
 * mirror the DB CHECK constraints so users get a friendly message instead of a
 * raw Postgres violation.
 */
export async function createBugReport(input: {
  title: string;
  description: string;
  pageUrl?: string;
  images?: File[];
}): Promise<BugReport> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Debes iniciar sesión para reportar un error");

  const title = input.title.trim();
  const description = input.description.trim();

  if (title.length < 3 || title.length > 200) {
    throw new Error("El título debe tener entre 3 y 200 caracteres");
  }
  if (description.length < 10 || description.length > 5000) {
    throw new Error("La descripción debe tener entre 10 y 5000 caracteres");
  }

  const images = input.images ?? [];
  if (images.length > MAX_IMAGES_PER_REPORT) {
    throw new Error(`Puedes adjuntar máximo ${MAX_IMAGES_PER_REPORT} imágenes`);
  }

  const imageUrls: string[] = [];
  for (const file of images) {
    imageUrls.push(await uploadReportImage(user.id, file));
  }

  const { data, error } = await (supabase
    .from("bug_reports")
    .insert({
      reported_by: user.id,
      title,
      description,
      page_url: input.pageUrl ?? null,
      image_urls: imageUrls,
    } as any)
    .select()
    .single() as any);

  if (error) {
    console.error("Error creating bug report:", error);
    throw new Error(`No se pudo enviar el reporte: ${error.message || "error desconocido"}`);
  }

  return data as BugReport;
}

/** Reports filed by the current user (RLS also lets admins/directors see all). */
export async function getMyBugReports(): Promise<BugReport[]> {
  const { data, error } = await supabase
    .from("bug_reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching bug reports:", error);
    throw new Error(`No se pudieron cargar los reportes: ${error.message || "error desconocido"}`);
  }

  return (data as BugReport[]) || [];
}
