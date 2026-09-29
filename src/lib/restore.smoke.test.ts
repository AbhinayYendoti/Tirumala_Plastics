import { expect, it } from "vitest";
import { eq } from "drizzle-orm";

it("delete → restore round-trips a party row", async () => {
  const { db } = await import("@/db");
  const { parties } = await import("@/db/schema");
  const [created] = await db.insert(parties).values({ name: "zz restore probe" }).returning();
  const [deleted] = await db.delete(parties).where(eq(parties.id, created.id)).returning();
  // Simulate the trip through the client (Dates survive React's action serialization).
  const row = { ...deleted };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.insert(parties).values([row] as any).onConflictDoNothing();
  } catch (e) {
    console.log("RESTORE ERROR:", e);
    throw e;
  }
  const [back] = await db.select().from(parties).where(eq(parties.id, created.id));
  expect(back?.name).toBe("zz restore probe");
  await db.delete(parties).where(eq(parties.id, created.id));
}, 60000);
