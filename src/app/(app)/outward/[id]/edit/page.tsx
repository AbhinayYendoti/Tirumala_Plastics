import { LoadEditPage } from "@/components/load-pages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LoadEditPage kind="outward" id={Number(id)} />;
}
