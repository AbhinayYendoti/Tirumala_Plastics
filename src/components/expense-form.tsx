"use client";

import { useState, type ReactNode } from "react";
import { Fuel, Plug, Truck, UtensilsCrossed, Wrench, Ellipsis } from "lucide-react";
import type { Expense } from "@/db/schema";
import { saveExpense } from "@/lib/actions/money";
import { ActionForm } from "./action-form";
import { Field, Input, NumberInput, Select, cx } from "./ui";

const CATS = [
  { value: "diesel", label: "Diesel", icon: Fuel },
  { value: "electricity", label: "Current bill", icon: Plug },
  { value: "maintenance", label: "Repairs", icon: Wrench },
  { value: "transport", label: "Transport", icon: Truck },
  { value: "food", label: "Tea & food", icon: UtensilsCrossed },
  { value: "other", label: "Other", icon: Ellipsis },
] as const;

/** Adds a new expense, or edits `initial` when given (used inside the edit sheet). */
export function ExpenseForm({
  today,
  initial,
  secondary,
  onSaved,
}: {
  today: string;
  initial?: Expense;
  secondary?: ReactNode;
  onSaved?: () => void;
}) {
  const [cat, setCat] = useState<string>(initial?.category ?? "diesel");
  const isEdit = !!initial;

  return (
    <ActionForm
      action={saveExpense.bind(null, initial?.id ?? null)}
      submitLabel={isEdit ? "Save changes" : "Add expense"}
      successMessage={isEdit ? "Expense updated" : "Expense added"}
      resetOnSuccess={!isEdit}
      secondary={secondary}
      onSaved={onSaved}
    >
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {CATS.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className={cx(
              "flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition active:scale-95",
              cat === value
                ? "border-maroon bg-maroon text-white"
                : "border-line bg-paper text-ink/80 hover:border-maroon/40 hover:bg-maroon/5 hover:text-maroon",
            )}
          >
            <input
              type="radio"
              name="category"
              value={value}
              checked={cat === value}
              onChange={() => setCat(value)}
              className="sr-only"
            />
            <Icon size={20} />
            {label}
          </label>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Amount ₹">
          <NumberInput name="amount" defaultValue={initial?.amount} required />
        </Field>
        <Field label="Date">
          <Input type="date" name="date" defaultValue={initial?.date ?? today} max={today} required />
        </Field>
        {cat === "diesel" && (
          <Field label="Litres">
            <NumberInput name="quantity" defaultValue={initial?.quantity ?? ""} />
          </Field>
        )}
        {cat === "electricity" && (
          <>
            <Field label="Units (kWh)">
              <NumberInput name="quantity" defaultValue={initial?.quantity ?? ""} />
            </Field>
            <Field label="Meter reading">
              <Input name="meterReading" inputMode="numeric" defaultValue={initial?.meterReading ?? ""} />
            </Field>
          </>
        )}
        <Field label="Mode">
          <Select name="mode" defaultValue={initial?.mode ?? "cash"}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank</option>
            <option value="cheque">Cheque</option>
          </Select>
        </Field>
        <Field label="Note" className="col-span-2">
          <Input
            name="notes"
            defaultValue={initial?.notes ?? ""}
            placeholder={cat === "diesel" ? "Generator / lorry / JCB" : ""}
          />
        </Field>
      </div>
    </ActionForm>
  );
}
