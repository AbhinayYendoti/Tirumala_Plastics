import { LoadListPage } from "@/components/load-pages";
import type { SearchParams } from "@/components/range-filter";

export const metadata = { title: "Outward loads" };

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <LoadListPage kind="outward" searchParams={searchParams} />;
}
