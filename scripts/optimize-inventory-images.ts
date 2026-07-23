/**
 * Re-downloads every image currently referenced by inventory_items.image_url,
 * resizes it to a sane max dimension and re-encodes it as compressed WebP,
 * then re-uploads it to the "inventory-images" bucket (same path, same
 * public URL — no DB update needed).
 *
 * Why: images were being stored at whatever resolution the source (mostly
 * Thorlabs) served (up to ~450x450, up to ~290KB), and since this project
 * builds with `output: "export"` (images.unoptimized: true, no Next.js
 * image optimization pipeline available), the browser downloads the full
 * file for every grid thumbnail. Re-encoding at ingestion time is the only
 * lever available on a static export + free-tier Supabase Storage.
 *
 * Run locally only: npx tsx scripts/optimize-inventory-images.ts
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY. Check .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MAX_DIMENSION = 500; // longest side, in px — plenty for grid thumbnails and the detail modal
const WEBP_QUALITY = 78;

function extractStoragePath(publicUrl: string): string | null {
  const marker = "/object/public/inventory-images/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

async function main() {
  const { data: items, error } = await supabase
    .from("inventory_items")
    .select("id, image_url")
    .not("image_url", "is", null);

  if (error) throw error;
  console.log(`Found ${items?.length || 0} items with an image.\n`);

  let optimized = 0;
  let failed = 0;
  let totalBefore = 0;
  let totalAfter = 0;

  for (const item of items || []) {
    const storagePath = extractStoragePath(item.image_url!);
    if (!storagePath) {
      console.warn(`  ✗ Could not parse storage path from ${item.image_url}`);
      failed++;
      continue;
    }

    try {
      const { data: blob, error: downloadError } = await supabase.storage
        .from("inventory-images")
        .download(storagePath);

      if (downloadError || !blob) {
        console.warn(`  ✗ Download failed for ${storagePath}: ${downloadError?.message}`);
        failed++;
        continue;
      }

      const originalBuffer = Buffer.from(await blob.arrayBuffer());
      const optimizedBuffer = await sharp(originalBuffer)
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      // Skip re-upload if we somehow made it bigger (tiny/simple images)
      if (optimizedBuffer.length >= originalBuffer.length) {
        console.log(
          `  = ${storagePath}: already optimal (${(originalBuffer.length / 1024).toFixed(0)}KB)`
        );
        totalBefore += originalBuffer.length;
        totalAfter += originalBuffer.length;
        continue;
      }

      // New path always ends in .webp regardless of original extension
      const newPath = storagePath.replace(/\.[a-z0-9]+$/i, ".webp");

      const { error: uploadError } = await supabase.storage
        .from("inventory-images")
        .upload(newPath, optimizedBuffer, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) {
        console.warn(`  ✗ Upload failed for ${newPath}: ${uploadError.message}`);
        failed++;
        continue;
      }

      // If the extension changed (e.g. .jpg -> .webp), remove the old object
      // and update the DB row to point at the new path.
      if (newPath !== storagePath) {
        await supabase.storage.from("inventory-images").remove([storagePath]);
        const { data: publicUrlData } = supabase.storage
          .from("inventory-images")
          .getPublicUrl(newPath);
        await supabase
          .from("inventory_items")
          .update({ image_url: publicUrlData.publicUrl })
          .eq("id", item.id);
      }

      totalBefore += originalBuffer.length;
      totalAfter += optimizedBuffer.length;
      optimized++;
      console.log(
        `  ✓ ${storagePath}: ${(originalBuffer.length / 1024).toFixed(0)}KB -> ${(optimizedBuffer.length / 1024).toFixed(0)}KB`
      );
    } catch (err: any) {
      console.warn(`  ✗ Error processing ${storagePath}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Optimized: ${optimized}`);
  console.log(`Failed: ${failed}`);
  console.log(
    `Total size: ${(totalBefore / 1024 / 1024).toFixed(1)}MB -> ${(totalAfter / 1024 / 1024).toFixed(1)}MB`
  );
  if (totalBefore > 0) {
    console.log(`Reduction: ${(100 - (totalAfter / totalBefore) * 100).toFixed(0)}%`);
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
