import { LoadDetailPage } from "@/components/load-pages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LoadDetailPage kind="inward" id={Number(id)} />;
}
