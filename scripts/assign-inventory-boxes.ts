/**
 * Assigns box_label ("Caja #1 de Retardadores", "Caja #2 de Lentes", etc.)
 * to inventory_items rows physically grouped by hand-written divider rows
 * inside the "Armario #2" sub-table of the inventory spreadsheet.
 *
 * A divider row is one where Cantidad = Referencia = Categoría = Descripción
 * are literally the same text and it starts with "Caja" (ExcelJS returns
 * the merged cell's value for every cell in the merge). A row belongs to
 * the box of the divider immediately above it only if there is no
 * category change between them (strict contiguous run) — this matches how
 * the boxes are physically laid out; unrelated items interleaved between
 * two distant same-category dividers are NOT swept into the box.
 *
 * One documented exception: "Caja acromáticos" has two unrelated rows
 * (a filter, a beamsplitter) interleaved before its two actual lens rows,
 * breaking the contiguous run. Its two members are assigned explicitly by
 * reference instead of by the automatic rule.
 *
 * Matching Excel row -> DB row: several references repeat within Armario #2
 * (e.g. "WPMH 05M-633", "BS013", "BB1-E02" each appear twice with different
 * descriptions), so matching by reference alone can silently pick the wrong
 * one of two rows. The current inventory_items.name for every row in this
 * location is still the exact, unique-per-row Descripción text captured by
 * the original seed, so we match primarily by exact (location, name); when
 * a reference has more than one live candidate we use it only to narrow
 * among same-named ties. Never inserts, never touches `category` — only
 * ever UPDATEs box_label on a row it can resolve unambiguously; anything
 * else is reported and left untouched.
 *
 * Run locally only: npx tsx scripts/assign-inventory-boxes.ts
 * Add --dry-run to only print the plan without writing.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import ExcelJS from "exceljs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY. Check .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const DRY_RUN = process.argv.includes("--dry-run");

function cellText(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object") {
    const v = value as any;
    if (typeof v.hyperlink === "string") return v.hyperlink.trim() || null;
    if (typeof v.text === "string") return v.text.trim() || null;
    if (Array.isArray(v.richText)) return v.richText.map((r: any) => r.text).join("").trim() || null;
  }
  return String(value).trim() || null;
}

function normalize(text: string | null): string {
  return (text || "").replace(/\s+/g, " ").trim();
}

function normalizeBoxCategory(dividerText: string): string | null {
  const t = dividerText.toLowerCase();
  if (t.includes("retardador")) return "Retardadores";
  if (t.includes("lente")) return "Lentes";
  if (t.includes("espejo")) return "Espejos";
  if (t.includes("beam-splitter") || t.includes("beam splitter")) return "Divisores de haz";
  if (t.includes("acromátic") || t.includes("acromatic")) return "Lentes";
  return null;
}

interface ParsedRow {
  rowNum: number;
  quantity: string | null;
  reference: string | null;
  category: string | null;
  desc: string | null;
  isDivider: boolean;
}

// Explicit exception: "Caja acromáticos" (row 115) is followed by an
// unrelated filter and beamsplitter before its two real lens members —
// assigned by reference since the contiguous-run rule can't see past them.
const ACROMATICOS_BOX_LABEL = "Caja acromáticos";
const ACROMATICOS_REFERENCES = ["AC254-040-B-ML", "AC127-030-B-ML"];

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN (no writes) ===\n" : "=== LIVE RUN ===\n");

  const filePath = path.join(process.cwd(), "Inventario equipo Rafael.xlsx");
  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel file not found at ${filePath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const armarios = workbook.getWorksheet("Armarios");
  if (!armarios) throw new Error('Sheet "Armarios" not found');

  // Armario #2 columns: Cantidad=G, Referencia=H, Categoría=I, Imagen=J, Descripción=K
  const parsed: ParsedRow[] = [];
  for (let r = 5; r <= 155; r++) {
    const quantity = cellText(armarios.getCell(`G${r}`).value);
    const reference = cellText(armarios.getCell(`H${r}`).value);
    const category = cellText(armarios.getCell(`I${r}`).value);
    const desc = cellText(armarios.getCell(`K${r}`).value);
    if (!quantity && !reference && !category && !desc) continue;
    const isDivider = quantity === desc && desc === category && /^caja/i.test(desc || "");
    parsed.push({ rowNum: r, quantity, reference, category, desc, isDivider });
  }

  console.log(`Parsed ${parsed.length} rows from Armario #2.\n`);

  // Walk rows in order, assigning a boxLabel to each item row per the
  // strict-contiguous-run rule described above.
  interface BoxedRow extends ParsedRow {
    boxLabel: string | null;
  }
  const boxed: BoxedRow[] = [];
  let currentBox: { label: string; category: string } | null = null;

  for (const row of parsed) {
    if (row.isDivider) {
      const normalizedCategory = normalizeBoxCategory(row.desc || "");
      currentBox = normalizedCategory ? { label: row.desc!, category: normalizedCategory } : null;
      boxed.push({ ...row, boxLabel: null });
      continue;
    }

    if (currentBox && row.category === currentBox.category) {
      boxed.push({ ...row, boxLabel: currentBox.label });
    } else {
      if (currentBox && row.category !== currentBox.category) {
        currentBox = null; // strict contiguous break
      }
      boxed.push({ ...row, boxLabel: null });
    }
  }

  // Explicit exception for "Caja acromáticos".
  for (const row of boxed) {
    if (row.reference && ACROMATICOS_REFERENCES.includes(row.reference)) {
      row.boxLabel = ACROMATICOS_BOX_LABEL;
    }
  }

  const toAssign = boxed.filter((r) => r.boxLabel);
  console.log(`Rows with a box assigned: ${toAssign.length}\n`);
  for (const r of toAssign) {
    console.log(`  r${r.rowNum} [${r.boxLabel}] ref="${r.reference}" desc="${r.desc}"`);
  }

  // Load Armario #2 location + its current items to match against.
  const { data: location, error: locError } = await supabase
    .from("locations")
    .select("id")
    .eq("type", "armario")
    .eq("number", 2)
    .single();
  if (locError || !location) throw new Error(`Could not find Armario #2 location: ${locError?.message}`);

  const { data: items, error: itemsError } = await supabase
    .from("inventory_items")
    .select("id, name, reference, box_label")
    .eq("location_id", location.id);
  if (itemsError) throw itemsError;

  const byName = new Map<string, any[]>();
  const byRef = new Map<string, any[]>();
  for (const item of items || []) {
    const nameKey = normalize(item.name);
    byName.set(nameKey, [...(byName.get(nameKey) || []), item]);
    if (item.reference) {
      byRef.set(item.reference, [...(byRef.get(item.reference) || []), item]);
    }
  }

  function removeFromBucket(map: Map<string, any[]>, key: string, item: any) {
    const bucket = map.get(key);
    if (!bucket) return;
    const idx = bucket.indexOf(item);
    if (idx !== -1) bucket.splice(idx, 1);
  }

  function claim(item: any) {
    removeFromBucket(byName, normalize(item.name), item);
    if (item.reference) removeFromBucket(byRef, item.reference, item);
  }

  const resolved = new Map<BoxedRow, any>();

  // Pass 1: rows whose reference is globally unambiguous (exactly one live
  // DB item still has it) — resolved first and removed from both lookup
  // structures, so pass 2's name-matching sees an already-shrunk pool. This
  // matters when the same *name* is shared by two rows but only one of them
  // also has an ambiguous/typo'd reference — resolving the unambiguous
  // sibling first leaves exactly one name-candidate for the other.
  for (const row of toAssign) {
    if (!row.reference) continue;
    const refCandidates = byRef.get(row.reference) || [];
    if (refCandidates.length === 1) {
      resolved.set(row, refCandidates[0]);
      claim(refCandidates[0]);
    }
  }

  // Pass 2: remaining rows, by exact (already-shrunk) name match; reference
  // only used to break a tie among same-named candidates.
  for (const row of toAssign) {
    if (resolved.has(row)) continue;
    const nameKey = normalize(row.desc);
    const nameCandidates = byName.get(nameKey) || [];

    let item: any | null = null;
    if (nameCandidates.length === 1) {
      item = nameCandidates[0];
    } else if (nameCandidates.length > 1 && row.reference) {
      item = nameCandidates.find((c) => c.reference === row.reference) || null;
    }

    if (item) {
      resolved.set(row, item);
      claim(item);
    }
  }

  let updated = 0;
  let unchanged = 0;
  let unmatched = 0;
  const unmatchedRows: BoxedRow[] = [];

  for (const row of toAssign) {
    const item = resolved.get(row) || null;
    if (!item) {
      unmatched++;
      unmatchedRows.push(row);
      continue;
    }

    if (item.box_label === row.boxLabel) {
      unchanged++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [dry-run] would set box_label="${row.boxLabel}" on item ${item.id} (${item.name})`);
      updated++;
      continue;
    }

    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({ box_label: row.boxLabel })
      .eq("id", item.id);

    if (updateError) {
      console.error(`  ✗ Failed to update ${item.id}: ${updateError.message}`);
      continue;
    }
    updated++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Already correct: ${unchanged}`);
  console.log(`Unmatched (left untouched): ${unmatched}`);
  if (unmatchedRows.length > 0) {
    console.log(`\nUnmatched rows:`);
    for (const r of unmatchedRows) {
      console.log(`  r${r.rowNum} [${r.boxLabel}] ref="${r.reference}" desc="${r.desc}"`);
    }
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
