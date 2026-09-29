import { RemovableList } from "@/components/removable-list";
import { SavedToast } from "@/components/toast";
import { RangeFilter, resolveRange, type SearchParams } from "@/components/range-filter";
import { Badge, Empty, LinkButton, PageHeader, Stat } from "@/components/ui";
import { formatDate, MODE_LABELS, rupees, todayIST } from "@/lib/format";
import { getParties, listPayments } from "@/lib/queries";

export const metadata = { title: "Payments" };

export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const range = await resolveRange(searchParams);
  const [rows, parties] = await Promise.all([listPayments(range), getParties()]);
  const paid = rows.filter((r) => r.payment.direction === "paid").reduce((s, r) => s + r.payment.amount, 0);
  const received = rows.filter((r) => r.payment.direction === "received").reduce((s, r) => s + r.payment.amount, 0);

  return (
    <>
      <SavedToast message="Payment saved" />
      <PageHeader
        title="Payments"
        subtitle="Money paid to suppliers and received from buyers"
        action={<LinkButton href="/payments/new">+ Payment</LinkButton>}
      />
      <RangeFilter path="/payments" range={range} />
      <div className="stagger mb-4 grid grid-cols-2 gap-3">
        <Stat label="Paid out" value={rupees(paid)} tone="out" />
        <Stat label="Received" value={rupees(received)} tone="in" />
      </div>
      {rows.length === 0 ? (
        <Empty>No payments in this period.</Empty>
      ) : (
        <RemovableList
          kind="payment"
          label="Payment"
          edit={{ type: "payment", today: todayIST(), parties: parties.map((p) => ({ id: p.id, name: p.name })) }}
          rows={rows.map(({ payment: p, partyName }) => ({
            id: p.id,
            record: p,
            node: (
              <>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{partyName}</div>
                  <div className="mt-0.5 text-xs text-muted">
                    {formatDate(p.date)} · {MODE_LABELS[p.mode]}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </div>
                </div>
                <Badge tone={p.direction === "paid" ? "out" : "in"}>
                  {p.direction === "paid" ? "Paid" : "Received"}
                </Badge>
                <div className="w-24 text-right font-semibold">{rupees(p.amount)}</div>
              </>
            ),
          }))}
        />
      )}
    </>
  );
}
