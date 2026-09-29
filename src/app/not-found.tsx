import Link from "next/link";
import { LogoMark } from "@/components/logo";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-4 text-center">
      <LogoMark className="h-16 w-16" />
      <div>
        <h1 className="font-serif text-2xl">This entry doesn&apos;t exist</h1>
        <p className="mt-2 text-sm text-muted">It may have been deleted, or the link is wrong.</p>
      </div>
      <Link
        href="/"
        className="rounded-xl bg-maroon px-5 py-3 font-medium text-white transition hover:bg-maroon-dark active:scale-[0.98]"
      >
        Back to the register
      </Link>
    </main>
  );
}
