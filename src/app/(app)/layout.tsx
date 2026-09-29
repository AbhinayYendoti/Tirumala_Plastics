import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { Logo, LogoMark } from "@/components/logo";
import { BottomNav, QuickAdd, SideNav } from "@/components/nav";
import { NavProgress } from "@/components/nav-progress";
import { ToastProvider } from "@/components/toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <ToastProvider>
    <Suspense>
      <NavProgress />
    </Suspense>
    <div className="min-h-dvh lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="no-print sticky top-0 hidden h-dvh flex-col gap-8 border-r border-line bg-paper px-4 py-6 lg:flex">
        <Link href="/">
          <Logo />
        </Link>
        <SideNav />
        <div className="mt-auto flex items-center gap-3 px-2 text-sm text-muted">
          <UserButton /> Account
        </div>
      </aside>

      <div className="min-w-0">
        <header
          className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-line bg-ivory/90 px-4 py-2.5 backdrop-blur lg:hidden"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}
        >
          <Link href="/" className="flex items-center gap-2">
            <LogoMark className="h-9 w-9" />
            <span className="font-serif text-lg leading-none">
              Tirumala <span className="italic text-maroon">Plastics</span>
            </span>
          </Link>
          <UserButton />
        </header>
        <main className="mx-auto max-w-5xl px-4 pb-32 pt-5 sm:px-6 lg:pb-28 lg:pt-8">{children}</main>
      </div>

      <QuickAdd />
      <BottomNav />
    </div>
    </ToastProvider>
  );
}
