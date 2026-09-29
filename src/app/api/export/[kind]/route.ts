import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { salaryTxns, workers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { listExpenses, listLoads, listPayments, type Range } from "@/lib/queries";

type Row = Record<string, string | number | null | undefined>;

function toCsv(rows: Row[]) {
  if (rows.length === 0) return "No data\n";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n") + "\n";
}

const EXPORTERS: Record<string, (r: Range) => Promise<Row[]>> = {
  inward: async (r) =>
    (await listLoads("inward", r)).reverse().map((l) => ({
      Date: l.date,
      Supplier: l.partyName,
      Material: l.materialName,
      Vehicle: l.vehicleNo,
      "Net kg": l.netKg,
      "Billable kg": l.billableKg,
      "Rate/kg": l.rate,
      Amount: l.amount,
      "Bill no": l.docNo,
    })),
  outward: async (r) =>
    (await listLoads("outward", r)).reverse().map((l) => ({
      Date: l.date,
      Buyer: l.partyName,
      Material: l.materialName,
      Vehicle: l.vehicleNo,
      "Net kg": l.netKg,
      "Billable kg": l.billableKg,
      "Rate/kg": l.rate,
      Taxable: l.amount,
      Total: l.total,
      "Invoice no": l.docNo,
    })),
  payments: async (r) =>
    (await listPayments(r)).reverse().map(({ payment: p, partyName }) => ({
      Date: p.date,
      Party: partyName,
      Type: p.direction,
      Amount: p.amount,
      Mode: p.mode,
      Reference: p.reference,
      Notes: p.notes,
    })),
  expenses: async (r) =>
    (await listExpenses(r)).reverse().map((e) => ({
      Date: e.date,
      Category: e.category,
      Amount: e.amount,
      Quantity: e.quantity,
      "Meter reading": e.meterReading,
      Mode: e.mode,
      Notes: e.notes,
    })),
  salary: async (r) =>
    (
      await db
        .select({ t: salaryTxns, name: workers.name })
        .from(salaryTxns)
        .innerJoin(workers, eq(workers.id, salaryTxns.workerId))
        .where(and(gte(salaryTxns.date, r.from), lte(salaryTxns.date, r.to)))
        .orderBy(asc(salaryTxns.date))
    ).map(({ t, name }) => ({
      Date: t.date,
      Worker: name,
      Month: t.month,
      Type: t.type,
      Amount: t.amount,
      Mode: t.mode,
      Notes: t.notes,
    })),
};

export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  await requireUser();
  const { kind } = await params;
  const exporter = EXPORTERS[kind];
  if (!exporter) return new Response("Unknown export", { status: 404 });

  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return new Response("from and to dates are required", { status: 400 });
  }

  // BOM so Excel opens ₹ and Telugu names correctly.
  const body = "﻿" + toCsv(await exporter({ from, to }));
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${kind}_${from}_to_${to}.csv"`,
    },
  });
}
