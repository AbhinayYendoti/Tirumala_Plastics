"use client";

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import type { ActionState } from "@/lib/actions/util";
import { useToast } from "./toast";
import { Button, FormError } from "./ui";

/**
 * Small wrapper for server-action forms: shows errors, a spinner while saving, and a toast after.
 * The footer is the same everywhere: `secondary` (usually Delete / Archive) on the left, Save on the right.
 */
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  className,
  successMessage = "Saved",
  secondary,
  resetOnSuccess = true,
  onSaved,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
  successMessage?: string;
  secondary?: ReactNode;
  resetOnSuccess?: boolean;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!state?.ok) return;
    if (resetOnSuccess) ref.current?.reset();
    toast({ message: successMessage });
    onSaved?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={ref}
      // Submit manually so React doesn't auto-reset the form when the server returns a validation error.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className={className ?? "space-y-4"}
    >
      {children}
      <FormError message={state?.error} />
      <FormFooter secondary={secondary}>
        <Button type="submit" pending={pending} className="min-w-28">
          {pending ? "Saving…" : submitLabel}
        </Button>
      </FormFooter>
    </form>
  );
}

export function FormFooter({ secondary, children }: { secondary?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
      <div>{secondary}</div>
      {children}
    </div>
  );
}
