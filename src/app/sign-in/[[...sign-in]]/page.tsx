import { ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs";
import { AuthCard, AuthShell } from "@/components/auth-hero";
import { Spinner } from "@/components/spinner";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthShell>
      <AuthCard>
        <ClerkLoading>
          {/* Roughly the form's height, so nothing jumps when Clerk finishes loading. */}
          <div className="flex min-h-[22rem] flex-col items-center justify-center gap-3">
            <Spinner size="lg" className="text-maroon" />
            <span className="text-sm text-muted">Preparing sign in…</span>
          </div>
        </ClerkLoading>
        <ClerkLoaded>
          {/* Clerk's own card is made transparent in src/lib/clerk-theme.ts; AuthCard is the card. */}
          <div className="animate-fade-in">
            <SignIn />
          </div>
        </ClerkLoaded>
      </AuthCard>
      <p className="mt-4 text-center text-xs text-muted">Private register · for the owners of Tirumala Plastics</p>
    </AuthShell>
  );
}
