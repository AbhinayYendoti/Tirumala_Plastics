import { Card, PageHeader } from "@/components/ui";
import { WorkerForm } from "@/components/worker-forms";

export const metadata = { title: "New worker" };

export default function NewWorkerPage() {
  return (
    <>
      <PageHeader title="New worker" />
      <Card>
        <WorkerForm />
      </Card>
    </>
  );
}
