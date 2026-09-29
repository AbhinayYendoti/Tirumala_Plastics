import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { SearchParams } from "@/components/range-filter";
import { Badge, Card, Empty, LinkButton, PageHeader, Stat, cx } from "@/components/ui";
import { rupees } from "@/lib/format";
import { partyBalances } from "@/lib/queries";

export const metadata = { title: "Parties" };

const TABS = [
  { key: "all", label: "All" },
  { key: "pay", label: "To pay" },
  { key: "receive", label: "To receive" },
  { key: "archived", label: "Archived" },
];

export default async function PartiesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" ? sp.tab : "all";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const showArchived = tab === "archived";
  const everyone = await partyBalances(showArchived);
  const all = showArchived ? everyone : everyone.filter((p) => !p.archived);
  const toPay = all.filter((p) => p.balance > 0).reduce((s, p) => s + p.balance, 0);
  const toReceive = all.filter((p) => p.balance < 0).reduce((s, p) => s - p.balance, 0);

  const rows = all
    .filter((p) =>
      tab === "pay" ? p.balance > 0 : tab === "receive" ? p.balance < 0 : tab === "archived" ? p.archived : true,
    )
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.phone?.includes(q))
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance) || a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title="Parties"
        subtitle="Suppliers & buyers with their khata balance"
        action={<LinkButton href="/parties/new">+ Party</LinkButton>}
      />
      <div className="stagger mb-4 grid grid-cols-2 gap-3">
        <Stat label="We have to pay" value={rupees(toPay)} tone="out" />
        <Stat label="We have to receive" value={rupees(toReceive)} tone="in" />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/parties?tab=${t.key}`}
            className={cx(
              "rounded-full border px-3.5 py-1.5 text-sm transition",
              tab === t.key ? "border-maroon bg-maroon text-white" : "border-line bg-paper hover:border-maroon/40 hover:bg-maroon/5 hover:text-maroon",
            )}
          >
            {t.label}
          </Link>
        ))}
        <form className="w-full sm:ml-auto sm:w-auto">
          <input type="hidden" name="tab" value={tab} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name / phone"
            className="w-full rounded-full border border-line bg-paper px-3.5 py-1.5"
          />
        </form>
      </div>
      {rows.length === 0 ? (
        <Empty>{tab === "archived" ? "No archived parties." : "No parties here yet."}</Empty>
      ) : (
        <Card className="stagger divide-y divide-line p-0">
          {rows.map((p) => (
            <Link key={p.id} href={`/parties/${p.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-ivory/60 active:bg-ivory">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{p.name}</span>
                  {p.archived && <Badge tone="gold">Archived</Badge>}
                </div>
                <div className="text-xs capitalize text-muted">{p.phone ?? p.type}</div>
              </div>
              {p.balance === 0 ? (
                <Badge>Settled</Badge>
              ) : (
                <div className={cx("text-right", p.balance > 0 ? "text-outflow" : "text-inflow")}>
                  <div className="font-semibold">{rupees(Math.abs(p.balance))}</div>
                  <div className="text-[11px]">{p.balance > 0 ? "we owe" : "owes us"}</div>
                </div>
              )}
              <ChevronRight size={16} className="text-muted" />
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
