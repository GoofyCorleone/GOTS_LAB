/**
 * Reads "Inventario equipo Rafael.xlsx" (updated layout: each location
 * sub-table now has Cantidad, Referencia, Categoría, Imagen, Descripción)
 * and, for every row, updates the matching inventory_items row's category
 * and (when an image link is present) downloads the image and uploads it
 * to the "inventory-images" Supabase Storage bucket, updating image_url.
 *
 * Matching key: (location_id, reference) when reference is present,
 * otherwise (location_id, name) — mirrors how scripts/seed-inventory.ts
 * originally derived `name` from the Descripción column.
 *
 * Run locally only: npx tsx scripts/update-inventory-from-excel.ts
 * Add --dry-run to only print the parsed/matched plan without writing.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import ExcelJS from "exceljs";
import sharp from "sharp";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY. Check .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const DRY_RUN = process.argv.includes("--dry-run");

interface ParsedRow {
  type: "cajon" | "armario";
  number: number;
  quantity: number;
  reference: string | null;
  category: string | null;
  imageUrl: string | null;
  name: string;
}

function cellText(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object") {
    const v = value as any;
    if (typeof v.hyperlink === "string") return v.hyperlink.trim() || null;
    if (typeof v.text === "string") return v.text.trim() || null;
    if (Array.isArray(v.richText)) {
      return v.richText.map((r: any) => r.text).join("").trim() || null;
    }
  }
  return String(value).trim() || null;
}

async function parseExcel(): Promise<ParsedRow[]> {
  const filePath = path.join(process.cwd(), "Inventario equipo Rafael.xlsx");
  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel file not found at ${filePath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const rows: ParsedRow[] = [];

  const cajones = workbook.getWorksheet("Cajones");
  if (cajones) {
    const config = [
      { number: 1, cantidad: "C", ref: "D", cat: "E", img: "F", desc: "G" },
      { number: 2, cantidad: "H", ref: "I", cat: "J", img: "K", desc: "L" },
      { number: 3, cantidad: "M", ref: "N", cat: "O", img: "P", desc: "Q" },
    ];
    for (let r = 4; r <= 40; r++) {
      for (const c of config) {
        const quantity = cajones.getCell(`${c.cantidad}${r}`).value as number | null;
        if (!quantity || quantity <= 0) continue;
        const reference = cellText(cajones.getCell(`${c.ref}${r}`).value);
        const category = cellText(cajones.getCell(`${c.cat}${r}`).value);
        const imageUrl = cellText(cajones.getCell(`${c.img}${r}`).value);
        const desc = cellText(cajones.getCell(`${c.desc}${r}`).value);
        rows.push({
          type: "cajon",
          number: c.number,
          quantity,
          reference,
          category,
          imageUrl,
          name: desc || `Ítem en Cajón #${c.number}`,
        });
      }
    }
  }

  const armarios = workbook.getWorksheet("Armarios");
  if (armarios) {
    const config = [
      { number: 1, cantidad: "B", ref: "C", cat: "D", img: "E", desc: "F" },
      { number: 2, cantidad: "G", ref: "H", cat: "I", img: "J", desc: "K" },
      { number: 3, cantidad: "L", ref: "M", cat: "N", img: "O", desc: "P" },
      { number: 4, cantidad: "Q", ref: "R", cat: "S", img: "T", desc: "U" },
    ];
    for (let r = 5; r <= 155; r++) {
      for (const c of config) {
        const quantity = armarios.getCell(`${c.cantidad}${r}`).value as number | null;
        if (!quantity || quantity <= 0) continue;
        const reference = cellText(armarios.getCell(`${c.ref}${r}`).value);
        const category = cellText(armarios.getCell(`${c.cat}${r}`).value);
        const imageUrl = cellText(armarios.getCell(`${c.img}${r}`).value);
        const desc = cellText(armarios.getCell(`${c.desc}${r}`).value);
        rows.push({
          type: "armario",
          number: c.number,
          quantity,
          reference,
          category,
          imageUrl,
          name: desc || `Ítem en Armario #${c.number}`,
        });
      }
    }
  }

  return rows;
}

const MAX_IMAGE_DIMENSION = 500; // longest side, in px — plenty for grid thumbnails and the detail modal
const WEBP_QUALITY = 78;

async function downloadAndUpload(
  itemId: string,
  imageUrl: string
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (GOTS-Lab inventory sync)" },
    });
    if (!res.ok) {
      console.warn(`  ✗ HTTP ${res.status} fetching ${imageUrl}`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 200) {
      console.warn(`  ✗ Suspiciously small response (${buffer.length}b) from ${imageUrl}`);
      return null;
    }

    // Always re-encode to a size-capped, compressed WebP — the source
    // (mostly Thorlabs/Excelitas CDNs) serves images far larger than a
    // grid thumbnail needs, and this project's static export can't rely
    // on Next.js image optimization (images.unoptimized: true) to shrink
    // them at request time.
    const optimizedBuffer = await sharp(buffer)
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const storagePath = `${itemId}.webp`;

    const { error: uploadError } = await supabase.storage
      .from("inventory-images")
      .upload(storagePath, optimizedBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      console.warn(`  ✗ Upload failed: ${uploadError.message}`);
      return null;
    }

    const { data } = supabase.storage.from("inventory-images").getPublicUrl(storagePath);
    return data.publicUrl;
  } catch (err: any) {
    console.warn(`  ✗ Error downloading/uploading ${imageUrl}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN (no writes) ===\n" : "=== LIVE RUN ===\n");

  const rows = await parseExcel();
  console.log(`Parsed ${rows.length} rows from Excel.\n`);

  // Load all locations and build a lookup
  const { data: locations, error: locError } = await supabase
    .from("locations")
    .select("*");
  if (locError) throw locError;
  const locationMap = new Map<string, string>();
  for (const loc of locations || []) {
    locationMap.set(`${loc.type}_${loc.number}`, loc.id);
  }

  // Load all inventory items
  const { data: items, error: itemsError } = await supabase
    .from("inventory_items")
    .select("*");
  if (itemsError) throw itemsError;

  // Build lookup by location_id + reference, and location_id + name.
  // byName maps to an array: multiple items can legitimately share the same
  // name at the same location (e.g. two "Montura lente" rows with different
  // references) — collapsing them into a single value silently made every
  // matching Excel row overwrite the same one item and left its sibling(s)
  // untouched. Each name-fallback match below claims (shifts) one candidate
  // so later rows fall through to the next unclaimed item with that name.
  const byRef = new Map<string, any>();
  const byName = new Map<string, any[]>();
  for (const item of items || []) {
    if (item.reference) byRef.set(`${item.location_id}|${item.reference}`, item);
    const nameKey = `${item.location_id}|${item.name}`;
    const list = byName.get(nameKey) || [];
    list.push(item);
    byName.set(nameKey, list);
  }

  let matched = 0;
  let unmatched = 0;
  let categoryUpdates = 0;
  let imagesDownloaded = 0;
  let imagesFailed = 0;
  let imagesSkippedNoLink = 0;
  const unmatchedRows: ParsedRow[] = [];
  const matchedItemIds = new Set<string>();

  for (const row of rows) {
    const locationId = locationMap.get(`${row.type}_${row.number}`);
    if (!locationId) {
      console.warn(`No location found for ${row.type} #${row.number}`);
      unmatched++;
      continue;
    }

    let item = row.reference
      ? byRef.get(`${locationId}|${row.reference}`)
      : undefined;

    const nameCandidates = byName.get(`${locationId}|${row.name}`);
    if (!item) {
      item = nameCandidates?.shift();
    } else if (nameCandidates) {
      // Matched via reference directly — remove it from its name bucket too,
      // so a later row falling back by name doesn't hand it out again.
      const idx = nameCandidates.indexOf(item);
      if (idx !== -1) nameCandidates.splice(idx, 1);
    }

    if (!item) {
      unmatched++;
      unmatchedRows.push(row);
      continue;
    }

    matched++;
    matchedItemIds.add(item.id);
    const updates: Record<string, any> = {};

    if (row.category && row.category !== item.category) {
      updates.category = row.category;
      categoryUpdates++;
    }

    if (row.imageUrl) {
      if (!DRY_RUN) {
        const publicUrl = await downloadAndUpload(item.id, row.imageUrl);
        if (publicUrl) {
          updates.image_url = publicUrl;
          imagesDownloaded++;
        } else {
          imagesFailed++;
        }
      } else {
        console.log(`  [dry-run] would download image for ${item.reference || item.name}`);
      }
    } else {
      imagesSkippedNoLink++;
    }

    if (Object.keys(updates).length > 0 && !DRY_RUN) {
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update(updates)
        .eq("id", item.id);
      if (updateError) {
        console.error(`  ✗ Failed to update ${item.id}: ${updateError.message}`);
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Matched: ${matched}`);
  console.log(`Unmatched: ${unmatched}`);
  console.log(`Category updates: ${categoryUpdates}`);
  console.log(`Images downloaded+uploaded: ${imagesDownloaded}`);
  console.log(`Images failed: ${imagesFailed}`);
  console.log(`Rows with no image link (left as-is): ${imagesSkippedNoLink}`);

  if (unmatchedRows.length > 0) {
    console.log(`\n=== Unmatched Excel rows (${unmatchedRows.length}) ===`);
    for (const r of unmatchedRows) {
      console.log(`  [loc=${r.type}#${r.number}] ref="${r.reference}" | name="${r.name}"`);
    }

    console.log(`\n=== Leftover DB items never matched by any Excel row ===`);
    const leftovers = (items || []).filter((i) => !matchedItemIds.has(i.id));
    for (const i of leftovers) {
      const loc = (locations || []).find((l) => l.id === i.location_id);
      console.log(
        `  [loc=${loc?.type}#${loc?.number}] id=${i.id} ref="${i.reference}" | name="${i.name}" | category="${i.category}"`
      );
    }
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
