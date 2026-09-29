"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui";

/** Shown inside the app shell if a page fails to load (e.g. no internet on the phone). */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  return (
    <div className="mx-auto flex max-w-md animate-fade-up flex-col items-center py-16 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-outflow/10 text-outflow">
        <WifiOff />
      </span>
      <h1 className="font-serif text-2xl">{offline ? "No internet connection" : "This page didn't load"}</h1>
      <p className="mt-2 text-sm text-muted">
        {offline
          ? "Check the phone's data or Wi-Fi, then try again. Nothing you saved earlier is lost."
          : "Something went wrong while loading. Your saved entries are safe — please try again."}
      </p>
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>
          <RotateCw size={16} /> Try again
        </Button>
        <Link
          href="/"
          className="inline-flex items-center rounded-xl border border-line bg-paper px-4 py-3 text-[15px] font-medium transition hover:border-maroon/40 hover:bg-maroon/5 hover:text-maroon"
        >
          Home
        </Link>
      </div>
      {error.digest && <p className="mt-6 text-xs text-muted">Reference: {error.digest}</p>}
    </div>
  );
}
