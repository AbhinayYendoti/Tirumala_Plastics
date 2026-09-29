import { LogoMark } from "@/components/logo";
import { Spinner } from "@/components/spinner";

// Shown on cold start / PWA launch and whenever a route has no loading.tsx of its own.
export default function Loading() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-5 animate-fade-in">
      <LogoMark className="emblem-pulse h-20 w-20" />
      <div className="flex items-center gap-2 text-sm text-muted">
        <Spinner size="xs" className="text-maroon" /> Opening the register…
      </div>
    </div>
  );
}
