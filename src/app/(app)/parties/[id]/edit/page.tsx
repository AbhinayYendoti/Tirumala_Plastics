import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { parties } from "@/db/schema";
import { PartyForm } from "@/components/party-form";
import { RecordActions } from "@/components/record-actions";
import { usageCount } from "@/lib/queries";
import { Card, PageHeader } from "@/components/ui";

export default async function EditPartyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [[party], usage] = await Promise.all([
    db.select().from(parties).where(eq(parties.id, Number(id))),
    usageCount("party", Number(id)),
  ]);
  if (!party) notFound();
  return (
    <>
      <PageHeader title={`Edit ${party.name}`} />
      <Card>
        <PartyForm
          party={party}
          secondary={
            <RecordActions
              kind="party"
              id={party.id}
              label="Party"
              usage={usage}
              archived={party.archived}
              listHref="/parties"
            />
          }
        />
      </Card>
    </>
  );
}
