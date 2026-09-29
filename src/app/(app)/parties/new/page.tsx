import { PartyForm } from "@/components/party-form";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "New party" };

export default function NewPartyPage() {
  return (
    <>
      <PageHeader title="New party" subtitle="Supplier or buyer" />
      <Card>
        <PartyForm />
      </Card>
    </>
  );
}
