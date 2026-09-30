import { db } from "@/db";
import {
  attendance,
  expenses,
  inwardLoads,
  materials,
  outwardLoads,
  parties,
  payments,
  salaryTxns,
  workers,
} from "@/db/schema";
import type { Snapshot } from "./snapshot";

export type { RecordKind, Snapshot, SnapshotRow } from "./snapshot";
export { parseSnapshot } from "./snapshot";

export const RECORD_TABLES = {
  expense: expenses,
  payment: payments,
  salary_txn: salaryTxns,
  attendance,
  inward_load: inwardLoads,
  outward_load: outwardLoads,
  party: parties,
  worker: workers,
  material: materials,
} as const;

/**
 * Re-inserts rows with their original ids, all in one transaction (a load and its payment
 * come back together or not at all). Rows that already exist are left alone.
 */
export async function insertSnapshot(snapshot: Snapshot) {
  const inserts = snapshot
    .filter(({ rows }) => rows.length > 0)
    .map(({ table, rows }) =>
      db
        .insert(RECORD_TABLES[table])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .values(rows as any)
        .onConflictDoNothing()
        .returning({ id: RECORD_TABLES[table].id }),
    );
  if (!inserts.length) return 0;
  const results = await db.batch(inserts as [(typeof inserts)[number], ...(typeof inserts)[number][]]);
  return results.reduce((n, r) => n + r.length, 0);
}
