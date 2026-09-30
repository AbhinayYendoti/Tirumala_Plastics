// Pure business math — kept free of DB/React so it is easy to unit test.

export const HOME_STATE_CODE = "37"; // Andhra Pradesh

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface WeighInput {
  grossKg: number;
  tareKg: number;
  deductionKg?: number;
  rate: number;
}

export function computeLoad({ grossKg, tareKg, deductionKg = 0, rate }: WeighInput) {
  const netKg = round2(Math.max(grossKg - tareKg, 0));
  const billableKg = round2(Math.max(netKg - deductionKg, 0));
  const amount = round2(billableKg * rate);
  return { netKg, billableKg, amount };
}

/** Deduction given as a percentage of net weight (common for moisture/dust). */
export function deductionFromPercent(netKg: number, percent: number) {
  return round2((netKg * percent) / 100);
}

export function computeGst(taxable: number, gstRate: number, partyStateCode?: string | null) {
  const tax = round2((taxable * gstRate) / 100);
  const interState = !!partyStateCode && partyStateCode !== HOME_STATE_CODE;
  if (interState) {
    return { cgst: 0, sgst: 0, igst: tax, total: round2(taxable + tax) };
  }
  const half = round2(tax / 2);
  return { cgst: half, sgst: round2(tax - half), igst: 0, total: round2(taxable + tax) };
}

/** e-way bill is mandatory for consignments above ₹50,000. */
export const EWAY_BILL_THRESHOLD = 50000;
export const needsEwayBill = (total: number) => total > EWAY_BILL_THRESHOLD;

/**
 * Party balance from our point of view.
 * Positive  => we owe the party (payable).
 * Negative  => the party owes us (receivable).
 */
export function partyBalance(p: {
  opening: number;
  inwardAmount: number; // what we bought from them
  outwardTotal: number; // what we sold to them
  paid: number; // money we paid them
  received: number; // money they paid us
}) {
  return round2(p.opening + p.inwardAmount - p.paid - p.outwardTotal + p.received);
}

/** Records with history are archived rather than deleted, so ledgers never lose entries. */
export const removalMode = (usage: number): "delete" | "archive" => (usage > 0 ? "archive" : "delete");

export function salaryBalance(p: { monthlySalary: number; advances: number; salaryPaid: number }) {
  return round2(p.monthlySalary - p.advances - p.salaryPaid);
}

export type AttendanceCounts = { present: number; half: number; absent: number };

/**
 * What a worker earned in a month from attendance.
 * - daily:   wage × days worked (a half day is 0.5).
 * - monthly: salary less one day's pay (salary ÷ days in the month) per absence. Days left
 *            unmarked (Sundays, holidays, or before attendance was used) are paid.
 */
export function monthEarnings(p: {
  payBasis: "monthly" | "daily";
  monthlySalary: number;
  dailyWage: number | null;
  daysInMonth: number;
  counts: AttendanceCounts;
}) {
  const { present, half, absent } = p.counts;
  if (p.payBasis === "daily") {
    const daysWorked = present + half / 2;
    return { daysWorked, leaveDays: 0, perDay: p.dailyWage ?? 0, deduction: 0, earned: round2(daysWorked * (p.dailyWage ?? 0)) };
  }
  const leaveDays = absent + half / 2;
  const perDay = p.monthlySalary / p.daysInMonth;
  const deduction = round2(Math.min(leaveDays * perDay, p.monthlySalary));
  return {
    daysWorked: present + half / 2,
    leaveDays,
    perDay: round2(perDay),
    deduction,
    earned: round2(p.monthlySalary - deduction),
  };
}

/** Indian financial year label for a date: April 2026 – March 2027 → "26-27". */
export function financialYear(isoDate: string) {
  const [y, m] = isoDate.split("-").map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${String(start % 100).padStart(2, "0")}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export const INVOICE_PREFIX = "TP";

/** Next invoice number in the date's financial year, e.g. TP/26-27/004. Numbering restarts each April. */
export function nextInvoiceNo(existing: (string | null)[], isoDate: string) {
  const prefix = `${INVOICE_PREFIX}/${financialYear(isoDate)}/`;
  const max = existing.reduce((m, no) => {
    if (!no?.startsWith(prefix)) return m;
    const n = Number(no.slice(prefix.length));
    return Number.isInteger(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
