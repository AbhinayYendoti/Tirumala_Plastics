import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Phone } from "lucide-react";
import { KhataPaymentEdit } from "@/components/khata-payment";
import { RecordActions } from "@/components/record-actions";
import { SavedToast } from "@/components/toast";
import { Badge, Card, Empty, LinkButton, PageHeader, cx } from "@/components/ui";
import { formatDate, rupees, todayIST } from "@/lib/format";
import { getParties, partyLedger } from "@/lib/queries";

const tone = (n: number) => (n > 0 ? "text-outflow" : n < 0 ? "text-inflow" : "");

export default async function PartyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, pickerParties] = await Promise.all([partyLedger(Number(id)), getParties(true)]);
  if (!data) notFound();
  const { party, ledger, balance } = data;
  const partyOptions = pickerParties
    .filter((p) => !p.archived || p.id === party.id)
    .map((p) => ({ id: p.id, name: p.name }));
  const today = todayIST();

  return (
    <>
      <SavedToast message="Saved" />
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {party.name}
            {party.archived && <Badge tone="gold">Archived</Badge>}
          </span>
        }
        subtitle={<span className="capitalize">{[party.type, party.gstin, party.address].filter(Boolean).join(" · ")}</span>}
        action={
          <LinkButton href={`/parties/${party.id}/edit`} variant="secondary">
            <Pencil size={16} /> Edit
          </LinkButton>
        }
      />
      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted">
            {balance > 0 ? "We have to pay" : balance < 0 ? "They have to pay us" : "Balance"}
          </div>
          <div className={cx("text-3xl font-semibold", tone(balance))}>{rupees(Math.abs(balance))}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {party.phone && (
            <a
              href={`tel:${party.phone}`}
              className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-3 text-sm"
            >
              <Phone size={16} /> {party.phone}
            </a>
          )}
          <LinkButton href={`/payments/new?party=${party.id}&direction=paid`} variant="secondary">
            Pay
          </LinkButton>
          <LinkButton href={`/payments/new?party=${party.id}&direction=received`} variant="secondary">
            Receive
          </LinkButton>
        </div>
      </Card>

      <h2 className="mb-2 font-serif text-lg">Khata</h2>
      {ledger.length === 0 ? (
        <Empty>No entries yet. Opening balance {rupees(party.openingBalance)}.</Empty>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-ivory text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Details</th>
                <th className="px-4 py-2 text-right">We owe +</th>
                <th className="px-4 py-2 text-right">Settled −</th>
                <th className="px-4 py-2 text-right">Balance</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ledger.map((r) => (
                <tr key={r.key}>
                  <td className="whitespace-nowrap px-4 py-2.5">{formatDate(r.date)}</td>
                  <td className="px-4 py-2.5">
                    {r.href ? (
                      <Link href={r.href} className="hover:underline">
                        {r.label}
                      </Link>
                    ) : (
                      r.label
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">{r.debit ? rupees(r.debit) : ""}</td>
                  <td className="px-4 py-2.5 text-right">{r.credit ? rupees(r.credit) : ""}</td>
                  <td className={cx("whitespace-nowrap px-4 py-2.5 text-right font-medium", tone(r.balance))}>
                    {rupees(Math.abs(r.balance))} {r.balance > 0 ? "Cr" : r.balance < 0 ? "Dr" : ""}
                  </td>
                  <td className="pr-2">
                    {r.payment && <KhataPaymentEdit payment={r.payment} parties={partyOptions} today={today} />}
                  </td>
                </tr>
              ))}
              <tr className="text-muted">
                <td className="px-4 py-2.5" />
                <td className="px-4 py-2.5">Opening balance</td>
                <td colSpan={2} />
                <td className="px-4 py-2.5 text-right">{rupees(Math.abs(party.openingBalance))}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </Card>
      )}
      <p className="mt-3 text-xs text-muted">Cr = we owe them · Dr = they owe us</p>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pb-2 pr-20 pt-4 text-sm text-muted">
        <span>
          {ledger.length > 0
            ? `${ledger.length} entries — archive hides this party but keeps its khata.`
            : "No entries yet — this party can be deleted."}
        </span>
        <RecordActions
          kind="party"
          id={party.id}
          label="Party"
          usage={ledger.length}
          archived={party.archived}
          listHref="/parties"
        />
      </div>
    </>
  );
}
