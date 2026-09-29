import { MaterialsManager } from "@/components/materials-manager";
import { PageHeader } from "@/components/ui";
import { materialsWithUsage } from "@/lib/queries";

export const metadata = { title: "Materials" };

export default async function MaterialsPage() {
  const rows = await materialsWithUsage();
  return (
    <>
      <PageHeader title="Materials" subtitle="Scrap types and products, with HSN and default rate" />
      <MaterialsManager rows={rows} />
    </>
  );
}
