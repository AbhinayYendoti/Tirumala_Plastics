"use client";

import type { ReactNode } from "react";
import type { SalaryTxn, Worker } from "@/db/schema";
import { saveSalaryTxn, saveWorker } from "@/lib/actions/money";
import { ActionForm } from "./action-form";
import { ModeField } from "./fields";
import { Field, Input, NumberInput, Select } from "./ui";

export function WorkerForm({ worker, secondary }: { worker?: Worker; secondary?: ReactNode }) {
  return (
    <ActionForm
      action={saveWorker.bind(null, worker?.id ?? null)}
      submitLabel={worker ? "Save changes" : "Add worker"}
      secondary={secondary}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input name="name" defaultValue={worker?.name} required autoFocus={!worker} />
        </Field>
        <Field label="Monthly salary ₹">
          <NumberInput name="monthlySalary" defaultValue={worker?.monthlySalary} required />
        </Field>
        <Field label="Work / role">
          <Input name="role" defaultValue={worker?.role ?? ""} placeholder="Grinder operator, loader, driver…" />
        </Field>
        <Field label="Phone">
          <Input name="phone" type="tel" inputMode="tel" defaultValue={worker?.phone ?? ""} />
        </Field>
        <Field label="Joined on">
          <Input name="joinDate" type="date" defaultValue={worker?.joinDate ?? ""} />
        </Field>
      </div>
    </ActionForm>
  );
}

/** Advance / salary / bonus entry. Pass `initial` to edit an existing one (inside the edit sheet). */
export function SalaryTxnForm({
  workerId,
  today,
  month,
  balance,
  initial,
  secondary,
  onSaved,
}: {
  workerId: number;
  today: string;
  month: string;
  balance?: number;
  initial?: SalaryTxn;
  secondary?: ReactNode;
  onSaved?: () => void;
}) {
  const isEdit = !!initial;
  return (
    <ActionForm
      action={saveSalaryTxn.bind(null, initial?.id ?? null)}
      submitLabel={isEdit ? "Save changes" : "Save"}
      successMessage={isEdit ? "Entry updated" : "Recorded"}
      resetOnSuccess={!isEdit}
      secondary={secondary}
      onSaved={onSaved}
    >
      <input type="hidden" name="workerId" value={workerId} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Type">
          <Select name="type" defaultValue={initial?.type ?? "advance"}>
            <option value="advance">Advance</option>
            <option value="salary">Salary payment</option>
            <option value="bonus">Bonus / extra</option>
          </Select>
        </Field>
        <Field
          label="Amount ₹"
          hint={!isEdit && balance && balance > 0 ? `Balance this month: ₹${balance.toLocaleString("en-IN")}` : undefined}
        >
          <NumberInput name="amount" defaultValue={initial?.amount} required />
        </Field>
        <Field label="Date">
          <Input type="date" name="date" defaultValue={initial?.date ?? today} max={today} required />
        </Field>
        <Field label="For month">
          <Input type="month" name="month" defaultValue={initial?.month ?? month} required />
        </Field>
        <ModeField defaultValue={initial?.mode} />
        <Field label="Note">
          <Input name="notes" defaultValue={initial?.notes ?? ""} />
        </Field>
      </div>
    </ActionForm>
  );
}
