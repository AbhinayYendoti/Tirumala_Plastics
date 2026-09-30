import { redirect } from "next/navigation";
import type { SearchParams } from "@/components/range-filter";

// Attendance now lives under Workers; keep old links and home-screen shortcuts working.
export default async function AttendancePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const date = typeof sp.date === "string" ? `?date=${encodeURIComponent(sp.date)}` : "";
  redirect(`/workers${date}`);
}
