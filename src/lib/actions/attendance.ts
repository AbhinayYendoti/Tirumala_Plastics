"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, lte, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { attendance, salaryTxns, workers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { todayIST } from "@/lib/format";
import { workerDetail } from "@/lib/queries";
import { audit, isoDate, payModeSchema } from "./util";

type Result = { ok: true } | { ok: false; error: string };

const statusSchema = z.enum(["present", "half", "absent"]).nullable();

function checkDate(date: string): string | null {
  if (!isoDate.safeParse(date).success) return "Pick a date";
  if (date > todayIST()) return "Attendance can't be marked for a future date";
  return null;
}

/** Marks one worker for one day. `null` clears the mark. */
export async function setAttendance(workerId: number, date: string, status: "present" | "half" | "absent" | null): Promise<Result> {
  const user = await requireUser();
  const bad = checkDate(date);
  if (bad) return { ok: false, error: bad };
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success || !Number.isInteger(workerId)) return { ok: false, error: "Invalid attendance" };

  if (parsed.data === null) {
    await db.delete(attendance).where(and(eq(attendance.workerId, workerId), eq(attendance.date, date)));
  } else {
    await db
      .insert(attendance)
      .values({ workerId, date, status: parsed.data, markedBy: user.email })
      .onConflictDoUpdate({
        target: [attendance.workerId, attendance.date],
        set: { status: parsed.data, markedBy: user.email, updatedAt: new Date() },
      });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Marks every working worker who has no mark yet for the day as present. Returns how many. */
export async function markAllPresent(date: string): Promise<Result & { count?: number }> {
  const user = await requireUser();
  const bad = checkDate(date);
  if (bad) return { ok: false, error: bad };

  const list = await db
    .select({ id: workers.id })
    .from(workers)
    .where(and(eq(workers.active, true), or(isNull(workers.joinDate), lte(workers.joinDate, date))));
  if (list.length === 0) return { ok: true, count: 0 };

  const marked = await db
    .select({ workerId: attendance.workerId })
    .from(attendance)
    .where(and(eq(attendance.date, date), inArray(attendance.workerId, list.map((w) => w.id))));
  const done = new Set(marked.map((m) => m.workerId));
  const todo = list.filter((w) => !done.has(w.id));
  if (todo.length) {
    await db
      .insert(attendance)
      .values(todo.map((w) => ({ workerId: w.id, date, status: "present" as const, markedBy: user.email })))
      .onConflictDoNothing();
  }
  revalidatePath("/", "layout");
  return { ok: true, count: todo.length };
}

/**
 * Settles a worker's month: records the outstanding balance (earned from attendance, less
 * advances and salary already paid) as one salary payment. The balance is worked out here
 * on the server, so a stale screen can never overpay.
 */
export async function settleMonth(workerId: number, month: string, mode: string): Promise<Result & { amount?: number }> {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}$/.test(month)) return { ok: false, error: "Pick a month" };
  const payMode = payModeSchema.safeParse(mode);
  if (!payMode.success) return { ok: false, error: "Pick how it was paid" };

  const data = await workerDetail(workerId, month);
  if (!data) return { ok: false, error: "Worker not found" };
  const amount = data.pay.balance;
  if (amount <= 0) return { ok: false, error: "Nothing left to pay for this month" };

  const [{ id }] = await db
    .insert(salaryTxns)
    .values({
      workerId,
      date: todayIST(),
      month,
      type: "salary",
      amount,
      mode: payMode.data,
      notes: "Settled from attendance",
      createdBy: user.email,
    })
    .returning({ id: salaryTxns.id });
  await audit(user.email, "create", "salary_txn", id);
  revalidatePath("/", "layout");
  return { ok: true, amount };
}
