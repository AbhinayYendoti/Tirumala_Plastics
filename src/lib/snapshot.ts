// Pure helpers for Undo snapshots (no DB access, so they are unit-testable).

export const RECORD_KINDS = ["expense", "payment", "salary_txn", "inward_load", "outward_load", "party", "worker", "material"] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];
export type SnapshotRow = Record<string, unknown> & { id: number };
/** Everything a delete removed, in insert order, so Undo can put it back exactly. */
export type Snapshot = { table: RecordKind; rows: SnapshotRow[] }[];
export type DeleteResult = { ok: true; snapshot: Snapshot; note?: string } | { ok: false; error: string };

const isKind = (k: unknown): k is RecordKind => RECORD_KINDS.includes(k as RecordKind);

/** Timestamps arrive as ISO strings after a JSON round trip; the DB layer needs Dates. */
function revive(row: SnapshotRow): SnapshotRow {
  const out: SnapshotRow = { ...row };
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith("At") && typeof value === "string") out[key] = new Date(value);
  }
  return out;
}

export function parseSnapshot(input: unknown): Snapshot | null {
  if (!Array.isArray(input)) return null;
  const snapshot: Snapshot = [];
  for (const part of input) {
    if (!part || !isKind(part.table) || !Array.isArray(part.rows)) return null;
    const rows = part.rows.filter((r: unknown): r is SnapshotRow => !!r && typeof (r as SnapshotRow).id === "number");
    snapshot.push({ table: part.table, rows: rows.map(revive) });
  }
  return snapshot;
}
