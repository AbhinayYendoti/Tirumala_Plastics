import type { ReactNode } from "react";
import type { Party } from "@/db/schema";
import { saveParty } from "@/lib/actions/parties";
import { ActionForm } from "./action-form";
import { Field, Input, Select, Textarea } from "./ui";

export function PartyForm({ party, secondary }: { party?: Party; secondary?: ReactNode }) {
  return (
    <ActionForm
      action={saveParty.bind(null, party?.id ?? null)}
      submitLabel={party ? "Save changes" : "Save party"}
      secondary={secondary}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input name="name" defaultValue={party?.name} required autoFocus={!party} />
        </Field>
        <Field label="Type">
          <Select name="type" defaultValue={party?.type ?? "supplier"}>
            <option value="supplier">Supplier (we buy scrap)</option>
            <option value="buyer">Buyer (we sell)</option>
            <option value="both">Both</option>
          </Select>
        </Field>
        <Field label="Phone">
          <Input name="phone" type="tel" inputMode="tel" defaultValue={party?.phone ?? ""} />
        </Field>
        <Field label="GSTIN" hint="Needed on tax invoices for registered buyers">
          <Input name="gstin" defaultValue={party?.gstin ?? ""} maxLength={15} autoCapitalize="characters" />
        </Field>
        <Field label="State code" hint="37 = Andhra Pradesh. Other states get IGST.">
          <Input name="stateCode" defaultValue={party?.stateCode ?? "37"} inputMode="numeric" maxLength={2} />
        </Field>
        <Field label="Opening balance ₹" hint="+ we owe them, − they owe us">
          <Input
            name="openingBalance"
            type="number"
            step="any"
            inputMode="decimal"
            defaultValue={party?.openingBalance ?? ""}
          />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Textarea name="address" defaultValue={party?.address ?? ""} />
        </Field>
      </div>
    </ActionForm>
  );
}
