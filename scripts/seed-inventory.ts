/**
 * Seed script for inventory from Excel file
 *
 * This script reads "Inventario equipo Rafael.xlsx" and populates the database.
 * It respects the side-by-side sub-table layout in both sheets.
 *
 * Run locally only: npx tsx scripts/seed-inventory.ts
 * NEVER include this in CI/CD or expose the service_role key.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Read Excel file using exceljs
import ExcelJS from "exceljs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Check .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface InventoryItem {
  type: "cajon" | "armario";
  number: number;
  reference: string | null;
  name: string;
  description: string | null;
  quantity: number;
}

async function parseExcel(): Promise<InventoryItem[]> {
  const filePath = path.join(
    process.cwd(),
    "Inventario equipo Rafael.xlsx"
  );

  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel file not found at ${filePath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const items: InventoryItem[] = [];

  // Process "Cajones" sheet
  const cajonesSheet = workbook.getWorksheet("Cajones");
  if (cajonesSheet) {
    console.log("Processing Cajones sheet...");
    const cajonItems = parseCajonesSheet(cajonesSheet);
    items.push(...cajonItems);
  }

  // Process "Armarios" sheet
  const armariosSheet = workbook.getWorksheet("Armarios");
  if (armariosSheet) {
    console.log("Processing Armarios sheet...");
    const armarioItems = parseArmariosSheet(armariosSheet);
    items.push(...armarioItems);
  }

  return items;
}

/**
 * Parse Cajones sheet: 3 sub-tables side-by-side (Cajón #1, #2, #3)
 * Expected layout: each sub-table has Cantidad, Referencia, Descripción
 */
function parseCajonesSheet(sheet: ExcelJS.Worksheet): InventoryItem[] {
  const items: InventoryItem[] = [];

  // Cajones layout: columns are organized as:
  // Cajón #1: C:E (Cantidad, Referencia, Descripción)
  // Cajón #2: F:H
  // Cajón #3: I:K
  // Data starts at row 2 (row 1 is headers)

  const cajonesConfig = [
    { number: 1, cantidadCol: "C", refCol: "D", descCol: "E" },
    { number: 2, cantidadCol: "F", refCol: "G", descCol: "H" },
    { number: 3, cantidadCol: "I", refCol: "J", descCol: "K" },
  ];

  // Iterate through rows starting from row 2
  for (let rowNum = 2; rowNum <= 40; rowNum++) {
    for (const config of cajonesConfig) {
      const cantidadCell = sheet.getCell(`${config.cantidadCol}${rowNum}`);
      const refCell = sheet.getCell(`${config.refCol}${rowNum}`);
      const descCell = sheet.getCell(`${config.descCol}${rowNum}`);

      const cantidad = cantidadCell.value as number | null;
      const ref = (refCell.value as string) || null;
      const desc = (descCell.value as string) || null;

      // Only add if cantidad is not null/empty
      if (cantidad && cantidad > 0) {
        items.push({
          type: "cajon",
          number: config.number,
          reference: ref && ref.trim() ? ref : null,
          name: desc || `Ítem en Cajón #${config.number}`,
          description: null,
          quantity: cantidad,
        });
      }
    }
  }

  return items;
}

/**
 * Parse Armarios sheet: 4 sub-tables side-by-side (Armario #1-4)
 * Expected layout: each sub-table has Cantidad, Referencia, Descripción
 */
function parseArmariosSheet(sheet: ExcelJS.Worksheet): InventoryItem[] {
  const items: InventoryItem[] = [];

  // Armarios layout: columns are organized as:
  // Armario #1: B:D (Cantidad, Referencia, Descripción)
  // Armario #2: E:G
  // Armario #3: H:J
  // Armario #4: K:M
  // Data starts at row 3 (rows 1-2 have headers)

  const armariosConfig = [
    { number: 1, cantidadCol: "B", refCol: "C", descCol: "D" },
    { number: 2, cantidadCol: "E", refCol: "F", descCol: "G" },
    { number: 3, cantidadCol: "H", refCol: "I", descCol: "J" },
    { number: 4, cantidadCol: "K", refCol: "L", descCol: "M" },
  ];

  // Iterate through rows starting from row 3
  for (let rowNum = 3; rowNum <= 155; rowNum++) {
    for (const config of armariosConfig) {
      const cantidadCell = sheet.getCell(`${config.cantidadCol}${rowNum}`);
      const refCell = sheet.getCell(`${config.refCol}${rowNum}`);
      const descCell = sheet.getCell(`${config.descCol}${rowNum}`);

      const cantidad = cantidadCell.value as number | null;
      const ref = (refCell.value as string) || null;
      const desc = (descCell.value as string) || null;

      // Only add if cantidad is not null/empty
      if (cantidad && cantidad > 0) {
        items.push({
          type: "armario",
          number: config.number,
          reference: ref && ref.trim() ? ref : null,
          name: desc || `Ítem en Armario #${config.number}`,
          description: null,
          quantity: cantidad,
        });
      }
    }
  }

  return items;
}

async function seedDatabase(items: InventoryItem[]) {
  console.log(`Seeding ${items.length} inventory items...`);

  // Create locations first
  const locations: Array<{ type: "cajon" | "armario"; number: number }> = [];
  const locationMap = new Map<string, string>(); // key: "cajon_1", value: uuid

  for (const item of items) {
    const key = `${item.type}_${item.number}`;
    if (!locationMap.has(key)) {
      locations.push({ type: item.type, number: item.number });
    }
  }

  // Remove duplicates
  const uniqueLocations = [
    ...new Map(locations.map((l) => [`${l.type}_${l.number}`, l])).values(),
  ];

  // Insert locations
  for (const location of uniqueLocations) {
    const label =
      location.type === "cajon"
        ? `Cajón #${location.number}`
        : `Armario #${location.number}`;

    const { data, error } = await supabase
      .from("locations")
      .upsert({
        type: location.type,
        number: location.number,
        label,
      })
      .select("id");

    if (error) {
      console.error(`Error creating location ${label}:`, error);
      continue;
    }

    if (data && data[0]) {
      locationMap.set(`${location.type}_${location.number}`, data[0].id);
    }
  }

  // Insert inventory items
  let successCount = 0;
  let errorCount = 0;

  for (const item of items) {
    const locationId = locationMap.get(`${item.type}_${item.number}`);
    if (!locationId) {
      console.error(
        `Location not found for ${item.type} ${item.number}: ${item.name}`
      );
      errorCount++;
      continue;
    }

    const { error } = await supabase
      .from("inventory_items")
      .insert({
        location_id: locationId,
        reference: item.reference,
        name: item.name.slice(0, 255), // Limit name length
        description: item.description,
        quantity_total: item.quantity,
      });

    if (error) {
      console.error(`Error inserting item ${item.name}:`, error);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`\nSeeding complete!`);
  console.log(`✓ ${successCount} items inserted`);
  if (errorCount > 0) {
    console.log(`✗ ${errorCount} items failed`);
  }
}

async function main() {
  try {
    console.log("Starting inventory seed from Excel...\n");
    const items = await parseExcel();
    console.log(`Parsed ${items.length} items from Excel\n`);

    await seedDatabase(items);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

main();
