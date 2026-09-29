import Link from "next/link";
import { Suspense } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Fuel, HandCoins } from "lucide-react";
import { CountUp } from "@/components/count-up";
import { Greeting } from "@/components/greeting";
import { InOutChart } from "@/components/in-out-chart";
import { SetupChecklist } from "@/components/setup-checklist";
import { Bone, StatsSkeleton } from "@/components/skeletons";
import { Card, PageHeader, Stat, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { CATEGORY_LABELS, formatMonth, kgs, monthOf, monthRange, rupees, shiftDays, todayIST, tonnes } from "@/lib/format";
import { dailySeries, partyBalances, periodSummary, setupStatus, stockByMaterial } from "@/lib/queries";

export const metadata = { title: "Home" };

const ACTIONS = [
  { href: "/inward/new", label: "Inward", sub: "Scrap came in", icon: ArrowDownToLine },
  { href: "/outward/new", label: "Outward", sub: "Load sent out", icon: ArrowUpFromLine },
  { href: "/expenses#add", label: "Expense", sub: "Diesel, EB…", icon: Fuel },
  { href: "/payments/new", label: "Payment", sub: "Paid / received", icon: HandCoins },
];

function timeGreeting() {
  const h = Number(
    new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()),
  );
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

// The header and quick actions render immediately; each data section streams in on its own.
export default async function Dashboard() {
  const user = await requireUser();
  const today = todayIST();
  const month = monthOf(today);

  return (
    <>
      <PageHeader
        title={<Greeting name={user.name} timeGreeting={timeGreeting()} />}
        subtitle={new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeZone: "Asia/Kolkata" }).format(new Date())}
      />

      <Suspense fallback={null}>
        <Setup />
      </Suspense>

      <div className="stagger mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ACTIONS.map(({ href, label, sub, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 rounded-2xl border border-line bg-paper p-3.5 transition duration-150 hover:border-maroon/40 hover:shadow-sm active:scale-[0.97]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-maroon/10 text-maroon transition group-hover:bg-maroon group-hover:text-white">
              <Icon size={20} />
            </span>
            <span>
              <span className="block font-medium">{label}</span>
              <span className="block text-xs text-muted">{sub}</span>
            </span>
          </Link>
        ))}
      </div>

      <h2 className="mb-2 font-serif text-lg">Today</h2>
      <Suspense fallback={<StatsSkeleton count={4} />}>
        <TodaySection today={today} />
      </Suspense>

      <h2 className="mb-2 mt-6 font-serif text-lg">{formatMonth(month)}</h2>
      <Suspense
        fallback={
          <>
            <StatsSkeleton count={4} />
            <Bone className="mb-6 h-52 w-full !rounded-2xl" />
          </>
        }
      >
        <MonthSection today={today} month={month} />
      </Suspense>

      <Suspense
        fallback={
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Bone key={i} className="h-40 !rounded-2xl" />
            ))}
          </div>
        }
      >
        <BalancesSection />
      </Suspense>
    </>
  );
}

async function Setup() {
  const status = await setupStatus();
  return <SetupChecklist status={status} />;
}

async function TodaySection({ today }: { today: string }) {
  const s = await periodSummary({ from: today, to: today });
  return (
    <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat
        label="Came in"
        value={<CountUp value={s.inward.kg} format="kg" />}
        sub={`${s.inward.count} loads · ${rupees(s.inward.amount)}`}
      />
      <Stat
        label="Went out"
        value={<CountUp value={s.outward.kg} format="kg" />}
        sub={`${s.outward.count} loads · ${rupees(s.outward.amount)}`}
      />
      <Stat
        label="Cash paid"
        value={<CountUp value={s.paid + s.expenseTotal + s.salaries} format="rupees" />}
        tone="out"
        sub="Parties + expenses + wages"
      />
      <Stat label="Cash received" value={<CountUp value={s.received} format="rupees" />} tone="in" />
    </div>
  );
}

async function MonthSection({ today, month }: { today: string; month: string }) {
  const [s, series] = await Promise.all([
    periodSummary({ from: monthRange(month).start, to: today }),
    dailySeries({ from: shiftDays(today, -29), to: today }),
  ]);
  const spend = s.expenseTotal + s.salaries;
  return (
    <>
      <div className="stagger mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Purchased" value={<CountUp value={s.inward.kg} format="tonnes" />} sub={rupees(s.inward.amount)} />
        <Stat
          label="Sold"
          value={<CountUp value={s.outward.kg} format="tonnes" />}
          sub={`${rupees(s.outward.amount)} incl. GST`}
        />
        <Stat
          label="Expenses + wages"
          value={<CountUp value={spend} format="rupees" />}
          sub={
            [...s.expenses]
              .sort((a, b) => b.amount - a.amount)
              .slice(0, 2)
              .map((e) => `${CATEGORY_LABELS[e.category]} ${rupees(e.amount)}`)
              .join(" · ") || "—"
          }
        />
        <Stat
          label="Rough margin"
          value={<CountUp value={s.outward.taxable - s.inward.amount - spend} format="rupees" />}
          sub="Sales (ex-GST) − purchase − spend"
        />
      </div>
      <Card className="mb-6 animate-fade-up">
        <div className="mb-1 text-sm font-medium">Last 30 days (kg)</div>
        <InOutChart data={series} />
      </Card>
    </>
  );
}

async function BalancesSection() {
  const [stock, balances] = await Promise.all([stockByMaterial(), partyBalances()]);
  const toPay = balances.filter((p) => p.balance > 0).sort((a, b) => b.balance - a.balance);
  const toReceive = balances.filter((p) => p.balance < 0).sort((a, b) => a.balance - b.balance);
  const totalStock = stock.reduce((s, m) => s + m.stockKg, 0);

  return (
    <div className="stagger grid gap-4 lg:grid-cols-3">
      <Card>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-medium">Yard stock (approx.)</span>
          <span className="text-sm text-muted">{tonnes(totalStock)}</span>
        </div>
        {stock.length === 0 ? (
          <p className="text-sm text-muted">No loads yet.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {stock.map((m) => (
              <li key={m.id} className="flex justify-between">
                <span>{m.name}</span>
                <span className={cx(m.stockKg < 0 && "text-outflow")}>{kgs(m.stockKg)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-muted">Bought − sold per material. Processing loss not deducted.</p>
      </Card>
      <DuesCard title="We have to pay" rows={toPay} tone="out" />
      <DuesCard title="We have to receive" rows={toReceive} tone="in" />
    </div>
  );
}

function DuesCard({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: { id: number; name: string; balance: number }[];
  tone: "in" | "out";
}) {
  const total = rows.reduce((s, r) => s + Math.abs(r.balance), 0);
  return (
    <Card>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-medium">{title}</span>
        <span className={cx("text-sm font-semibold", tone === "in" ? "text-inflow" : "text-outflow")}>{rupees(total)}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">All settled.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {rows.slice(0, 6).map((r) => (
            <li key={r.id}>
              <Link href={`/parties/${r.id}`} className="flex justify-between hover:underline">
                <span className="truncate">{r.name}</span>
                <span>{rupees(Math.abs(r.balance))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {rows.length > 6 && (
        <Link href={`/parties?tab=${tone === "in" ? "receive" : "pay"}`} className="mt-2 block text-sm text-maroon">
          See all {rows.length}
        </Link>
      )}
    </Card>
  );
}
