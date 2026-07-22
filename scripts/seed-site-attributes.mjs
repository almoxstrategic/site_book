/**
 * Temporary one-off seed: set `attribute` on specific cards.
 *
 * Usage (from project root, with .env.local loaded or env vars set):
 *   node --env-file=.env.local scripts/seed-site-attributes.mjs
 *
 * Safe to delete after the data has been applied.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
  process.exit(1);
}

const UPDATES = [
  {
    attribute: "ROOFTOP - Serv. Próprio",
    ids: [
      "SPCAN001C - SMVMRB9",
      "SPCVD001C_SMCVEH3",
      "SPSMT004C_SPUE2",
      "TOPIU001C - TOPUM03",
    ],
  },
  {
    attribute: "Torre - Serv. Próprio",
    ids: ["BAALG001C - BAALG29", "BACNR001C_BACNR04"],
  },
];

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  for (const { attribute, ids } of UPDATES) {
    const { data, error } = await supabase
      .from("cards")
      .update({ attribute })
      .in("id", ids)
      .select("id, attribute");

    if (error) {
      console.error(`Failed updating → ${attribute}:`, error.message);
      process.exit(1);
    }

    console.log(`Updated ${data?.length ?? 0} card(s) → ${attribute}`);
    for (const row of data ?? []) {
      console.log(`  - ${row.id}`);
    }
  }

  console.log("Done.");
}

main();
