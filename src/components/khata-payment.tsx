"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { Payment } from "@/db/schema";
import { ConfirmDelete } from "./controls";
import { PaymentForm, type PartyOption } from "./payment-form";
import { useRemove } from "./record-actions";
import { Sheet } from "./sheet";

/** Pencil on a khata payment row: edit or delete it in a sheet without leaving the ledger. */
export function KhataPaymentEdit({ payment, parties, today }: { payment: Payment; parties: PartyOption[]; today: string }) {
  const [open, setOpen] = useState(false);
  const remove = useRemove();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Edit payment"
        className="rounded-lg p-1.5 text-muted transition hover:bg-line/60 hover:text-maroon"
      >
        <Pencil size={15} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Edit payment">
        <PaymentForm
          parties={parties}
          today={today}
          initial={payment}
          onSaved={() => setOpen(false)}
          secondary={
            <ConfirmDelete
              onConfirm={async () => {
                setOpen(false);
                await remove("payment", payment.id, { label: "Payment" });
              }}
            />
          }
        />
      </Sheet>
    </>
  );
}
