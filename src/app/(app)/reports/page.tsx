import { Download } from "lucide-react";
import { PrintButton } from "@/components/controls";
import { RangeFilter, resolveRange, type SearchParams } from "@/components/range-filter";
import { Card, PageHeader } from "@/components/ui";
import { BUSINESS } from "@/lib/business";
import { CATEGORY_LABELS, formatDate, kgs, plain, rupees2 } from "@/lib/format";
import { periodSummary } from "@/lib/queries";

export const metadata = { title: "Reports" };

const EXPORTS = [
  { key: "inward", label: "Inward loads" },
  { key: "outward", label: "Outward loads" },
  { key: "payments", label: "Payments" },
  { key: "expenses", label: "Expenses" },
  { key: "salary", label: "Salary & advances" },
];

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const range = await resolveRange(searchParams);
  const s = await periodSummary(range);
  const gstTotal = s.gst.cgst + s.gst.sgst + s.gst.igst;
  const spend = s.expenseTotal + s.salaries;
  const margin = s.outward.taxable - s.inward.amount - spend;
  const yieldPct = s.inward.kg ? (s.outward.kg / s.inward.kg) * 100 : 0;

  const Row = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
    <div className={`flex justify-between py-1.5 ${strong ? "border-t border-line pt-2 font-semibold" : ""}`}>
      <span className={strong ? "" : "text-ink/75"}>{k}</span>
      <span>{v}</span>
    </div>
  );

  return (
    <>
      <PageHeader title="Reports" subtitle="Summary for any period, printable and exportable" action={<PrintButton />} />
      <RangeFilter path="/reports" range={range} />

      <div className="mb-4 hidden print:block">
        <div className="font-serif text-xl">{BUSINESS.legalName}</div>
        <div className="text-sm">
          Summary {formatDate(range.from)} to {formatDate(range.to)}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2 font-medium">Material</div>
          <Row k={`Inward (${s.inward.count} loads)`} v={kgs(s.inward.kg)} />
          <Row k={`Outward (${s.outward.count} loads)`} v={kgs(s.outward.kg)} />
          <Row k="Out ÷ In" v={`${plain(yieldPct)} %`} strong />
        </Card>
        <Card>
          <div className="mb-2 font-medium">Trading</div>
          <Row k="Sales (taxable)" v={rupees2(s.outward.taxable)} />
          <Row k="Purchases" v={rupees2(s.inward.amount)} />
          <Row k="Expenses" v={rupees2(s.expenseTotal)} />
          <Row k="Salaries & advances" v={rupees2(s.salaries)} />
          <Row k="Rough margin" v={rupees2(margin)} strong />
        </Card>
        <Card>
          <div className="mb-2 font-medium">GST on sales</div>
          <Row k="CGST" v={rupees2(s.gst.cgst)} />
          <Row k="SGST" v={rupees2(s.gst.sgst)} />
          <Row k="IGST" v={rupees2(s.gst.igst)} />
          <Row k="Total output GST" v={rupees2(gstTotal)} strong />
        </Card>
        <Card>
          <div className="mb-2 font-medium">Expenses by head</div>
          {s.expenses.length === 0 && <p className="text-sm text-muted">None</p>}
          {s.expenses.map((e) => (
            <Row
              key={e.category}
              k={`${CATEGORY_LABELS[e.category]}${e.quantity ? ` (${plain(e.quantity)} ${e.category === "diesel" ? "L" : "units"})` : ""}`}
              v={rupees2(e.amount)}
            />
          ))}
          <Row k="Total" v={rupees2(s.expenseTotal)} strong />
        </Card>
        <Card className="md:col-span-2">
          <div className="mb-2 font-medium">Party payments</div>
          <Row k="Paid to suppliers" v={rupees2(s.paid)} />
          <Row k="Received from buyers" v={rupees2(s.received)} />
        </Card>
      </div>

      <Card className="no-print mt-6">
        <div className="mb-3 font-medium">Download Excel (CSV) for this period</div>
        <div className="flex flex-wrap gap-2">
          {EXPORTS.map((e) => (
            <a
              key={e.key}
              href={`/api/export/${e.key}?from=${range.from}&to=${range.to}`}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm transition hover:border-maroon/40 hover:bg-maroon/5 hover:text-maroon active:scale-[0.97]"
            >
              <Download size={15} /> {e.label}
            </a>
          ))}
        </div>
      </Card>
    </>
  );
}
