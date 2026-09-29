/**
 * End-to-end business flows against a real database.
 * Runs every server action and query the UI uses, with auth stubbed as a test user.
 * All data is tagged "E2E" and removed afterwards (set E2E_KEEP=1 to keep it for page checks,
 * then run again with E2E_CLEANUP_ONLY=1).
 *
 *   DATABASE_URL=... npm run test:e2e
 */
import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const EMAIL = "e2e@tirumala.test";
vi.mock("@/lib/auth", () => ({
  requireUser: async () => ({ id: "e2e", email: EMAIL, name: "E2E" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import { and, eq, inArray, like, sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { saveLoad } from "@/lib/actions/loads";
import { saveExpense, savePayment, saveSalaryTxn, saveWorker, updatePayment } from "@/lib/actions/money";
import { saveMaterial, saveParty } from "@/lib/actions/parties";
import { deleteRecord, setArchived } from "@/lib/actions/records";
import * as q from "@/lib/queries";
import { GET as exportCsv } from "@/app/api/export/[kind]/route";
import { POST as restoreApi } from "@/app/api/records/restore/route";

const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const MONTH = TODAY.slice(0, 7);
const RANGE = { from: `${MONTH}-01`, to: TODAY };

type Result = { error?: string; ok?: boolean; redirect?: string };
async function run(action: (prev: undefined, fd: FormData) => Promise<unknown>, fields: Record<string, string | number>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, String(v));
  try {
    return ((await action(undefined, fd)) ?? {}) as Result;
  } catch (e) {
    const url = (e as { url?: string }).url;
    if (url) return { redirect: url } as Result;
    throw e;
  }
}
const idFrom = (url: string | undefined, re: RegExp) => Number(url?.match(re)?.[1]);

async function cleanup() {
  const ps = await db.select({ id: s.parties.id }).from(s.parties).where(like(s.parties.name, "E2E %"));
  const pids = ps.map((p) => p.id);
  if (pids.length) {
    await db.delete(s.payments).where(inArray(s.payments.partyId, pids));
    await db.delete(s.inwardLoads).where(inArray(s.inwardLoads.partyId, pids));
    await db.delete(s.outwardLoads).where(inArray(s.outwardLoads.partyId, pids));
    await db.delete(s.parties).where(inArray(s.parties.id, pids));
  }
  const ws = await db.select({ id: s.workers.id }).from(s.workers).where(like(s.workers.name, "E2E %"));
  if (ws.length) {
    await db.delete(s.salaryTxns).where(inArray(s.salaryTxns.workerId, ws.map((w) => w.id)));
    await db.delete(s.workers).where(inArray(s.workers.id, ws.map((w) => w.id)));
  }
  await db.delete(s.expenses).where(eq(s.expenses.createdBy, EMAIL));
  await db.delete(s.materials).where(like(s.materials.name, "E2E %"));
  await db.delete(s.auditLog).where(eq(s.auditLog.userEmail, EMAIL));
}

const onlyCleanup = process.env.E2E_CLEANUP_ONLY === "1";
const ids: Record<string, number> = {};

beforeAll(async () => {
  await cleanup(); // start from a clean slate if a previous run was interrupted
}, 60000);

afterAll(async () => {
  if (process.env.E2E_IDS_FILE) writeFileSync(process.env.E2E_IDS_FILE, JSON.stringify(ids, null, 2));
  if (process.env.E2E_KEEP !== "1") await cleanup();
}, 60000);

// Vitest skips hooks when every test is skipped, so cleanup-only mode needs a test of its own.
it.runIf(onlyCleanup)("removes E2E data", cleanup, 60000);

describe.skipIf(onlyCleanup)("business flows", () => {
  it("parties: create supplier + in-state buyer + other-state buyer, validation, edit", async () => {
    const sup = await run(saveParty.bind(null, null), { name: "E2E Ravi Scrap", type: "supplier", phone: "9876543210", stateCode: "37", openingBalance: 5000 });
    ids.supplier = idFrom(sup.redirect, /parties\/(\d+)/);
    expect(ids.supplier).toBeGreaterThan(0);

    const buyer = await run(saveParty.bind(null, null), { name: "E2E Vizag Polymers", type: "buyer", gstin: "37abcde1234f1z5", stateCode: "37" });
    ids.buyer = idFrom(buyer.redirect, /parties\/(\d+)/);
    const [b] = await db.select().from(s.parties).where(eq(s.parties.id, ids.buyer));
    expect(b.gstin).toBe("37ABCDE1234F1Z5"); // upper-cased

    const far = await run(saveParty.bind(null, null), { name: "E2E Hyderabad Recyclers", type: "buyer", stateCode: "36" });
    ids.farBuyer = idFrom(far.redirect, /parties\/(\d+)/);

    expect((await run(saveParty.bind(null, null), { name: "", type: "buyer", stateCode: "37" })).error).toBeTruthy();
    expect((await run(saveParty.bind(null, null), { name: "E2E Bad", type: "buyer", stateCode: "AP" })).error).toMatch(/State code/);

    await run(saveParty.bind(null, ids.supplier), { name: "E2E Ravi Scrap Traders", type: "supplier", phone: "9876543210", stateCode: "37", openingBalance: 5000 });
    const [sp] = await db.select().from(s.parties).where(eq(s.parties.id, ids.supplier));
    expect(sp.name).toBe("E2E Ravi Scrap Traders");
  });

  it("materials: create, edit default rate", async () => {
    expect((await run(saveMaterial.bind(null, null), { name: "E2E PP scrap", hsn: "3915", defaultRate: 27 })).ok).toBe(true);
    const [m] = await db.select().from(s.materials).where(eq(s.materials.name, "E2E PP scrap"));
    ids.material = m.id;
    await run(saveMaterial.bind(null, m.id), { name: "E2E PP scrap", hsn: "3915", defaultRate: 28.5 });
    const [m2] = await db.select().from(s.materials).where(eq(s.materials.id, m.id));
    expect(m2.defaultRate).toBe(28.5);
  });

  it("inward load: weighbridge math, paid-on-the-spot payment, validation, inline new party", async () => {
    const r = await run(saveLoad.bind(null, "inward", null), {
      date: TODAY, partyId: ids.supplier, materialId: ids.material, vehicleNo: "ap 35 t 1234",
      grossKg: 12450, tareKg: 5230, deductionKg: 120, rate: 28.5, billNo: "S-101", settledNow: 100000, settledMode: "cash",
    });
    ids.inward = idFrom(r.redirect, /saved=(\d+)/);
    const [l] = await db.select().from(s.inwardLoads).where(eq(s.inwardLoads.id, ids.inward));
    expect(l).toMatchObject({ netKg: 7220, billableKg: 7100, amount: 202350, vehicleNo: "AP 35 T 1234" });
    const pays = await db.select().from(s.payments).where(eq(s.payments.inwardLoadId, ids.inward));
    expect(pays).toHaveLength(1); // linked to the load by id, not by text
    expect(pays[0]).toMatchObject({ direction: "paid", amount: 100000 });

    const bad = await run(saveLoad.bind(null, "inward", null), { date: TODAY, partyId: ids.supplier, materialId: ids.material, grossKg: 100, tareKg: 200, rate: 10 });
    expect(bad.error).toMatch(/Gross weight/);

    const inline = await run(saveLoad.bind(null, "inward", null), {
      date: TODAY, partyId: "new", newPartyName: "E2E Walk-in Kabadi", materialId: ids.material, grossKg: 900, tareKg: 400, rate: 25,
    });
    expect(inline.redirect).toMatch(/saved=/);
    const [walk] = await db.select().from(s.parties).where(eq(s.parties.name, "E2E Walk-in Kabadi"));
    expect(walk.type).toBe("supplier");
  });

  it("inward load edit recomputes amounts", async () => {
    await run(saveLoad.bind(null, "inward", ids.inward), {
      date: TODAY, partyId: ids.supplier, materialId: ids.material, vehicleNo: "AP 35 T 1234",
      grossKg: 12450, tareKg: 5230, deductionKg: 220, rate: 28.5, billNo: "S-101",
    });
    const [l] = await db.select().from(s.inwardLoads).where(eq(s.inwardLoads.id, ids.inward));
    expect(l).toMatchObject({ billableKg: 7000, amount: 199500 });
  });

  it("outward loads: CGST/SGST in AP, IGST outside, auto invoice numbers", async () => {
    const firstNo = await q.suggestInvoiceNo(TODAY);
    expect(firstNo).toMatch(/^TP\/\d{2}-\d{2}\/\d{3}$/);
    const r = await run(saveLoad.bind(null, "outward", null), {
      date: TODAY, partyId: ids.buyer, materialId: ids.material, grossKg: 9000, tareKg: 4000, rate: 45, gstRate: 18,
      invoiceNo: firstNo, ewayBillNo: "331000000001", settledNow: 50000, settledMode: "bank",
    });
    ids.outward = idFrom(r.redirect, /saved=(\d+)/);
    const [o] = await db.select().from(s.outwardLoads).where(eq(s.outwardLoads.id, ids.outward));
    expect(o).toMatchObject({ amount: 225000, cgst: 20250, sgst: 20250, igst: 0, total: 265500 });
    ids.invoiceNo = Number(firstNo.slice(-3));
    const nextNo = await q.suggestInvoiceNo(TODAY);
    expect(Number(nextNo.slice(-3))).toBe(ids.invoiceNo + 1);

    const r2 = await run(saveLoad.bind(null, "outward", null), {
      date: TODAY, partyId: ids.farBuyer, materialId: ids.material, grossKg: 3000, tareKg: 1000, rate: 40, gstRate: 18,
    });
    ids.outwardFar = idFrom(r2.redirect, /saved=(\d+)/);
    const [o2] = await db.select().from(s.outwardLoads).where(eq(s.outwardLoads.id, ids.outwardFar));
    expect(o2).toMatchObject({ amount: 80000, cgst: 0, sgst: 0, igst: 14400, total: 94400 });
  });

  it("payments: create, edit, validation, khata balance", async () => {
    const r = await run(savePayment, { date: TODAY, partyId: ids.supplier, direction: "paid", amount: 20000, mode: "upi", reference: "UTR123" });
    expect(r.redirect).toMatch(new RegExp(`/parties/${ids.supplier}\\?saved=1`));
    const [p] = await db.select().from(s.payments).where(eq(s.payments.reference, "UTR123"));
    ids.payment = p.id;
    expect((await run(updatePayment.bind(null, p.id), { date: TODAY, partyId: ids.supplier, direction: "paid", amount: 25000, mode: "upi", reference: "UTR123" })).ok).toBe(true);
    const [p2] = await db.select().from(s.payments).where(eq(s.payments.id, p.id));
    expect(p2.amount).toBe(25000);
    expect((await run(savePayment, { date: TODAY, partyId: ids.supplier, direction: "paid", amount: 0 })).error).toBeTruthy();

    // supplier: opening 5000 + purchase 199500 − paid (100000 on the spot + 25000) = 79500 we owe
    const ledger = await q.partyLedger(ids.supplier);
    expect(ledger!.balance).toBe(79500);
    const bal = (await q.partyBalances()).find((x) => x.id === ids.supplier)!;
    expect(bal.balance).toBe(79500);
    // buyer: sold 265500 − received 50000 = owes us 215500
    expect((await q.partyBalances()).find((x) => x.id === ids.buyer)!.balance).toBe(-215500);
  });

  it("expenses: diesel + electricity, edit, totals", async () => {
    expect((await run(saveExpense.bind(null, null), { date: TODAY, category: "diesel", amount: 1500, quantity: 16, mode: "cash", notes: "Generator" })).ok).toBe(true);
    expect((await run(saveExpense.bind(null, null), { date: TODAY, category: "electricity", amount: 8200, quantity: 910, meterReading: "45120", mode: "upi" })).ok).toBe(true);
    const [d] = await db.select().from(s.expenses).where(and(eq(s.expenses.createdBy, EMAIL), eq(s.expenses.category, "diesel")));
    ids.expense = d.id;
    await run(saveExpense.bind(null, d.id), { date: TODAY, category: "diesel", amount: 1650, quantity: 17, mode: "cash" });
    const totals = await q.expenseTotals(RANGE);
    expect(totals.find((t) => t.category === "diesel")!.amount).toBeGreaterThanOrEqual(1650);
    expect((await run(saveExpense.bind(null, null), { date: TODAY, category: "diesel", amount: "" })).error).toBeTruthy();
  });

  it("workers & salary: worker, advance, salary, edit entry, monthly balance", async () => {
    const w = await run(saveWorker.bind(null, null), { name: "E2E Suresh", monthlySalary: 15000, role: "Grinder operator" });
    ids.worker = idFrom(w.redirect, /workers\/(\d+)/);
    expect((await run(saveSalaryTxn.bind(null, null), { workerId: ids.worker, date: TODAY, month: MONTH, type: "advance", amount: 4000, mode: "cash" })).ok).toBe(true);
    expect((await run(saveSalaryTxn.bind(null, null), { workerId: ids.worker, date: TODAY, month: MONTH, type: "salary", amount: 6000, mode: "cash" })).ok).toBe(true);
    const row = (await q.workersForMonth(MONTH)).find((x) => x.id === ids.worker)!;
    expect(row).toMatchObject({ advances: 4000, salaryPaid: 6000, balance: 5000 });

    const [t] = await db.select().from(s.salaryTxns).where(and(eq(s.salaryTxns.workerId, ids.worker), eq(s.salaryTxns.type, "advance")));
    ids.salaryTxn = t.id;
    await run(saveSalaryTxn.bind(null, t.id), { workerId: ids.worker, date: TODAY, month: MONTH, type: "advance", amount: 3000, mode: "cash" });
    expect((await q.workersForMonth(MONTH)).find((x) => x.id === ids.worker)!.balance).toBe(6000);

    // editing the worker must not flip them to "left"
    await run(saveWorker.bind(null, ids.worker), { name: "E2E Suresh K", monthlySalary: 16000 });
    const [wk] = await db.select().from(s.workers).where(eq(s.workers.id, ids.worker));
    expect(wk).toMatchObject({ name: "E2E Suresh K", active: true });
  });

  it("dashboard & report queries reflect the data", async () => {
    const sum = await q.periodSummary(RANGE);
    expect(sum.inward.count).toBeGreaterThanOrEqual(2);
    expect(sum.outward.count).toBeGreaterThanOrEqual(2);
    expect(sum.gst.igst).toBeGreaterThanOrEqual(14400);
    expect(sum.salaries).toBeGreaterThanOrEqual(9000);
    const stock = (await q.stockByMaterial()).find((m) => m.id === ids.material)!;
    expect(stock.stockKg).toBe(7000 + 500 - 5000 - 2000);
    const series = await q.dailySeries({ from: RANGE.from, to: TODAY });
    expect(series.at(-1)!.inKg).toBeGreaterThanOrEqual(7500);
    expect(await q.setupStatus()).toEqual({ parties: true, workers: true, inward: true, expenses: true });
    expect((await q.materialsWithUsage()).find((m) => m.id === ids.material)!.uses).toBe(4);
    expect(await q.lastRates("inward")).toMatchObject({ [ids.material]: 25 });
  });

  it("CSV exports return every kind", async () => {
    for (const kind of ["inward", "outward", "payments", "expenses", "salary"]) {
      const res = await exportCsv(new Request(`http://x/api/export/${kind}?from=${RANGE.from}&to=${TODAY}`), {
        params: Promise.resolve({ kind }),
      });
      expect(res.status, kind).toBe(200);
      const text = await res.text();
      expect(text.split("\n").length, kind).toBeGreaterThan(2);
    }
    const bad = await exportCsv(new Request("http://x/api/export/inward"), { params: Promise.resolve({ kind: "inward" }) });
    expect(bad.status).toBe(400);
  });

  it("archive rules: parties/workers with history archive instead of delete", async () => {
    const blocked = await deleteRecord("party", ids.supplier);
    expect(blocked.ok).toBe(false);
    expect(await q.usageCount("party", ids.supplier)).toBeGreaterThan(0);

    await setArchived("party", ids.farBuyer, true);
    expect((await q.getParties()).some((p) => p.id === ids.farBuyer)).toBe(false);
    expect((await q.getParties(true)).some((p) => p.id === ids.farBuyer)).toBe(true);
    await setArchived("party", ids.farBuyer, false);
    expect((await q.getParties()).some((p) => p.id === ids.farBuyer)).toBe(true);

    await setArchived("worker", ids.worker, true);
    expect((await q.workersForMonth(MONTH)).some((w) => w.id === ids.worker)).toBe(false);
    await setArchived("worker", ids.worker, false);
  });

  it("delete + undo: load with its payment, expense, salary entry, unused party", async () => {
    const res = await deleteRecord("inward_load", ids.inward);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.note).toMatch(/on-the-spot payment/);
    expect(await db.select().from(s.payments).where(eq(s.payments.inwardLoadId, ids.inward))).toHaveLength(0);

    // Undo goes through the API route exactly as the browser sends it (JSON, dates as strings).
    const undo = await restoreApi(new Request("http://x/api/records/restore", { method: "POST", body: JSON.stringify(res.snapshot) }));
    expect(await undo.json()).toEqual({ restored: 2 });
    expect(await db.select().from(s.inwardLoads).where(eq(s.inwardLoads.id, ids.inward))).toHaveLength(1);
    expect(await db.select().from(s.payments).where(eq(s.payments.inwardLoadId, ids.inward))).toHaveLength(1);
    expect((await q.partyLedger(ids.supplier))!.balance).toBe(79500);

    for (const [kind, id] of [["expense", ids.expense], ["salary_txn", ids.salaryTxn], ["payment", ids.payment]] as const) {
      const d = await deleteRecord(kind, id);
      expect(d.ok, kind).toBe(true);
      if (d.ok) await restoreApi(new Request("http://x", { method: "POST", body: JSON.stringify(d.snapshot) }));
    }

    const temp = await run(saveParty.bind(null, null), { name: "E2E Temp Party", type: "buyer", stateCode: "37" });
    const tempId = idFrom(temp.redirect, /parties\/(\d+)/);
    expect((await deleteRecord("party", tempId)).ok).toBe(true);
    expect((await restoreApi(new Request("http://x", { method: "POST", body: "not json" }))).status).toBe(400);
    expect(
      (await restoreApi(new Request("http://x", { method: "POST", body: JSON.stringify([{ table: "users", rows: [{ id: 1 }] }]) }))).status,
    ).toBe(400);
  });

  it("fix 5: a failed save leaves nothing half-done", async () => {
    const usedNo = `${(await q.suggestInvoiceNo(TODAY)).slice(0, -3)}${String(ids.invoiceNo).padStart(3, "0")}`;
    const before = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(s.payments);
    const dup = await run(saveLoad.bind(null, "outward", null), {
      date: TODAY, partyId: "new", newPartyName: "E2E Should Not Exist", materialId: ids.material,
      grossKg: 2000, tareKg: 1000, rate: 40, invoiceNo: usedNo, settledNow: 10000, settledMode: "cash",
    });
    expect(dup.error).toMatch(/already used on outward load/);
    const after = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(s.payments);
    expect(after[0].n).toBe(before[0].n); // no orphan payment
    expect(await db.select().from(s.parties).where(eq(s.parties.name, "E2E Should Not Exist"))).toHaveLength(0);

    // Editing another load onto the same number is rejected too, and the database itself enforces it.
    const edit = await run(saveLoad.bind(null, "outward", ids.outwardFar), {
      date: TODAY, partyId: ids.farBuyer, materialId: ids.material, grossKg: 3000, tareKg: 1000, rate: 40, invoiceNo: usedNo,
    });
    expect(edit.error).toMatch(/already used/);
    await expect(db.update(s.outwardLoads).set({ invoiceNo: usedNo }).where(eq(s.outwardLoads.id, ids.outwardFar))).rejects.toThrow();

    // Transaction proof: if the second write in a batch fails, the first one is rolled back.
    const [{ id: probeId }] = (
      await db.execute<{ id: number }>(sql`select nextval(pg_get_serial_sequence('inward_loads', 'id'))::int as id`)
    ).rows;
    await expect(
      db.batch([
        db.insert(s.inwardLoads).values({
          id: probeId, date: TODAY, partyId: ids.supplier, materialId: ids.material,
          grossKg: 10, tareKg: 5, netKg: 5, billableKg: 5, rate: 1, amount: 5, createdBy: EMAIL,
        }),
        db.insert(s.payments).values({ date: TODAY, partyId: -1, direction: "paid", amount: 1, inwardLoadId: probeId }),
      ]),
    ).rejects.toThrow();
    expect(await db.select().from(s.inwardLoads).where(eq(s.inwardLoads.id, probeId))).toHaveLength(0);
  });

  it("fix 6: changing a load's party moves its on-the-spot payment", async () => {
    const other = await run(saveParty.bind(null, null), { name: "E2E Second Supplier", type: "supplier", stateCode: "37" });
    const otherId = idFrom(other.redirect, /parties\/(\d+)/);
    const fields = { date: TODAY, materialId: ids.material, vehicleNo: "AP 35 T 1234", grossKg: 12450, tareKg: 5230, deductionKg: 220, rate: 28.5, billNo: "S-101" };
    await run(saveLoad.bind(null, "inward", ids.inward), { ...fields, partyId: otherId });
    const [pay] = await db.select().from(s.payments).where(eq(s.payments.inwardLoadId, ids.inward));
    expect(pay.partyId).toBe(otherId);
    // balances move as a whole: the new supplier owes nothing extra, the old one is back to opening + other payments
    expect((await q.partyLedger(otherId))!.balance).toBe(199500 - 100000);

    // A linked payment can't be moved to a different party on its own.
    const moved = await run(updatePayment.bind(null, pay.id), { date: TODAY, partyId: ids.supplier, direction: "paid", amount: 100000, mode: "cash" });
    expect(moved.error).toMatch(/Change the party on the load/);

    await run(saveLoad.bind(null, "inward", ids.inward), { ...fields, partyId: ids.supplier });
    expect((await q.partyLedger(ids.supplier))!.balance).toBe(79500);
  });

  it("fix 7: the load link survives an edited reference text", async () => {
    const [pay] = await db.select().from(s.payments).where(eq(s.payments.inwardLoadId, ids.inward));
    await run(updatePayment.bind(null, pay.id), { date: TODAY, partyId: ids.supplier, direction: "paid", amount: 100000, mode: "cash", reference: "cash given to driver" });
    const res = await deleteRecord("inward_load", ids.inward);
    expect(res.ok && res.note).toMatch(/on-the-spot payment/);
    expect(await db.select().from(s.payments).where(eq(s.payments.id, pay.id))).toHaveLength(0);
    if (res.ok) await restoreApi(new Request("http://x", { method: "POST", body: JSON.stringify(res.snapshot) }));
    const [back] = await db.select().from(s.payments).where(eq(s.payments.id, pay.id));
    expect(back).toMatchObject({ inwardLoadId: ids.inward, reference: "cash given to driver" });
  });

  it("audit log records who changed what", async () => {
    const rows = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(s.auditLog).where(eq(s.auditLog.userEmail, EMAIL));
    expect(rows[0].n).toBeGreaterThan(15);
  });
});
