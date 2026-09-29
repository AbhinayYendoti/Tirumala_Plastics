import { MoreLinks } from "@/components/nav";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "More" };

export default function MorePage() {
  return (
    <>
      <PageHeader title="More" />
      <MoreLinks />
    </>
  );
}
