"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { inwardLoads, outwardLoads, parties, payments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import type { LoadKind } from "@/lib/queries";
import { computeGst, computeLoad } from "@/lib/calc";
import {
  type ActionState,
  audit,
  firstError,
  formObject,
  isoDate,
  isUniqueViolation,
  money,
  optionalMoney,
  optionalText,
  payModeSchema,
  resolveMaterial,
  resolveParty,
} from "./util";


const loadSchema = z
  .object({
    date: isoDate,
    partyId: z.string().optional(),
    newPartyName: z.string().optional(),
    materialId: z.string().optional(),
    newMaterialName: z.string().optional(),
    vehicleNo: optionalText.transform((v) => v?.toUpperCase().replace(/\s+/g, " ") ?? null),
    grossKg: money,
    tareKg: money,
    deductionKg: optionalMoney.transform((v) => v ?? 0),
    rate: money,
    notes: optionalText,
    billNo: optionalText,
    invoiceNo: optionalText,
    ewayBillNo: optionalText,
    gstRate: optionalMoney.transform((v) => v ?? 18),
    settledNow: optionalMoney.transform((v) => v ?? 0),
    settledMode: payModeSchema,
  })
  .refine((v) => v.grossKg >= v.tareKg, {
    message: "Gross weight must be more than tare (empty vehicle) weight",
    path: ["grossKg"],
  });

export async function saveLoad(
  kind: LoadKind,
  id: number | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = loadSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const v = parsed.data;

  const table = kind === "inward" ? inwardLoads : outwardLoads;
  const linkColumn = kind === "inward" ? payments.inwardLoadId : payments.outwardLoadId;

  // Check the invoice number first, so a clash can't leave a half-saved entry (like a new party) behind.
  if (kind === "outward" && v.invoiceNo) {
    const [clash] = await db
      .select({ id: outwardLoads.id })
      .from(outwardLoads)
      .where(and(eq(outwardLoads.invoiceNo, v.invoiceNo), id ? ne(outwardLoads.id, id) : undefined));
    if (clash) return { error: `Invoice no. ${v.invoiceNo} is already used on outward load #${clash.id}` };
  }

  let loadId: number;
  try {
    const partyId = await resolveParty(v.partyId, v.newPartyName, kind === "inward" ? "supplier" : "buyer");
    const materialId = await resolveMaterial(v.materialId, v.newMaterialName);
    const { netKg, billableKg, amount } = computeLoad(v);
    const base = {
      date: v.date,
      partyId,
      materialId,
      vehicleNo: v.vehicleNo,
      grossKg: v.grossKg,
      tareKg: v.tareKg,
      netKg,
      deductionKg: v.deductionKg,
      billableKg,
      rate: v.rate,
      amount,
      notes: v.notes,
    };
    let row;
    if (kind === "inward") {
      row = { ...base, billNo: v.billNo };
    } else {
      const [party] = await db.select({ stateCode: parties.stateCode }).from(parties).where(eq(parties.id, partyId));
      const gst = computeGst(amount, v.gstRate, party?.stateCode);
      row = { ...base, invoiceNo: v.invoiceNo, ewayBillNo: v.ewayBillNo, gstRate: v.gstRate, ...gst };
    }

    // Each branch below is one db.batch: Neon runs it as a single transaction,
    // so a load and its on-the-spot payment are saved (or changed) together or not at all.
    if (id) {
      loadId = id;
      await db.batch([
        db.update(table).set(row as Partial<typeof table.$inferInsert>).where(eq(table.id, id)),
        // If the load moved to another party, its on-the-spot payment moves with it.
        db.update(payments).set({ partyId }).where(eq(linkColumn, id)),
      ]);
    } else {
      // Reserve the id up front so the payment can point at the load inside the same transaction.
      const seq = await db.execute<{ id: number }>(
        sql`select nextval(pg_get_serial_sequence(${kind === "inward" ? "inward_loads" : "outward_loads"}, 'id'))::int as id`,
      );
      loadId = Number(seq.rows[0].id);
      const insertLoad = db.insert(table).values({ ...row, id: loadId, createdBy: user.email } as typeof table.$inferInsert);
      if (v.settledNow > 0) {
        await db.batch([
          insertLoad,
          db.insert(payments).values({
            date: v.date,
            partyId,
            direction: kind === "inward" ? "paid" : "received",
            amount: v.settledNow,
            mode: v.settledMode,
            reference: `${kind === "inward" ? "Inward" : "Outward"} #${loadId}`,
            [kind === "inward" ? "inwardLoadId" : "outwardLoadId"]: loadId,
            createdBy: user.email,
          }),
        ]);
      } else {
        await insertLoad;
      }
    }
    await audit(user.email, id ? "update" : "create", `${kind}_load`, loadId);
  } catch (e) {
    if (isUniqueViolation(e)) return { error: `Invoice no. ${v.invoiceNo} is already used on another load` };
    return { error: e instanceof Error ? e.message : "Could not save" };
  }

  revalidatePath("/", "layout");
  redirect(`/${kind}?saved=${loadId}`);
}
