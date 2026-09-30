import { and, asc, desc, eq, gte, lte, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  type AttendanceStatus,
  attendance,
  type Expense,
  expenses,
  inwardLoads,
  materials,
  outwardLoads,
  parties,
  payments,
  salaryTxns,
  workers,
} from "@/db/schema";
import {
  type AttendanceCounts,
  INVOICE_PREFIX,
  financialYear,
  monthEarnings,
  nextInvoiceNo,
  partyBalance,
  salaryBalance,
} from "@/lib/calc";
import { monthRange } from "@/lib/format";

export type LoadKind = "inward" | "outward";
export type Range = { from: string; to: string };

const sumOf = (col: AnyColumn) => sql<number>`coalesce(sum(${col}), 0)`.mapWith(Number);
const countAll = () => sql<number>`count(*)`.mapWith(Number);
const paidSum = sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.direction} = 'paid'), 0)`.mapWith(Number);
const receivedSum = sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.direction} = 'received'), 0)`.mapWith(Number);
const loadTable = (kind: LoadKind) => (kind === "inward" ? inwardLoads : outwardLoads);

// ---------- Lookups ----------

/** Pickers show only active records; pass `true` to include archived ones. */
export const getParties = (includeArchived = false) =>
  db
    .select()
    .from(parties)
    .where(includeArchived ? undefined : eq(parties.archived, false))
    .orderBy(asc(parties.name));
export const getMaterials = (includeArchived = false) =>
  db
    .select()
    .from(materials)
    .where(includeArchived ? undefined : eq(materials.archived, false))
    .orderBy(asc(materials.name));

/** How many entries point at a party / worker / material (decides delete vs archive). */
export async function usageCount(kind: "party" | "worker" | "material", id: number) {
  const q =
    kind === "party"
      ? sql`select (select count(*) from ${inwardLoads} where party_id = ${id})
              + (select count(*) from ${outwardLoads} where party_id = ${id})
              + (select count(*) from ${payments} where party_id = ${id}) as n`
      : kind === "worker"
        ? sql`select (select count(*) from ${salaryTxns} where worker_id = ${id})
                + (select count(*) from ${attendance} where worker_id = ${id}) as n`
        : sql`select (select count(*) from ${inwardLoads} where material_id = ${id})
                + (select count(*) from ${outwardLoads} where material_id = ${id}) as n`;
  const res = await db.execute<{ n: string }>(q);
  return Number(res.rows[0].n);
}

export async function materialsWithUsage() {
  const res = await db.execute<{
    id: number; name: string; hsn: string | null; default_rate: string | null; archived: boolean; in_kg: string; out_kg: string; uses: string;
  }>(sql`
    select m.id, m.name, m.hsn, m.default_rate, m.archived,
      coalesce((select sum(billable_kg) from ${inwardLoads} i where i.material_id = m.id), 0) in_kg,
      coalesce((select sum(billable_kg) from ${outwardLoads} o where o.material_id = m.id), 0) out_kg,
      (select count(*) from ${inwardLoads} i where i.material_id = m.id)
        + (select count(*) from ${outwardLoads} o where o.material_id = m.id) uses
    from ${materials} m order by m.archived, m.name`);
  return res.rows.map((r) => ({
    id: r.id,
    name: r.name,
    hsn: r.hsn,
    defaultRate: r.default_rate == null ? null : Number(r.default_rate),
    archived: r.archived,
    inKg: Number(r.in_kg),
    outKg: Number(r.out_kg),
    uses: Number(r.uses),
  }));
}

/** Last rate used per material, so the form can pre-fill it. */
export async function lastRates(kind: LoadKind) {
  const t = loadTable(kind);
  const rows = await db
    .selectDistinctOn([t.materialId], { materialId: t.materialId, rate: t.rate })
    .from(t)
    .orderBy(t.materialId, desc(t.date), desc(t.id));
  return Object.fromEntries(rows.map((r) => [r.materialId, r.rate])) as Record<number, number>;
}

/** Most recent load, used to pre-select the material on a new entry. */
export async function lastLoad(kind: LoadKind) {
  const t = loadTable(kind);
  const [row] = await db.select({ partyId: t.partyId, materialId: t.materialId }).from(t).orderBy(desc(t.id)).limit(1);
  return row ?? null;
}

/** Suggested invoice number for a new outward load, continuing this financial year's series. */
export async function suggestInvoiceNo(isoDate: string) {
  const prefix = `${INVOICE_PREFIX}/${financialYear(isoDate)}/`;
  const rows = await db
    .select({ no: outwardLoads.invoiceNo })
    .from(outwardLoads)
    .where(sql`${outwardLoads.invoiceNo} like ${prefix + "%"}`);
  return nextInvoiceNo(
    rows.map((r) => r.no),
    isoDate,
  );
}

export async function recentVehicles() {
  const res = await db.execute<{ vehicle_no: string }>(sql`
    select vehicle_no from (
      select vehicle_no, max(date) as d from (
        select vehicle_no, date from ${inwardLoads}
        union all
        select vehicle_no, date from ${outwardLoads}
      ) x where vehicle_no is not null group by vehicle_no
    ) y order by d desc limit 30`);
  return res.rows.map((r) => r.vehicle_no);
}

// ---------- Loads ----------

export async function listLoads(kind: LoadKind, range: Range) {
  const t = loadTable(kind);
  const extra =
    kind === "outward"
      ? { total: outwardLoads.total, docNo: outwardLoads.invoiceNo }
      : { total: inwardLoads.amount, docNo: inwardLoads.billNo };
  return db
    .select({
      id: t.id,
      date: t.date,
      vehicleNo: t.vehicleNo,
      netKg: t.netKg,
      billableKg: t.billableKg,
      rate: t.rate,
      amount: t.amount,
      partyId: t.partyId,
      partyName: parties.name,
      materialName: materials.name,
      ...extra,
    })
    .from(t)
    .innerJoin(parties, eq(parties.id, t.partyId))
    .innerJoin(materials, eq(materials.id, t.materialId))
    .where(and(gte(t.date, range.from), lte(t.date, range.to)))
    .orderBy(desc(t.date), desc(t.id));
}

export async function getInward(id: number) {
  const [row] = await db
    .select({ load: inwardLoads, party: parties, material: materials })
    .from(inwardLoads)
    .innerJoin(parties, eq(parties.id, inwardLoads.partyId))
    .innerJoin(materials, eq(materials.id, inwardLoads.materialId))
    .where(eq(inwardLoads.id, id));
  return row;
}

export async function getOutward(id: number) {
  const [row] = await db
    .select({ load: outwardLoads, party: parties, material: materials })
    .from(outwardLoads)
    .innerJoin(parties, eq(parties.id, outwardLoads.partyId))
    .innerJoin(materials, eq(materials.id, outwardLoads.materialId))
    .where(eq(outwardLoads.id, id));
  return row;
}

// ---------- Parties & khata ----------

/** One round trip: every party with its purchase, sale and payment totals. */
export async function partyBalances(includeArchived = false) {
  const inw = db
    .select({ pid: inwardLoads.partyId, v: sumOf(inwardLoads.amount).as("inw_v") })
    .from(inwardLoads)
    .groupBy(inwardLoads.partyId)
    .as("inw");
  const outw = db
    .select({ pid: outwardLoads.partyId, v: sumOf(outwardLoads.total).as("out_v") })
    .from(outwardLoads)
    .groupBy(outwardLoads.partyId)
    .as("outw");
  const pays = db
    .select({ pid: payments.partyId, paid: paidSum.as("paid"), received: receivedSum.as("received") })
    .from(payments)
    .groupBy(payments.partyId)
    .as("pays");
  const orZero = (col: AnyColumn | SQL.Aliased) => sql<number>`coalesce(${col}, 0)`.mapWith(Number);

  const rows = await db
    .select({
      party: parties,
      inwardAmount: orZero(inw.v),
      outwardTotal: orZero(outw.v),
      paid: orZero(pays.paid),
      received: orZero(pays.received),
    })
    .from(parties)
    .leftJoin(inw, eq(inw.pid, parties.id))
    .leftJoin(outw, eq(outw.pid, parties.id))
    .leftJoin(pays, eq(pays.pid, parties.id))
    .where(includeArchived ? undefined : eq(parties.archived, false))
    .orderBy(asc(parties.name));

  return rows.map(({ party, ...t }) => ({
    ...party,
    ...t,
    balance: partyBalance({ opening: party.openingBalance, ...t }),
  }));
}

export type LedgerRow = {
  key: string;
  date: string;
  kind: "inward" | "outward" | "paid" | "received";
  label: string;
  href?: string;
  payment?: typeof payments.$inferSelect;
  debit: number; // increases what we owe them
  credit: number; // decreases what we owe them
  balance: number;
};

export async function partyLedger(partyId: number) {
  const [[party], inw, outw, pays] = await Promise.all([
    db.select().from(parties).where(eq(parties.id, partyId)),
    db
      .select({ id: inwardLoads.id, date: inwardLoads.date, kg: inwardLoads.billableKg, amount: inwardLoads.amount, m: materials.name })
      .from(inwardLoads)
      .innerJoin(materials, eq(materials.id, inwardLoads.materialId))
      .where(eq(inwardLoads.partyId, partyId)),
    db
      .select({ id: outwardLoads.id, date: outwardLoads.date, kg: outwardLoads.billableKg, amount: outwardLoads.total, m: materials.name })
      .from(outwardLoads)
      .innerJoin(materials, eq(materials.id, outwardLoads.materialId))
      .where(eq(outwardLoads.partyId, partyId)),
    db.select().from(payments).where(eq(payments.partyId, partyId)),
  ]);
  if (!party) return null;

  const rows: Omit<LedgerRow, "balance">[] = [
    ...inw.map((r) => ({
      key: `i${r.id}`,
      date: r.date,
      kind: "inward" as const,
      label: `Bought ${r.m} · ${r.kg} kg`,
      href: `/inward/${r.id}`,
      debit: r.amount,
      credit: 0,
    })),
    ...outw.map((r) => ({
      key: `o${r.id}`,
      date: r.date,
      kind: "outward" as const,
      label: `Sold ${r.m} · ${r.kg} kg`,
      href: `/outward/${r.id}`,
      debit: 0,
      credit: r.amount,
    })),
    ...pays.map((p) => ({
      key: `p${p.id}`,
      date: p.date,
      kind: p.direction,
      payment: p,
      label: `${p.direction === "paid" ? "Paid" : "Received"} · ${p.mode.toUpperCase()}${p.reference ? ` · ${p.reference}` : ""}`,
      debit: p.direction === "received" ? p.amount : 0,
      credit: p.direction === "paid" ? p.amount : 0,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key));

  let running = party.openingBalance;
  const ledger: LedgerRow[] = rows.map((r) => {
    running = Math.round((running + r.debit - r.credit) * 100) / 100;
    return { ...r, balance: running };
  });
  return { party, ledger: ledger.reverse(), balance: running };
}

export async function listPayments(range: Range) {
  return db
    .select({ payment: payments, partyName: parties.name })
    .from(payments)
    .innerJoin(parties, eq(parties.id, payments.partyId))
    .where(and(gte(payments.date, range.from), lte(payments.date, range.to)))
    .orderBy(desc(payments.date), desc(payments.id));
}

// ---------- Expenses ----------

export async function listExpenses(range: Range) {
  return db
    .select()
    .from(expenses)
    .where(and(gte(expenses.date, range.from), lte(expenses.date, range.to)))
    .orderBy(desc(expenses.date), desc(expenses.id));
}

export async function expenseTotals(range: Range) {
  return db
    .select({
      category: expenses.category,
      amount: sumOf(expenses.amount),
      quantity: sumOf(expenses.quantity),
      count: countAll(),
    })
    .from(expenses)
    .where(and(gte(expenses.date, range.from), lte(expenses.date, range.to)))
    .groupBy(expenses.category);
}

// ---------- Workers ----------

type WorkerLike = { id: number; payBasis: "monthly" | "daily"; monthlySalary: number; dailyWage: number | null };

/** Attendance totals per worker for a month. */
async function attendanceCounts(month: string, workerId?: number) {
  const { start, end } = monthRange(month);
  const rows = await db
    .select({ workerId: attendance.workerId, status: attendance.status, n: countAll() })
    .from(attendance)
    .where(
      and(
        gte(attendance.date, start),
        lte(attendance.date, end),
        workerId ? eq(attendance.workerId, workerId) : undefined,
      ),
    )
    .groupBy(attendance.workerId, attendance.status);
  const byWorker = new Map<number, AttendanceCounts>();
  for (const r of rows) {
    const c = byWorker.get(r.workerId) ?? { present: 0, half: 0, absent: 0 };
    c[r.status] = r.n;
    byWorker.set(r.workerId, c);
  }
  return byWorker;
}

/** Earned (from attendance), given and balance for one worker in one month. */
export function payFor(
  w: WorkerLike,
  month: string,
  counts: AttendanceCounts | undefined,
  txns: { advances: number; salaryPaid: number; bonus: number },
) {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const c = counts ?? { present: 0, half: 0, absent: 0 };
  const pay = monthEarnings({ ...w, daysInMonth, counts: c });
  return {
    counts: c,
    ...pay,
    ...txns,
    balance: salaryBalance({ monthlySalary: pay.earned, advances: txns.advances, salaryPaid: txns.salaryPaid }),
  };
}

export async function workersForMonth(month: string, includeInactive = false) {
  const [list, txns, counts] = await Promise.all([
    db
      .select()
      .from(workers)
      .where(includeInactive ? undefined : eq(workers.active, true))
      .orderBy(asc(workers.name)),
    db
      .select({ workerId: salaryTxns.workerId, type: salaryTxns.type, amount: sumOf(salaryTxns.amount) })
      .from(salaryTxns)
      .where(eq(salaryTxns.month, month))
      .groupBy(salaryTxns.workerId, salaryTxns.type),
    attendanceCounts(month),
  ]);
  return list.map((w) => {
    const get = (t: string) => txns.find((x) => x.workerId === w.id && x.type === t)?.amount ?? 0;
    return {
      ...w,
      ...payFor(w, month, counts.get(w.id), { advances: get("advance"), salaryPaid: get("salary"), bonus: get("bonus") }),
    };
  });
}

export async function workerDetail(id: number, month: string) {
  const { start, end } = monthRange(month);
  const [[worker], txns, marks, [{ marked }]] = await Promise.all([
    db.select().from(workers).where(eq(workers.id, id)),
    db
      .select()
      .from(salaryTxns)
      .where(eq(salaryTxns.workerId, id))
      .orderBy(desc(salaryTxns.date), desc(salaryTxns.id))
      .limit(200),
    db
      .select({ date: attendance.date, status: attendance.status })
      .from(attendance)
      .where(and(eq(attendance.workerId, id), gte(attendance.date, start), lte(attendance.date, end))),
    db.select({ marked: countAll() }).from(attendance).where(eq(attendance.workerId, id)),
  ]);
  if (!worker) return null;
  const counts: AttendanceCounts = { present: 0, half: 0, absent: 0 };
  for (const m of marks) counts[m.status]++;
  const monthTxns = txns.filter((t) => t.month === month);
  const sum = (type: string) => monthTxns.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
  const pay = payFor(worker, month, counts, {
    advances: sum("advance"),
    salaryPaid: sum("salary"),
    bonus: sum("bonus"),
  });
  const days: Record<string, AttendanceStatus> = Object.fromEntries(marks.map((m) => [m.date, m.status]));
  return { worker, txns, pay, days, attendanceMarked: marked };
}

/** The day's sheet: every working worker (who had joined by then) and their mark, if any. */
export async function attendanceForDate(date: string) {
  const [list, marks] = await Promise.all([
    db.select().from(workers).where(eq(workers.active, true)).orderBy(asc(workers.name)),
    db.select({ workerId: attendance.workerId, status: attendance.status }).from(attendance).where(eq(attendance.date, date)),
  ]);
  const byWorker = new Map(marks.map((m) => [m.workerId, m.status]));
  return list
    .filter((w) => !w.joinDate || w.joinDate <= date)
    .map((w) => ({ ...w, status: byWorker.get(w.id) ?? null }));
}

// ---------- Dashboard / reports ----------

type SummaryRow = {
  in_kg: string; in_amount: string; in_count: string;
  out_kg: string; out_amount: string; out_taxable: string; out_count: string;
  cgst: string; sgst: string; igst: string;
  salaries: string; paid: string; received: string;
  expenses: { category: Expense["category"]; amount: number; quantity: number; count: number }[] | null;
};

/** All totals for a period in a single round trip. */
export async function periodSummary(range: Range) {
  const { from, to } = range;
  const res = await db.execute<SummaryRow>(sql`
    with
      i as (select coalesce(sum(billable_kg), 0) kg, coalesce(sum(amount), 0) amount, count(*) n
            from ${inwardLoads} where date between ${from} and ${to}),
      o as (select coalesce(sum(billable_kg), 0) kg, coalesce(sum(total), 0) amount, coalesce(sum(amount), 0) taxable,
                   count(*) n, coalesce(sum(cgst), 0) cgst, coalesce(sum(sgst), 0) sgst, coalesce(sum(igst), 0) igst
            from ${outwardLoads} where date between ${from} and ${to}),
      s as (select coalesce(sum(amount), 0) amount from ${salaryTxns} where date between ${from} and ${to}),
      p as (select coalesce(sum(amount) filter (where direction = 'paid'), 0) paid,
                   coalesce(sum(amount) filter (where direction = 'received'), 0) received
            from ${payments} where date between ${from} and ${to}),
      e as (select json_agg(json_build_object('category', category, 'amount', amount, 'quantity', quantity, 'count', n)) list
            from (select category, sum(amount)::float8 amount, coalesce(sum(quantity), 0)::float8 quantity, count(*)::int n
                  from ${expenses} where date between ${from} and ${to} group by category) x)
    select i.kg in_kg, i.amount in_amount, i.n in_count,
           o.kg out_kg, o.amount out_amount, o.taxable out_taxable, o.n out_count, o.cgst, o.sgst, o.igst,
           s.amount salaries, p.paid, p.received, e.list expenses
    from i, o, s, p, e`);
  const r = res.rows[0];
  const n = Number;
  const exp = r.expenses ?? [];
  return {
    inward: { kg: n(r.in_kg), amount: n(r.in_amount), taxable: n(r.in_amount), count: n(r.in_count) },
    outward: { kg: n(r.out_kg), amount: n(r.out_amount), taxable: n(r.out_taxable), count: n(r.out_count) },
    expenses: exp,
    expenseTotal: exp.reduce((sum, x) => sum + x.amount, 0),
    salaries: n(r.salaries),
    paid: n(r.paid),
    received: n(r.received),
    gst: { cgst: n(r.cgst), sgst: n(r.sgst), igst: n(r.igst) },
  };
}

/** Counts that drive the first-run setup checklist. */
export async function setupStatus() {
  const res = await db.execute<{ parties: string; workers: string; inward: string; expenses: string }>(sql`
    select (select count(*) from ${parties}) parties, (select count(*) from ${workers}) workers,
           (select count(*) from ${inwardLoads}) inward, (select count(*) from ${expenses}) expenses`);
  const r = res.rows[0];
  return {
    parties: Number(r.parties) > 0,
    workers: Number(r.workers) > 0,
    inward: Number(r.inward) > 0,
    expenses: Number(r.expenses) > 0,
  };
}

/** Approximate yard stock per material: everything bought minus everything sold. */
export async function stockByMaterial() {
  const res = await db.execute<{ id: number; name: string; in_kg: string; out_kg: string }>(sql`
    select m.id, m.name,
      coalesce((select sum(i.billable_kg) from ${inwardLoads} i where i.material_id = m.id), 0) as in_kg,
      coalesce((select sum(o.billable_kg) from ${outwardLoads} o where o.material_id = m.id), 0) as out_kg
    from ${materials} m order by m.name`);
  return res.rows
    .map((r) => {
      const inKg = Number(r.in_kg);
      const outKg = Number(r.out_kg);
      return { id: r.id, name: r.name, inKg, outKg, stockKg: inKg - outKg };
    })
    .filter((r) => r.inKg > 0 || r.outKg > 0);
}

export async function dailySeries(range: Range) {
  const res = await db.execute<{ day: string; in_kg: string; out_kg: string }>(sql`
    select to_char(d, 'YYYY-MM-DD') as day,
      coalesce((select sum(i.billable_kg) from ${inwardLoads} i where i.date = d::date), 0) as in_kg,
      coalesce((select sum(o.billable_kg) from ${outwardLoads} o where o.date = d::date), 0) as out_kg
    from generate_series(${range.from}::date, ${range.to}::date, interval '1 day') as d
    order by d`);
  return res.rows.map((r) => ({ day: r.day, inKg: Number(r.in_kg), outKg: Number(r.out_kg) }));
}
