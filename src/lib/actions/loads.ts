"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { inwardLoads, outwardLoads, parties, payments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { computeGst, computeLoad } from "@/lib/calc";
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
  resolveMaterial,
  resolveParty,
} from "./util";

export type LoadKind = "inward" | "outward";

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

    if (kind === "inward") {
      const row = { ...base, billNo: v.billNo };
      if (id) {
        await db.update(inwardLoads).set(row).where(eq(inwardLoads.id, id));
        loadId = id;
      } else {
        [{ id: loadId }] = await db
          .insert(inwardLoads)
          .values({ ...row, createdBy: user.email })
          .returning({ id: inwardLoads.id });
      }
    } else {
      const [party] = await db.select({ stateCode: parties.stateCode }).from(parties).where(eq(parties.id, partyId));
      const gst = computeGst(amount, v.gstRate, party?.stateCode);
      const row = { ...base, invoiceNo: v.invoiceNo, ewayBillNo: v.ewayBillNo, gstRate: v.gstRate, ...gst };
      if (id) {
        await db.update(outwardLoads).set(row).where(eq(outwardLoads.id, id));
        loadId = id;
      } else {
        [{ id: loadId }] = await db
          .insert(outwardLoads)
          .values({ ...row, createdBy: user.email })
          .returning({ id: outwardLoads.id });
      }
    }

    // Cash paid / received on the spot is recorded as a normal payment against the party.
    if (!id && v.settledNow > 0) {
      await db.insert(payments).values({
        date: v.date,
        partyId,
        direction: kind === "inward" ? "paid" : "received",
        amount: v.settledNow,
        mode: v.settledMode,
        reference: `${kind === "inward" ? "Inward" : "Outward"} #${loadId}`,
        createdBy: user.email,
      });
    }
    await audit(user.email, id ? "update" : "create", `${kind}_load`, loadId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save" };
  }

  revalidatePath("/", "layout");
  redirect(`/${kind}?saved=${loadId}`);
}
