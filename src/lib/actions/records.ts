"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  expenses,
  inwardLoads,
  materials,
  outwardLoads,
  parties,
  payments,
  salaryTxns,
  workers,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { usageCount } from "@/lib/queries";
import { audit } from "./util";

const TABLES = {
  expense: expenses,
  payment: payments,
  salary_txn: salaryTxns,
  inward_load: inwardLoads,
  outward_load: outwardLoads,
  party: parties,
  worker: workers,
  material: materials,
} as const;

export type RecordKind = keyof typeof TABLES;
type Row = Record<string, unknown> & { id: number };
/** Everything a delete removed, in insert order, so Undo can put it back exactly. */
export type Snapshot = { table: RecordKind; rows: Row[] }[];
export type DeleteResult = { ok: true; snapshot: Snapshot; note?: string } | { ok: false; error: string };

const LABEL: Record<RecordKind, string> = {
  expense: "expense",
  payment: "payment",
  salary_txn: "salary entry",
  inward_load: "load",
  outward_load: "load",
  party: "party",
  worker: "worker",
  material: "material",
};

export async function deleteRecord(kind: RecordKind, id: number): Promise<DeleteResult> {
  const user = await requireUser();

  // Parties, workers and materials with history must be archived instead, so khata and payroll stay intact.
  if (kind === "party" || kind === "worker" || kind === "material") {
    const used = await usageCount(kind, id);
    if (used > 0) return { ok: false, error: `This ${LABEL[kind]} has ${used} entries — archive it instead.` };
  }

  const snapshot: Snapshot = [];
  let note: string | undefined;

  if (kind === "inward_load" || kind === "outward_load") {
    const table = TABLES[kind];
    const [load] = await db.delete(table).where(eq(table.id, id)).returning();
    if (!load) return { ok: false, error: "Already deleted" };
    snapshot.push({ table: kind, rows: [load as Row] });
    // The "paid / received now" entry saved with the load goes with it.
    const ref = `${kind === "inward_load" ? "Inward" : "Outward"} #${id}`;
    const linked = await db
      .delete(payments)
      .where(and(eq(payments.partyId, load.partyId), eq(payments.reference, ref)))
      .returning();
    if (linked.length) {
      snapshot.push({ table: "payment", rows: linked as Row[] });
      note = "with its on-the-spot payment";
    }
  } else {
    const table = TABLES[kind];
    const [row] = await db.delete(table).where(eq(table.id, id)).returning();
    if (!row) return { ok: false, error: "Already deleted" };
    snapshot.push({ table: kind, rows: [row as Row] });
  }

  await audit(user.email, "delete", kind, id);
  revalidatePath("/", "layout");
  return { ok: true, snapshot, note };
}

export async function restoreRecord(snapshot: Snapshot) {
  const user = await requireUser();
  for (const { table, rows } of snapshot) {
    if (!rows.length) continue;
    const t = TABLES[table];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.insert(t).values(rows as any).onConflictDoNothing();
    await audit(user.email, "restore", table, rows[0].id);
  }
  revalidatePath("/", "layout");
}

/** Archive hides a party / worker / material from pickers and default lists; history stays. */
export async function setArchived(kind: "party" | "worker" | "material", id: number, archived: boolean) {
  const user = await requireUser();
  if (kind === "worker") await db.update(workers).set({ active: !archived }).where(eq(workers.id, id));
  else if (kind === "party") await db.update(parties).set({ archived }).where(eq(parties.id, id));
  else await db.update(materials).set({ archived }).where(eq(materials.id, id));
  await audit(user.email, archived ? "archive" : "restore", kind, id);
  revalidatePath("/", "layout");
}
