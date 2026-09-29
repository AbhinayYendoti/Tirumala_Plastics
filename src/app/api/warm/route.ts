import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Wakes the Neon database (free plan sleeps after 5 idle minutes).
 * Called in the background from the sign-in screen and when the app comes back
 * into view, so the ~1s wake-up happens while the user is still typing / looking.
 * Public on purpose: it runs `select 1` and returns nothing.
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
  } catch {
    // A failed warm-up is harmless; the real request will retry the connection.
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
