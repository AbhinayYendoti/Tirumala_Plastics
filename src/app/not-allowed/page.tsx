import { SignOutButton } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";
import { AuthShell } from "@/components/auth-hero";

export const metadata = { title: "Not allowed" };

export default function NotAllowed() {
  return (
    <AuthShell>
      <div className="rounded-2xl border border-line bg-paper px-6 py-8 text-center shadow-xl shadow-maroon/5">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-outflow/10 text-outflow">
          <ShieldAlert />
        </span>
        <h2 className="font-serif text-2xl">This account can&apos;t open the register</h2>
        <p className="mt-2 text-sm text-muted">Sign in with the owner&apos;s email address to continue.</p>
        <SignOutButton redirectUrl="/sign-in">
          <button className="mt-6 w-full rounded-xl bg-maroon px-5 py-3 font-medium text-white transition active:scale-[0.98]">
            Use another account
          </button>
        </SignOutButton>
      </div>
    </AuthShell>
  );
}
