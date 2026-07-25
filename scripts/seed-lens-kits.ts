/**
 * Breaks the two Thorlabs lens kits already in inventory_items (LSC01-A,
 * 10 pcs and LSB04-A, 35 pcs) into individually reservable child rows, one
 * per lens, so a user can pick a specific lens by reference instead of
 * reserving the whole kit.
 *
 * The reference list below was read directly off Thorlabs' own "Kit
 * Components" tables for LSC01-A / LSB04-A (pasted by the lab owner) — not
 * scraped or guessed, since that page renders its contents table via JS.
 *
 * Idempotent: skips any (kit_parent_id, reference) pair that already exists,
 * so re-running after a partial failure is safe. Never touches the parent
 * rows or any other inventory_items.
 *
 * Run locally only: npx tsx scripts/seed-lens-kits.ts
 * Add --dry-run to only print the plan without writing.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY. Check .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const DRY_RUN = process.argv.includes("--dry-run");

interface KitChild {
  reference: string;
  label: string;
}

interface KitSpec {
  parentId: string;
  parentName: string;
  children: KitChild[];
}

const LSC01A_CHILDREN: KitChild[] = [
  { reference: "LA1145-A", label: "Lente plano-convexa Ø2\" f=75mm" },
  { reference: "LA1050-A", label: "Lente plano-convexa Ø2\" f=100mm" },
  { reference: "LA1384-A", label: "Lente plano-convexa Ø2\" f=125mm" },
  { reference: "LA1417-A", label: "Lente plano-convexa Ø2\" f=150mm" },
  { reference: "LA1979-A", label: "Lente plano-convexa Ø2\" f=200mm" },
  { reference: "LA1256-A", label: "Lente plano-convexa Ø2\" f=300mm" },
  { reference: "LA1725-A", label: "Lente plano-convexa Ø2\" f=400mm" },
  { reference: "LA1380-A", label: "Lente plano-convexa Ø2\" f=500mm" },
  { reference: "LA1727-A", label: "Lente plano-convexa Ø2\" f=750mm" },
  { reference: "LA1779-A", label: "Lente plano-convexa Ø2\" f=1000mm" },
];

const LSB04A_PLANO_CONVEX_FOCALS = [
  "25.4", "35", "50", "75", "100", "125", "150", "200", "250", "300", "400", "500", "750", "1000",
];
const LSB04A_PLANO_CONVEX_REFS = [
  "LA1951-A", "LA1027-A", "LA1131-A", "LA1608-A", "LA1509-A", "LA1986-A", "LA1433-A",
  "LA1708-A", "LA1461-A", "LA1172-A", "LA1908-A", "LA1978-A", "LA1464-A", "LA1484-A",
];
const LSB04A_BI_CONVEX_REFS = [
  "LB1761-A", "LB1811-A", "LB1471-A", "LB1901-A", "LB1676-A", "LB1904-A", "LB1437-A",
  "LB1945-A", "LB1056-A", "LB1779-A", "LB1391-A", "LB1869-A", "LB1475-A", "LB1409-A",
];
const LSB04A_PLANO_CONCAVE = [
  { reference: "LC2679-A", f: "-30" },
  { reference: "LC1715-A", f: "-50" },
  { reference: "LC1582-A", f: "-75" },
  { reference: "LC1120-A", f: "-100" },
];
const LSB04A_BI_CONCAVE = [
  { reference: "LD2297-A", f: "-25" },
  { reference: "LD1464-A", f: "-50" },
  { reference: "LD1170-A", f: "-75" },
];

const LSB04A_CHILDREN: KitChild[] = [
  ...LSB04A_PLANO_CONVEX_FOCALS.map((f, i) => ({
    reference: LSB04A_PLANO_CONVEX_REFS[i],
    label: `Lente plano-convexa Ø1" f=${f}mm`,
  })),
  ...LSB04A_PLANO_CONVEX_FOCALS.map((f, i) => ({
    reference: LSB04A_BI_CONVEX_REFS[i],
    label: `Lente bi-convexa Ø1" f=${f}mm`,
  })),
  ...LSB04A_PLANO_CONCAVE.map((l) => ({
    reference: l.reference,
    label: `Lente plano-cóncava Ø1" f=${l.f}mm`,
  })),
  ...LSB04A_BI_CONCAVE.map((l) => ({
    reference: l.reference,
    label: `Lente bi-cóncava Ø1" f=${l.f}mm`,
  })),
];

const KITS: KitSpec[] = [
  {
    parentId: "8226dc67-e4c9-4a44-8f62-71067b1a04bd", // LSC01-A, 10 piezas
    parentName: "Kit de lentes plano-convexas de Thorlabs AR coating: 350-700 nm 10 piezas",
    children: LSC01A_CHILDREN,
  },
  {
    parentId: "15e26326-d684-4d4c-9fa5-a6e34e4c92b0", // LSB04-A, 35 piezas
    parentName: "N-kB7 plano/bi-Concave lens kit AR coating: 350-700 nm 35 piezas",
    children: LSB04A_CHILDREN,
  },
];

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN (no writes) ===\n" : "=== LIVE RUN ===\n");

  for (const kit of KITS) {
    const { data: parent, error: parentError } = await supabase
      .from("inventory_items")
      .select("id, name, location_id")
      .eq("id", kit.parentId)
      .single();

    if (parentError || !parent) {
      console.error(`✗ No se encontró el ítem padre ${kit.parentId} (${kit.parentName}):`, parentError?.message);
      continue;
    }

    if (parent.name !== kit.parentName) {
      console.warn(
        `  ! Aviso: el nombre en BD ("${parent.name}") no coincide exactamente con el esperado ("${kit.parentName}") — continúo igual, el id es la clave.`
      );
    }

    console.log(`\n${parent.name} (${kit.children.length} piezas esperadas)`);

    const { data: existingChildren, error: existingError } = await supabase
      .from("inventory_items")
      .select("reference")
      .eq("kit_parent_id", parent.id);

    if (existingError) {
      console.error(`  ✗ Error consultando piezas existentes:`, existingError.message);
      continue;
    }

    const existingRefs = new Set((existingChildren || []).map((c: any) => c.reference));

    let inserted = 0;
    let skipped = 0;

    for (const child of kit.children) {
      if (existingRefs.has(child.reference)) {
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`  [dry-run] insertaría ${child.reference} — ${child.label}`);
        inserted++;
        continue;
      }

      const { error: insertError } = await supabase.from("inventory_items").insert({
        location_id: parent.location_id,
        kit_parent_id: parent.id,
        reference: child.reference,
        name: child.label,
        category: "Lentes",
        quantity_total: 1,
      });

      if (insertError) {
        console.error(`  ✗ Error insertando ${child.reference}:`, insertError.message);
        continue;
      }
      inserted++;
    }

    console.log(`  Insertadas: ${inserted}, ya existían: ${skipped}`);
  }
}

main().catch((err) => {
  console.error("Script falló:", err);
  process.exit(1);
});
