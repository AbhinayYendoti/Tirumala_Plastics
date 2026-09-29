import { PaymentForm } from "@/components/payment-form";
import type { SearchParams } from "@/components/range-filter";
import { Card, PageHeader } from "@/components/ui";
import { todayIST } from "@/lib/format";
import { partyBalances } from "@/lib/queries";

export const metadata = { title: "New payment" };

export default async function NewPaymentPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const parties = await partyBalances();
  const partyId = typeof sp.party === "string" ? sp.party : "";

  return (
    <>
      <PageHeader title="Record payment" subtitle="Cash / UPI / bank against a party's khata" />
      <Card>
        <PaymentForm
          parties={parties.map((p) => ({ id: p.id, name: p.name, balance: p.balance }))}
          today={todayIST()}
          defaults={{ partyId, direction: sp.direction === "received" ? "received" : "paid" }}
          returnTo={partyId ? `/parties/${partyId}` : "/payments"}
        />
      </Card>
    </>
  );
}
