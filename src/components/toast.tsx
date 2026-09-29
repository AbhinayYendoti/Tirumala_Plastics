"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, X } from "lucide-react";

type ToastAction = { label: string; href: string } | { label: string; onClick: () => void };
type Toast = { id: number; message: string; action?: ToastAction; tone?: "success" | "error" };

const ToastContext = createContext<(t: Omit<Toast, "id">) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const show = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++seq.current;
      setToasts((all) => [...all.slice(-2), { ...t, id }]);
      setTimeout(() => dismiss(id), t.action ? 5000 : 2800);
    },
    [dismiss],
  );

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
            className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-xl"
          >
            <CheckCircle2 size={18} className={t.tone === "error" ? "text-outflow" : "text-gold"} />
            <span className="flex-1">{t.message}</span>
            {t.action &&
              ("href" in t.action ? (
                <Link href={t.action.href} onClick={() => dismiss(t.id)} className="font-semibold text-gold">
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
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-white/50">
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
