import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { RecordActions } from "@/components/record-actions";
import { WorkerForm } from "@/components/worker-forms";
import { workerDetail } from "@/lib/queries";

export default async function EditWorkerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await workerDetail(Number(id));
  if (!data) notFound();
  return (
    <>
      <PageHeader title={`Edit ${data.worker.name}`} />
      <Card>
        <WorkerForm
          worker={data.worker}
          secondary={
            <RecordActions
              kind="worker"
              id={data.worker.id}
              label="Worker"
              usage={data.txns.length}
              archived={!data.worker.active}
              listHref="/workers"
            />
          }
        />
      </Card>
    </>
  );
}
