"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { expenses, payments, salaryTxns, workers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { monthOf } from "@/lib/format";
import {
  type ActionState,
  audit,
  firstError,
  formObject,
  isoDate,
  money,
  optionalMoney,
  optionalText,
  payModeSchema,
  resolveParty,
} from "./util";

const positive = money.refine((n) => n > 0, "Enter an amount");

// ---------- Payments (party khata) ----------

const paymentSchema = z.object({
  date: isoDate,
  partyId: z.string().optional(),
  newPartyName: z.string().optional(),
  direction: z.enum(["paid", "received"]),
  amount: positive,
  mode: payModeSchema,
  reference: optionalText,
  notes: optionalText,
  returnTo: z.string().optional(),
});

export async function savePayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = paymentSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { returnTo, newPartyName, partyId: rawParty, ...v } = parsed.data;
  let partyId: number;
  try {
    partyId = await resolveParty(rawParty, newPartyName, v.direction === "paid" ? "supplier" : "buyer");
    const [row] = await db
      .insert(payments)
      .values({ ...v, partyId, createdBy: user.email })
      .returning({ id: payments.id });
    await audit(user.email, "create", "payment", row.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save" };
  }
  revalidatePath("/", "layout");
  redirect(`${returnTo?.startsWith("/") ? returnTo : `/parties/${partyId}`}?saved=1`);
}

export async function updatePayment(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = paymentSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { date, direction, amount, mode, reference, notes, partyId } = parsed.data;
  if (!partyId || partyId === "new") return { error: "Choose a party" };
  // A payment made while saving a load belongs to that load's party.
  const [current] = await db.select().from(payments).where(eq(payments.id, id));
  const loadRef = current?.inwardLoadId
    ? `inward load #${current.inwardLoadId}`
    : current?.outwardLoadId
      ? `outward load #${current.outwardLoadId}`
      : null;
  if (loadRef && Number(partyId) !== current.partyId) {
    return { error: `This payment was made with ${loadRef}. Change the party on the load instead.` };
  }
  await db
    .update(payments)
    .set({ date, direction, amount, mode, reference, notes, partyId: Number(partyId) })
    .where(eq(payments.id, id));
  await audit(user.email, "update", "payment", id);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------- Expenses ----------

const expenseSchema = z.object({
  date: isoDate,
  category: z.enum(["diesel", "electricity", "maintenance", "transport", "food", "other"]),
  amount: positive,
  quantity: optionalMoney.transform((v) => v ?? null),
  meterReading: optionalText,
  mode: payModeSchema,
  notes: optionalText,
});

export async function saveExpense(id: number | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = expenseSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const isEdit = id != null;
  if (id) {
    await db.update(expenses).set(parsed.data).where(eq(expenses.id, id));
  } else {
    [{ id }] = await db
      .insert(expenses)
      .values({ ...parsed.data, createdBy: user.email })
      .returning({ id: expenses.id });
  }
  await audit(user.email, isEdit ? "update" : "create", "expense", id);
  revalidatePath("/", "layout");
  return { ok: true };
}


// ---------- Workers & salary ----------

const workerSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name"),
    phone: optionalText,
    role: optionalText,
    payBasis: z.enum(["monthly", "daily"]).default("monthly"),
    monthlySalary: optionalMoney,
    dailyWage: optionalMoney,
    joinDate: z.preprocess((v) => (v === "" ? null : v), isoDate.nullable().optional()).transform((v) => v ?? null),
  })
  .superRefine((v, ctx) => {
    if (v.payBasis === "monthly" && !v.monthlySalary)
      ctx.addIssue({ code: "custom", path: ["monthlySalary"], message: "Enter the monthly salary" });
    if (v.payBasis === "daily" && !v.dailyWage)
      ctx.addIssue({ code: "custom", path: ["dailyWage"], message: "Enter the daily wage" });
  })
  // Only the amount for the chosen pay type is kept.
  .transform(({ monthlySalary, dailyWage, ...v }) => ({
    ...v,
    monthlySalary: v.payBasis === "monthly" ? monthlySalary! : 0,
    dailyWage: v.payBasis === "daily" ? dailyWage! : null,
  }));

export async function saveWorker(id: number | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  // "Active" is managed by Archive / Restore, not by this form.
  const parsed = workerSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  let workerId = id;
  if (id) {
    await db.update(workers).set(parsed.data).where(eq(workers.id, id));
  } else {
    [{ id: workerId }] = await db.insert(workers).values(parsed.data).returning({ id: workers.id });
  }
  await audit(user.email, id ? "update" : "create", "worker", workerId!);
  revalidatePath("/", "layout");
  redirect(`/workers/${workerId}?saved=1`);
}

const salarySchema = z.object({
  workerId: z.coerce.number().int().positive(),
  date: isoDate,
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  type: z.enum(["advance", "salary", "bonus"]),
  amount: positive,
  mode: payModeSchema,
  notes: optionalText,
});

export async function saveSalaryTxn(id: number | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = salarySchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const v = { ...parsed.data, month: parsed.data.month ?? monthOf(parsed.data.date) };
  const isEdit = id != null;
  if (id) {
    await db.update(salaryTxns).set(v).where(eq(salaryTxns.id, id));
  } else {
    [{ id }] = await db
      .insert(salaryTxns)
      .values({ ...v, createdBy: user.email })
      .returning({ id: salaryTxns.id });
  }
  await audit(user.email, isEdit ? "update" : "create", "salary_txn", id);
  revalidatePath("/", "layout");
  return { ok: true };
}

