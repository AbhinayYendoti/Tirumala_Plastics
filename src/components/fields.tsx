import { Field, Select } from "./ui";

export function ModeField({ name = "mode", defaultValue = "cash" }: { name?: string; defaultValue?: string }) {
  return (
    <Field label="Mode">
      <Select name={name} defaultValue={defaultValue}>
        <option value="cash">Cash</option>
        <option value="upi">UPI</option>
        <option value="bank">Bank transfer</option>
        <option value="cheque">Cheque</option>
      </Select>
    </Field>
  );
}
