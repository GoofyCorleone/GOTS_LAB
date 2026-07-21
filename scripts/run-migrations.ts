import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabaseUrl = "https://vsaloslsautitcsqonlq.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWxvc2xzYXV0aXRjc3FvbmxxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDYzNTEyMSwiZXhwIjoyMTAwMjExMTIxfQ.bI9uEN2yF9skPLWh1IkCuo9q9odokkgosyLVCq6xGbc";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

async function runMigrations() {
  const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");

  const files = fs.readdirSync(migrationsDir).sort();
  console.log(`Found ${files.length} migration files\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    if (!file.endsWith(".sql")) continue;

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf-8");

    console.log(`Running ${file}...`);

    try {
      // Use the sql endpoint for raw SQL execution
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`  ❌ Error: ${error.message}`);
        failCount++;
      } else {
        console.log(`  ✅ Success`);
        successCount++;
      }
    } catch (err: any) {
      console.error(`  ❌ Exception: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n${successCount} succeeded, ${failCount} failed`);
}

runMigrations();
