import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

const pool = new Pool({
  user: "postgres",
  password: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWxvc2xzYXV0aXRjc3FvbmxxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDYzNTEyMSwiZXhwIjoyMTAwMjExMTIxfQ.bI9uEN2yF9skPLWh1IkCuo9q9odokkgosyLVCq6xGbc",
  host: "vsaloslsautitcsqonlq.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  ssl: "require",
});

async function applyMigrations() {
  const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");

  const files = fs.readdirSync(migrationsDir).sort();
  console.log(`Found ${files.length} migration files\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    if (!file.endsWith(".sql")) continue;

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf-8");

    console.log(`Applying ${file}...`);

    try {
      await pool.query(sql);
      console.log(`  ✅ Success\n`);
      successCount++;
    } catch (err: any) {
      console.error(`  ❌ Error: ${err.message}\n`);
      failCount++;
    }
  }

  console.log(`\n=== Migration Summary ===`);
  console.log(`✅ ${successCount} succeeded`);
  if (failCount > 0) console.log(`❌ ${failCount} failed`);

  await pool.end();
}

applyMigrations().catch(console.error);
