"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useOptimistic, useState, type ReactNode } from "react";
import { ChevronRight, Pencil } from "lucide-react";
import type { Expense, Payment, SalaryTxn } from "@/db/schema";
import { deleteRecord, restoreRecord, type RecordKind } from "@/lib/actions/records";
import { ConfirmDelete } from "./controls";
import { ExpenseForm } from "./expense-form";
import { PaymentForm, type PartyOption } from "./payment-form";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { Card, cx } from "./ui";
import { SalaryTxnForm } from "./worker-forms";

type EditConfig =
  | { type: "expense"; today: string }
  | { type: "payment"; today: string; parties: PartyOption[] }
  | { type: "salary"; today: string };

type Row = {
  id: number;
  node: ReactNode;
  /** Row opens a detail page… */
  href?: string;
  /** …or the edit sheet, with this record prefilled. */
  record?: Expense | Payment | SalaryTxn;
};

/**
 * Every list in the app: tap a row to open it (page or edit sheet), tap the bin twice to delete.
 * Deleted rows slide out at once while the server catches up, and a toast offers Undo.
 */
export function RemovableList({
  kind,
  rows,
  label = "Entry",
  edit,
}: {
  kind: RecordKind;
  rows: Row[];
  label?: string;
  edit?: EditConfig;
}) {
  const [visible, remove] = useOptimistic(rows, (state, id: number) => state.filter((r) => r.id !== id));
  const [leaving, setLeaving] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<Row | null>(null);
  const toast = useToast();
  const router = useRouter();

  function onDelete(id: number) {
    setLeaving((s) => new Set(s).add(id));
    // Let the exit animation play, then drop the row optimistically.
    return new Promise<void>((resolve) =>
      setTimeout(() => {
        startTransition(async () => {
          remove(id);
          const res = await deleteRecord(kind, id);
          resolve();
          if (!res.ok) {
            setLeaving((s) => {
              const next = new Set(s);
              next.delete(id);
              return next;
            });
            toast({ message: res.error, tone: "error" });
            return;
          }
          toast({
            message: `${label} deleted${res.note ? ` ${res.note}` : ""}`,
            action: {
              label: "Undo",
              onClick: () =>
                startTransition(async () => {
                  await restoreRecord(res.snapshot);
                  setLeaving(new Set());
                  router.refresh();
                }),
            },
          });
        });
      }, 200),
    );
  }

  const close = () => setEditing(null);
  const sheetDelete = editing && (
    <ConfirmDelete
      onConfirm={async () => {
        const id = editing.id;
        close();
        await onDelete(id);
      }}
    />
  );

  return (
    <>
      <Card className="stagger divide-y divide-line overflow-hidden p-0">
        {visible.map((r) => {
          const body = (
            <>
              <div className="flex min-w-0 flex-1 items-center gap-3">{r.node}</div>
              {r.href ? (
                <ChevronRight size={16} className="shrink-0 text-muted" />
              ) : r.record && edit ? (
                <Pencil size={14} className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100" />
              ) : null}
            </>
          );
          return (
            <div key={r.id} className={cx("group flex items-center", leaving.has(r.id) && "animate-row-out")}>
              {r.href ? (
                <Link href={r.href} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-1 active:bg-ivory">
                  {body}
                </Link>
              ) : r.record && edit ? (
                <button
                  type="button"
                  onClick={() => setEditing(r)}
                  className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-1 text-left transition hover:bg-ivory/60 active:bg-ivory"
                >
                  {body}
                </button>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-1">{body}</div>
              )}
              <div className="pr-2">
                <ConfirmDelete compact onConfirm={() => onDelete(r.id)} />
              </div>
            </div>
          );
        })}
      </Card>

      {edit && (
        <Sheet open={!!editing} onClose={close} title={`Edit ${label.toLowerCase()}`}>
          {editing?.record && edit.type === "expense" && (
            <ExpenseForm
              key={editing.id}
              today={edit.today}
              initial={editing.record as Expense}
              secondary={sheetDelete}
              onSaved={close}
            />
          )}
          {editing?.record && edit.type === "payment" && (
            <PaymentForm
              key={editing.id}
              today={edit.today}
              parties={edit.parties}
              initial={editing.record as Payment}
              secondary={sheetDelete}
              onSaved={close}
            />
          )}
          {editing?.record && edit.type === "salary" && (
            <SalaryTxnForm
              key={editing.id}
              today={edit.today}
              workerId={(editing.record as SalaryTxn).workerId}
              month={(editing.record as SalaryTxn).month}
              initial={editing.record as SalaryTxn}
              secondary={sheetDelete}
              onSaved={close}
            />
          )}
        </Sheet>
      )}
    </>
  );
}
