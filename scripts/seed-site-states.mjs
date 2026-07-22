/**
 * Temporary one-off seed: backfill `state` from the first 2 letters of `title`.
 *
 * Usage (from project root):
 *   node --env-file=.env.local scripts/seed-site-states.mjs
 *
 * Equivalent SQL:
 *   UPDATE public.cards
 *   SET state = UPPER(LEFT(COALESCE(NULLIF(TRIM(title), ''), id), 2))
 *   WHERE state IS NULL OR state = '';
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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data: cards, error: fetchError } = await supabase
    .from("cards")
    .select("id, title, state");

  if (fetchError) {
    console.error("Failed to fetch cards:", fetchError.message);
    process.exit(1);
  }

  let updated = 0;
  for (const card of cards ?? []) {
    const source = (card.title || card.id || "").trim();
    const nextState = source.substring(0, 2).toUpperCase();
    if (!nextState || card.state === nextState) continue;

    const { error } = await supabase
      .from("cards")
      .update({ state: nextState })
      .eq("id", card.id);

    if (error) {
      console.error(`Failed updating ${card.id}:`, error.message);
      process.exit(1);
    }

    console.log(`  ${card.id} → ${nextState}`);
    updated += 1;
  }

  console.log(`Done. Updated ${updated} card(s).`);
}

main();
