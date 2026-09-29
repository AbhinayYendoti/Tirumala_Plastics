import { z } from "zod";
import { db } from "@/db";
import { auditLog, materials, parties } from "@/db/schema";

export type ActionState = { error?: string; ok?: boolean } | undefined;

export const optionalText = z
  .string()
  .trim()
  .transform((v) => v || null)
  .nullable()
  .optional()
  .transform((v) => v ?? null);

export const money = z.coerce.number({ error: "Enter a number" }).min(0, "Cannot be negative");
export const optionalMoney = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.coerce.number().min(0).optional(),
);
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
export const payModeSchema = z.enum(["cash", "upi", "bank", "cheque"]).default("cash");

export function formObject(fd: FormData) {
  return Object.fromEntries(fd.entries()) as Record<string, string>;
}

export function firstError(error: z.ZodError) {
  const issue = error.issues[0];
  const field = issue?.path.join(".");
  return field ? `${field}: ${issue.message}` : (issue?.message ?? "Invalid input");
}

export async function audit(userEmail: string, action: string, entity: string, entityId?: number) {
  await db.insert(auditLog).values({ userEmail, action, entity, entityId });
}

/** Party picker supports "new" + a typed name so a new supplier can be added mid-entry. */
export async function resolveParty(
  partyId: string | undefined,
  newName: string | undefined,
  type: "supplier" | "buyer",
) {
  if (partyId && partyId !== "new") return Number(partyId);
  const name = newName?.trim();
  if (!name) throw new Error("Choose a party or type a new party name");
  const [row] = await db.insert(parties).values({ name, type }).returning({ id: parties.id });
  return row.id;
}

export async function resolveMaterial(materialId: string | undefined, newName: string | undefined) {
  if (materialId && materialId !== "new") return Number(materialId);
  const name = newName?.trim();
  if (!name) throw new Error("Choose a material or type a new material name");
  const [row] = await db.insert(materials).values({ name }).returning({ id: materials.id });
  return row.id;
}
