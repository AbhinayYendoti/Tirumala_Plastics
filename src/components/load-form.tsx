"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import type { InwardLoad, Material, OutwardLoad, Party } from "@/db/schema";
import type { ActionState } from "@/lib/actions/util";
import { computeGst, computeLoad, deductionFromPercent, needsEwayBill } from "@/lib/calc";
import { kgs, rupees2 } from "@/lib/format";
import { Button, Card, Field, FormError, Input, NumberInput, Select, Textarea, cx } from "./ui";

type Kind = "inward" | "outward";

export function LoadForm({
  kind,
  action,
  parties,
  materials,
  vehicles,
  rates,
  today,
  initial,
  defaults,
  secondary,
}: {
  kind: Kind;
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  parties: Party[];
  materials: Material[];
  vehicles: string[];
  rates: Record<number, number>;
  today: string;
  initial?: Partial<InwardLoad & OutwardLoad>;
  defaults?: { partyId?: number; materialId?: number } | null;
  secondary?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const isEdit = !!initial?.id;
  const relevantParties = parties.filter((p) => p.type === "both" || p.type === (kind === "inward" ? "supplier" : "buyer"));

  const [partyId, setPartyId] = useState<string>(
    String(initial?.partyId ?? defaults?.partyId ?? (relevantParties.length ? "" : "new")),
  );
  const [materialId, setMaterialId] = useState<string>(
    String(initial?.materialId ?? defaults?.materialId ?? (materials.length ? "" : "new")),
  );
  const [gross, setGross] = useState(initial?.grossKg?.toString() ?? "");
  const [tare, setTare] = useState(initial?.tareKg?.toString() ?? "");
  const [deduction, setDeduction] = useState(initial?.deductionKg ? initial.deductionKg.toString() : "");
  const [deductionMode, setDeductionMode] = useState<"kg" | "%">("kg");
  const [rate, setRate] = useState(
    initial?.rate?.toString() ?? rateFor(defaults?.materialId, rates, materials) ?? "",
  );
  const [gstRate, setGstRate] = useState(initial?.gstRate?.toString() ?? "18");

  const party = parties.find((p) => String(p.id) === partyId);
  const n = (s: string) => Number(s) || 0;

  const calc = useMemo(() => {
    const net = Math.max(n(gross) - n(tare), 0);
    const deductionKg = deductionMode === "%" ? deductionFromPercent(net, n(deduction)) : n(deduction);
    const load = computeLoad({ grossKg: n(gross), tareKg: n(tare), deductionKg, rate: n(rate) });
    const gst = computeGst(load.amount, n(gstRate), party?.stateCode);
    return { ...load, deductionKg, gst };
  }, [gross, tare, deduction, deductionMode, rate, gstRate, party?.stateCode]);

  const total = kind === "outward" ? calc.gst.total : calc.amount;
  const weightError = gross && tare && n(tare) > n(gross);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className="space-y-4"
    >
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Date">
          <Input type="date" name="date" defaultValue={initial?.date ?? today} max={today} required />
        </Field>
        <Field label="Vehicle number">
          <Input
            name="vehicleNo"
            list="vehicles"
            placeholder="AP 35 T 1234"
            defaultValue={initial?.vehicleNo ?? ""}
            autoCapitalize="characters"
          />
          <datalist id="vehicles">
            {vehicles.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>

        <Field label={kind === "inward" ? "Supplier (from whom)" : "Buyer (to whom)"}>
          <Select name="partyId" value={partyId} onChange={(e) => setPartyId(e.target.value)} required>
            <option value="" disabled>
              Choose…
            </option>
            {relevantParties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="new">+ New party</option>
          </Select>
          {partyId === "new" && (
            <Input name="newPartyName" placeholder="New party name" className="mt-2" required autoFocus />
          )}
        </Field>

        <Field label="Material">
          <Select
            name="materialId"
            value={materialId}
            onChange={(e) => {
              setMaterialId(e.target.value);
              const r = rateFor(Number(e.target.value), rates, materials);
              if (r && !isEdit) setRate(r);
            }}
            required
          >
            <option value="" disabled>
              Choose…
            </option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            <option value="new">+ New material</option>
          </Select>
          {materialId === "new" && (
            <Input name="newMaterialName" placeholder="e.g. PP scrap, HDPE granules" className="mt-2" required />
          )}
        </Field>
      </Card>

      <Card>
        <div className="mb-3 text-sm font-semibold text-ink/80">Weighbridge</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Gross (loaded) kg">
            <NumberInput name="grossKg" value={gross} onChange={(e) => setGross(e.target.value)} required />
          </Field>
          <Field label="Tare (empty) kg">
            <NumberInput name="tareKg" value={tare} onChange={(e) => setTare(e.target.value)} required />
          </Field>
          <Field label={`Deduction ${deductionMode}`} hint="Moisture / dust / mixed">
            <div className="flex">
              <NumberInput
                value={deduction}
                onChange={(e) => setDeduction(e.target.value)}
                className="rounded-r-none"
              />
              <button
                type="button"
                onClick={() => setDeductionMode((m) => (m === "kg" ? "%" : "kg"))}
                className="rounded-r-xl border border-l-0 border-line bg-ivory px-3 text-sm font-medium text-maroon"
              >
                {deductionMode}
              </button>
            </div>
            <input type="hidden" name="deductionKg" value={calc.deductionKg} />
          </Field>
          <Field label="Rate ₹ / kg">
            <NumberInput name="rate" value={rate} onChange={(e) => setRate(e.target.value)} required />
          </Field>
        </div>
        {weightError && <p className="mt-2 text-sm text-outflow">Tare cannot be more than gross.</p>}

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-ivory p-3 text-center">
          <Mini label="Net" value={kgs(calc.netKg)} />
          <Mini label="Billable" value={kgs(calc.billableKg)} />
          <Mini label={kind === "outward" ? "Taxable" : "Amount"} value={rupees2(calc.amount)} strong />
        </div>
      </Card>

      {kind === "outward" ? (
        <Card className="grid gap-4 sm:grid-cols-3">
          <Field label="Invoice no.">
            <Input name="invoiceNo" defaultValue={initial?.invoiceNo ?? ""} />
          </Field>
          <Field label="GST %">
            <Select name="gstRate" value={gstRate} onChange={(e) => setGstRate(e.target.value)}>
              {[18, 12, 5, 0].map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="E-way bill no."
            hint={needsEwayBill(total) ? "Required — value above ₹50,000" : "Needed only above ₹50,000"}
          >
            <Input name="ewayBillNo" defaultValue={initial?.ewayBillNo ?? ""} inputMode="numeric" />
          </Field>
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-ivory p-3 text-center sm:col-span-3">
            {calc.gst.igst > 0 ? (
              <Mini label={`IGST ${gstRate}%`} value={rupees2(calc.gst.igst)} />
            ) : (
              <>
                <Mini label={`CGST ${n(gstRate) / 2}%`} value={rupees2(calc.gst.cgst)} />
                <Mini label={`SGST ${n(gstRate) / 2}%`} value={rupees2(calc.gst.sgst)} />
              </>
            )}
            <Mini label="Invoice total" value={rupees2(calc.gst.total)} strong />
          </div>
        </Card>
      ) : (
        <Card>
          <Field label="Supplier bill / slip no.">
            <Input name="billNo" defaultValue={initial?.billNo ?? ""} />
          </Field>
        </Card>
      )}

      {!isEdit && (
        <Card className="grid gap-4 sm:grid-cols-2">
          <Field
            label={kind === "inward" ? "Paid now ₹ (optional)" : "Received now ₹ (optional)"}
            hint="Leave empty if it goes on credit"
          >
            <div className="flex gap-2">
              <NumberInput name="settledNow" placeholder="0" />
              <button
                type="button"
                className="shrink-0 rounded-xl border border-line px-3 text-sm text-maroon"
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  input.value = String(total);
                }}
              >
                Full
              </button>
            </div>
          </Field>
          <Field label="Mode">
            <Select name="settledMode" defaultValue="cash">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank</option>
              <option value="cheque">Cheque</option>
            </Select>
          </Field>
        </Card>
      )}

      <Field label="Notes">
        <Textarea name="notes" defaultValue={initial?.notes ?? ""} />
      </Field>

      <FormError message={state?.error} />

      <div
        className="sticky bottom-[72px] z-10 -mx-4 flex items-center justify-between gap-3 border-t border-line bg-ivory/95 px-4 py-3 backdrop-blur lg:bottom-0"
      >
        <div>
          <div className="text-xs text-muted">{kind === "outward" ? "Invoice total" : "Amount payable"}</div>
          <div
            key={total}
            className={cx("animate-fade-up text-xl font-semibold", kind === "inward" ? "text-outflow" : "text-inflow")}
          >
            {rupees2(total)}
          </div>
        </div>
        <div className="flex items-center gap-1">
        {secondary}
        <Button type="submit" pending={pending} disabled={!!weightError} className="min-w-32">
          {pending ? "Saving…" : isEdit ? "Save changes" : "Save load"}
        </Button>
        </div>
      </div>
    </form>
  );
}

function rateFor(materialId: number | undefined, rates: Record<number, number>, materials: Material[]) {
  if (!materialId) return undefined;
  const r = rates[materialId] ?? materials.find((m) => m.id === materialId)?.defaultRate;
  return r != null ? String(r) : undefined;
}

function Mini({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div
        key={value}
        className={cx("animate-flash rounded-md text-sm sm:text-base", strong ? "font-semibold text-ink" : "text-ink/80")}
      >
        {value}
      </div>
    </div>
  );
}
