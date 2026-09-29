"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { saveMaterial } from "@/lib/actions/parties";
import { ActionForm } from "./action-form";
import { RecordActions } from "./record-actions";
import { Sheet } from "./sheet";
import { Badge, Button, Card, Empty, Field, Input, NumberInput, cx } from "./ui";

export type MaterialRow = {
  id: number;
  name: string;
  hsn: string | null;
  defaultRate: number | null;
  archived: boolean;
  inKg: number;
  outKg: number;
  uses: number;
};

const kg = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** Materials list; tapping a row (or "+ Material") opens the same sheet to add, edit, delete or archive. */
export function MaterialsManager({ rows }: { rows: MaterialRow[] }) {
  const [editing, setEditing] = useState<MaterialRow | "new" | null>(null);
  const close = () => setEditing(null);
  const current = editing && editing !== "new" ? editing : undefined;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus size={18} /> Material
        </Button>
      </div>

      {rows.length === 0 ? (
        <Empty>No materials yet.</Empty>
      ) : (
        <Card className="stagger divide-y divide-line overflow-hidden p-0">
          {rows.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setEditing(m)}
              className={cx(
                "group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-ivory/60 active:bg-ivory",
                m.archived && "opacity-60",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{m.name}</span>
                  {m.hsn && <Badge>HSN {m.hsn}</Badge>}
                  {m.archived && <Badge tone="gold">Archived</Badge>}
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  In {kg.format(m.inKg)} kg · Out {kg.format(m.outKg)} kg
                  {m.defaultRate != null ? ` · default ₹${m.defaultRate}/kg` : ""}
                </div>
              </div>
              <Pencil size={14} className="text-muted opacity-0 transition group-hover:opacity-100" />
            </button>
          ))}
        </Card>
      )}

      <Sheet
        open={!!editing}
        onClose={close}
        title={current ? "Edit material" : "New material"}
        subtitle={current ? `${current.uses} loads use this material` : "Shows up in the load form"}
      >
        <ActionForm
          key={current?.id ?? "new"}
          action={saveMaterial.bind(null, current?.id ?? null)}
          submitLabel={current ? "Save changes" : "Add material"}
          successMessage={current ? "Material updated" : "Material added"}
          onSaved={close}
          secondary={
            current && (
              <RecordActions
                kind="material"
                id={current.id}
                label="Material"
                usage={current.uses}
                archived={current.archived}
                onDone={close}
              />
            )
          }
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name" className="sm:col-span-3">
              <Input name="name" defaultValue={current?.name} placeholder="e.g. PP scrap" required autoFocus={!current} />
            </Field>
            <Field label="HSN code" hint="3915 for scrap">
              <Input name="hsn" defaultValue={current?.hsn ?? ""} inputMode="numeric" />
            </Field>
            <Field label="Default rate ₹/kg" hint="Pre-fills the load form" className="sm:col-span-2">
              <NumberInput name="defaultRate" defaultValue={current?.defaultRate ?? ""} />
            </Field>
          </div>
        </ActionForm>
      </Sheet>
    </>
  );
}
