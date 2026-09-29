import { LoadNewPage } from "@/components/load-pages";

export const metadata = { title: "New outward load" };

export default function Page() {
  return <LoadNewPage kind="outward" />;
}
