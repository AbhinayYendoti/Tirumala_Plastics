import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { RecordActions } from "@/components/record-actions";
import { WorkerForm } from "@/components/worker-forms";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workers } from "@/db/schema";
import { usageCount } from "@/lib/queries";

export default async function EditWorkerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [[worker], usage] = await Promise.all([
    db.select().from(workers).where(eq(workers.id, Number(id))),
    usageCount("worker", Number(id)),
  ]);
  if (!worker) notFound();
  return (
    <>
      <PageHeader title={`Edit ${worker.name}`} />
      <Card>
        <WorkerForm
          worker={worker}
          secondary={
            <RecordActions
              kind="worker"
              id={worker.id}
              label="Worker"
              usage={usage}
              archived={!worker.active}
              listHref="/workers"
            />
          }
        />
      </Card>
    </>
  );
}
