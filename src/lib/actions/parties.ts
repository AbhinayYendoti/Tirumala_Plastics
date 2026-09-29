"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { materials, parties } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { type ActionState, audit, firstError, formObject, optionalMoney, optionalText } from "./util";

const partySchema = z.object({
  name: z.string().trim().min(1, "Enter a name"),
  type: z.enum(["supplier", "buyer", "both"]),
  phone: optionalText,
  gstin: optionalText.transform((v) => v?.toUpperCase() ?? null),
  address: optionalText,
  stateCode: z.string().trim().regex(/^\d{2}$/, "State code is 2 digits (AP = 37)").default("37"),
  openingBalance: z.preprocess((v) => (v === "" || v == null ? 0 : v), z.coerce.number()),
});

export async function saveParty(id: number | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = partySchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  let partyId = id;
  if (id) {
    await db.update(parties).set(parsed.data).where(eq(parties.id, id));
  } else {
    [{ id: partyId }] = await db.insert(parties).values(parsed.data).returning({ id: parties.id });
  }
  await audit(user.email, id ? "update" : "create", "party", partyId!);
  revalidatePath("/", "layout");
  redirect(`/parties/${partyId}?saved=1`);
}

const materialSchema = z.object({
  name: z.string().trim().min(1, "Enter a name"),
  hsn: optionalText,
  defaultRate: optionalMoney.transform((v) => v ?? null),
});

export async function saveMaterial(id: number | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = materialSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const isEdit = id != null;
  if (id) {
    await db.update(materials).set(parsed.data).where(eq(materials.id, id));
  } else {
    [{ id }] = await db.insert(materials).values(parsed.data).returning({ id: materials.id });
  }
  await audit(user.email, isEdit ? "update" : "create", "material", id);
  revalidatePath("/", "layout");
  return { ok: true };
}
