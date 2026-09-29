import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Spinner } from "./spinner";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[15px] font-medium transition duration-150 active:scale-[0.97] disabled:opacity-60 aria-busy:cursor-wait";
export const btn = {
  primary: `${btnBase} bg-maroon text-white hover:bg-maroon-dark`,
  secondary: `${btnBase} border border-line bg-paper text-ink hover:bg-ivory`,
  danger: `${btnBase} bg-outflow text-white`,
  ghost: `${btnBase} text-maroon hover:bg-maroon/5`,
};

export function Button({
  variant = "primary",
  className,
  pending,
  children,
  disabled,
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof btn; pending?: boolean }) {
  return (
    <button className={cx(btn[variant], className)} disabled={disabled || pending} aria-busy={pending} {...props}>
      {pending && <Spinner size="sm" />}
      {children}
    </button>
  );
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof btn }) {
  return <Link className={cx(btn[variant], className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("rounded-2xl border border-line bg-paper p-4", className)} {...props} />;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-2xl text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const fieldCls =
  "w-full rounded-xl border border-line bg-paper px-3.5 py-3 text-ink outline-none transition placeholder:text-muted/60 focus:border-maroon focus:ring-2 focus:ring-maroon/15";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-ink/80">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(fieldCls, className)} {...props} />;
}

export function NumberInput(props: ComponentProps<"input">) {
  return <Input type="number" inputMode="decimal" step="any" min="0" {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(fieldCls, "appearance-none bg-no-repeat pr-9", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea rows={2} className={cx(fieldCls, className)} {...props} />;
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-muted">
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "in" | "out";
}) {
  return (
    <Card className="p-3.5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div
        className={cx(
          "mt-1 text-xl font-semibold sm:text-2xl",
          tone === "in" && "text-inflow",
          tone === "out" && "text-outflow",
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </Card>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "in" | "out" | "gold" }) {
  const tones = {
    neutral: "bg-line/60 text-ink/70",
    in: "bg-inflow/10 text-inflow",
    out: "bg-outflow/10 text-outflow",
    gold: "bg-gold/15 text-[#8a6412]",
  };
  return <span className={cx("inline-block rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="animate-fade-up rounded-xl bg-outflow/10 px-3 py-2 text-sm text-outflow">
      {message}
    </p>
  );
}
