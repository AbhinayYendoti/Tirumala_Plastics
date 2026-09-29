import { ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-hero";
import { Spinner } from "@/components/spinner";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthShell>
      <ClerkLoading>
        <div className="flex h-[26rem] flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-paper shadow-xl shadow-maroon/5">
          <Spinner size="lg" className="text-maroon" />
          <span className="text-sm text-muted">Preparing sign in…</span>
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <div className="animate-fade-in rounded-2xl bg-paper shadow-xl shadow-maroon/5">
          <SignIn />
        </div>
      </ClerkLoaded>
      <p className="mt-5 text-center text-xs text-muted">Private register · for the owners of Tirumala Plastics</p>
    </AuthShell>
  );
}
