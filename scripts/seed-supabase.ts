import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
try {
  process.loadEnvFile(".env.local");
} catch {}
async function seed() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local.",
    );
  const db = createClient(url, key);
  const { error } = await db.rpc("import_school_data", {
    payload: JSON.parse(readFileSync("data/seed/school-data.json", "utf8")),
  });
  if (error) throw error;
  console.log("Seed importado para Supabase.");
}
seed().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
