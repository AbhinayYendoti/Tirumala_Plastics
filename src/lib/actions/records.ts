"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { attendance, materials, parties, payments, salaryTxns, workers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { usageCount } from "@/lib/queries";
import { RECORD_TABLES } from "@/lib/records";
import type { DeleteResult, RecordKind, Snapshot, SnapshotRow } from "@/lib/snapshot";
import { audit } from "./util";

// A "use server" file may only export async functions (Turbopack rejects even type re-exports),
// so the shared types live in @/lib/snapshot.
const TABLES = RECORD_TABLES;
type Row = SnapshotRow;

const LABEL: Record<RecordKind, string> = {
  expense: "expense",
  payment: "payment",
  salary_txn: "salary entry",
  attendance: "attendance mark",
  inward_load: "load",
  outward_load: "load",
  party: "party",
  worker: "worker",
  material: "material",
};

export async function deleteRecord(kind: RecordKind, id: number): Promise<DeleteResult> {
  const user = await requireUser();

  // Parties and materials with history must be archived instead, so the khata stays intact.
  // A worker can always be deleted: their salary and attendance entries go with them (Undo brings all back).
  if (kind === "party" || kind === "material") {
    const used = await usageCount(kind, id);
    if (used > 0) return { ok: false, error: `This ${LABEL[kind]} has ${used} entries — archive it instead.` };
  }

  const snapshot: Snapshot = [];
  let note: string | undefined;

  if (kind === "inward_load" || kind === "outward_load") {
    const table = TABLES[kind];
    const linkColumn = kind === "inward_load" ? payments.inwardLoadId : payments.outwardLoadId;
    // Keep a copy of the load's on-the-spot payment for Undo. The database removes it
    // together with the load (ON DELETE CASCADE), in the same statement.
    const linked = await db.select().from(payments).where(eq(linkColumn, id));
    const [load] = await db.delete(table).where(eq(table.id, id)).returning();
    if (!load) return { ok: false, error: "Already deleted" };
    snapshot.push({ table: kind, rows: [load as Row] });
    if (linked.length) {
      snapshot.push({ table: "payment", rows: linked as Row[] });
      note = "with its on-the-spot payment";
    }
  } else if (kind === "worker") {
    const [txns, marks] = await Promise.all([
      db.select().from(salaryTxns).where(eq(salaryTxns.workerId, id)),
      db.select().from(attendance).where(eq(attendance.workerId, id)),
    ]);
    // One batch = one transaction: the worker and their history go together or not at all.
    const [, , removed] = await db.batch([
      db.delete(attendance).where(eq(attendance.workerId, id)),
      db.delete(salaryTxns).where(eq(salaryTxns.workerId, id)),
      db.delete(workers).where(eq(workers.id, id)).returning(),
    ]);
    const [worker] = removed;
    if (!worker) return { ok: false, error: "Already deleted" };
    // Insert order for Undo: the worker first, then what refers to it.
    snapshot.push({ table: "worker", rows: [worker as Row] });
    if (txns.length) snapshot.push({ table: "salary_txn", rows: txns as Row[] });
    if (marks.length) snapshot.push({ table: "attendance", rows: marks as Row[] });
    const parts = [
      txns.length && `${txns.length} salary ${txns.length === 1 ? "entry" : "entries"}`,
      marks.length && `${marks.length} attendance ${marks.length === 1 ? "day" : "days"}`,
    ].filter(Boolean);
    if (parts.length) note = `with ${parts.join(" and ")}`;
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

/** Archive hides a party / worker / material from pickers and default lists; history stays. */
export async function setArchived(kind: "party" | "worker" | "material", id: number, archived: boolean) {
  const user = await requireUser();
  if (kind === "worker") await db.update(workers).set({ active: !archived }).where(eq(workers.id, id));
  else if (kind === "party") await db.update(parties).set({ archived }).where(eq(parties.id, id));
  else await db.update(materials).set({ archived }).where(eq(materials.id, id));
  await audit(user.email, archived ? "archive" : "restore", kind, id);
  revalidatePath("/", "layout");
}
