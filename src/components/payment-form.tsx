"use client";

import type { ReactNode } from "react";
import type { Payment } from "@/db/schema";
import { savePayment, updatePayment } from "@/lib/actions/money";
import { rupees } from "@/lib/format";
import { ActionForm } from "./action-form";
import { ModeField } from "./fields";
import { Field, Input, NumberInput, Select, Textarea } from "./ui";

export type PartyOption = { id: number; name: string; balance?: number };

/** New payment (redirects to the khata) or, with `initial`, an in-place edit inside the sheet. */
export function PaymentForm({
  parties,
  today,
  initial,
  defaults,
  returnTo,
  secondary,
  onSaved,
}: {
  parties: PartyOption[];
  today: string;
  initial?: Payment;
  defaults?: { partyId?: string; direction?: "paid" | "received" };
  returnTo?: string;
  secondary?: ReactNode;
  onSaved?: () => void;
}) {
  const isEdit = !!initial;
  // Keep an archived party selectable when editing an old payment that belongs to it.
  const options =
    initial && !parties.some((p) => p.id === initial.partyId)
      ? [...parties, { id: initial.partyId, name: "(archived party)" }]
      : parties;

  return (
    <ActionForm
      action={isEdit ? updatePayment.bind(null, initial.id) : savePayment}
      submitLabel={isEdit ? "Save changes" : "Save payment"}
      successMessage="Payment updated"
      resetOnSuccess={false}
      secondary={secondary}
      onSaved={onSaved}
    >
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type">
          <Select name="direction" defaultValue={initial?.direction ?? defaults?.direction ?? "paid"}>
            <option value="paid">We paid (to supplier)</option>
            <option value="received">We received (from buyer)</option>
          </Select>
        </Field>
        <Field label="Date">
          <Input type="date" name="date" defaultValue={initial?.date ?? today} max={today} required />
        </Field>
        <Field label="Party" className="sm:col-span-2">
          <Select name="partyId" defaultValue={String(initial?.partyId ?? defaults?.partyId ?? "")} required>
            <option value="" disabled>
              Choose…
            </option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.balance ? ` — ${p.balance > 0 ? "we owe" : "owes us"} ${rupees(Math.abs(p.balance))}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount ₹">
          <NumberInput name="amount" defaultValue={initial?.amount} required autoFocus={!isEdit} />
        </Field>
        <ModeField defaultValue={initial?.mode} />
        <Field label="Reference (UTR / cheque no.)">
          <Input name="reference" defaultValue={initial?.reference ?? ""} />
        </Field>
        <Field label="Notes">
          <Textarea name="notes" defaultValue={initial?.notes ?? ""} />
        </Field>
      </div>
    </ActionForm>
  );
}
