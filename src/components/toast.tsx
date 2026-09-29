"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

type ToastAction = { label: string; href: string } | { label: string; onClick: () => void };
type Toast = { id: number; message: string; action?: ToastAction; tone?: "success" | "error" };

const ToastContext = createContext<(t: Omit<Toast, "id">) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((all) => all.filter((t) => t.id !== id));
  }, []);
  const schedule = useCallback(
    (id: number, ms: number) => {
      clearTimeout(timers.current.get(id));
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), ms),
      );
    },
    [dismiss],
  );
  const show = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++seq.current;
      setToasts((all) => [...all.slice(-2), { ...t, id }]);
      // Undo needs time to read and reach, especially on a phone.
      schedule(id, t.action ? 8000 : t.tone === "error" ? 5000 : 2800);
    },
    [schedule],
  );
  // Holding a finger / pointer on a toast keeps it open.
  const hold = (id: number) => clearTimeout(timers.current.get(id));
  const release = (id: number) => schedule(id, 3000);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="no-print pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            onPointerEnter={() => hold(t.id)}
            onPointerLeave={() => release(t.id)}
            className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-xl"
          >
            {t.tone === "error" ? (
              <AlertCircle size={18} className="shrink-0 text-[#ff8a73]" />
            ) : (
              <CheckCircle2 size={18} className="shrink-0 text-gold" />
            )}
            <span className="flex-1">{t.message}</span>
            {t.action &&
              ("href" in t.action ? (
                <Link href={t.action.href} onClick={() => dismiss(t.id)} className="font-semibold text-gold hover:underline">
                  {t.action.label}
                </Link>
              ) : (
                <button
                  onClick={() => {
                    (t.action as { onClick: () => void }).onClick();
                    dismiss(t.id);
                  }}
                  className="font-semibold text-gold"
                >
                  {t.action.label}
                </button>
              ))}
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-white/50 transition hover:text-white">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Turns `?saved=12` (set by a server-action redirect) into a toast, then cleans the URL. */
export function SavedToast({ message, action }: { message: string; action?: ToastAction }) {
  const toast = useToast();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const saved = params.get("saved");

  useEffect(() => {
    if (!saved) return;
    toast({ message: message.replace("{id}", saved), action });
    const next = new URLSearchParams(params);
    next.delete("saved");
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  return null;
}
