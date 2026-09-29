import Link from "next/link";
import { notFound } from "next/navigation";
import { HandCoins, Pencil, Printer } from "lucide-react";
import { saveLoad } from "@/lib/actions/loads";
import { formatDate, kgs, rupees, rupees2, todayIST, tonnes } from "@/lib/format";
import {
  type LoadKind,
  getInward,
  getMaterials,
  getOutward,
  getParties,
  lastLoad,
  lastRates,
  listLoads,
  recentVehicles,
  suggestInvoiceNo,
} from "@/lib/queries";
import { RecordActions } from "./record-actions";
import { RemovableList } from "./removable-list";
import { SavedToast } from "./toast";
import { LoadForm } from "./load-form";
import { RangeFilter, resolveRange, type SearchParams } from "./range-filter";
import { Badge, Card, Empty, LinkButton, PageHeader, Stat } from "./ui";

const TITLES = { inward: "Inward loads", outward: "Outward loads" } as const;

export async function LoadListPage({ kind, searchParams }: { kind: LoadKind; searchParams: SearchParams }) {
  const range = await resolveRange(searchParams);
  const rows = await listLoads(kind, range);
  const totalKg = rows.reduce((s, r) => s + r.billableKg, 0);
  const totalAmt = rows.reduce((s, r) => s + r.total, 0);

  return (
    <>
      <PageHeader
        title={TITLES[kind]}
        subtitle={kind === "inward" ? "Scrap received at the yard" : "Material dispatched to buyers"}
        action={
          <LinkButton href={`/${kind}/new`} className="hidden sm:inline-flex">
            + New {kind} load
          </LinkButton>
        }
      />
      <SavedToast message="Load #{id} saved" action={{ label: "Add another", href: `/${kind}/new` }} />
      <RangeFilter path={`/${kind}`} range={range} />
      <div className="stagger mb-4 grid grid-cols-3 gap-3">
        <Stat label="Loads" value={rows.length} />
        <Stat label="Weight" value={tonnes(totalKg)} sub={kgs(totalKg)} />
        <Stat label={kind === "inward" ? "Purchase" : "Sales"} value={rupees(totalAmt)} tone={kind === "inward" ? "out" : "in"} />
      </div>

      {rows.length === 0 ? (
        <Empty>
          No loads in this period.{" "}
          <Link className="font-medium text-maroon underline hover:text-maroon-dark" href={`/${kind}/new`}>
            Add one
          </Link>
        </Empty>
      ) : (
        <RemovableList
          kind={`${kind}_load`}
          label="Load"
          rows={rows.map((r) => ({
            id: r.id,
            href: `/${kind}/${r.id}`,
            node: (
              <>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{r.partyName}</span>
                    <Badge tone="gold">{r.materialName}</Badge>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted">
                    {formatDate(r.date)} · {r.vehicleNo ?? "No vehicle"} · {kgs(r.billableKg)} @ ₹{r.rate}
                  </div>
                </div>
                <div className="text-right font-semibold">{rupees(r.total)}</div>
              </>
            ),
          }))}
        />
      )}
    </>
  );
}

async function formData(kind: LoadKind, keep?: { partyId: number; materialId: number }) {
  // Archived parties/materials stay out of the pickers, except the ones an edited load already uses.
  const [allParties, allMaterials, vehicles, rates, last] = await Promise.all([
    getParties(!!keep),
    getMaterials(!!keep),
    recentVehicles(),
    lastRates(kind),
    lastLoad(kind),
  ]);
  const parties = allParties.filter((p) => !p.archived || p.id === keep?.partyId);
  const materials = allMaterials.filter((m) => !m.archived || m.id === keep?.materialId);
  return { parties, materials, vehicles, rates, last };
}

export async function LoadNewPage({ kind }: { kind: LoadKind }) {
  const today = todayIST();
  const [{ last, ...data }, invoiceNo] = await Promise.all([
    formData(kind),
    kind === "outward" ? suggestInvoiceNo(today) : Promise.resolve(undefined),
  ]);
  return (
    <>
      <PageHeader title={`New ${kind} load`} subtitle={kind === "inward" ? "Truck arrived with scrap" : "Dispatch to a buyer"} />
      <LoadForm
        kind={kind}
        action={saveLoad.bind(null, kind, null)}
        today={today}
        defaults={last ? { materialId: last.materialId } : null}
        suggestedInvoiceNo={invoiceNo}
        {...data}
      />
    </>
  );
}

export async function LoadEditPage({ kind, id }: { kind: LoadKind; id: number }) {
  const row = kind === "inward" ? await getInward(id) : await getOutward(id);
  if (!row) notFound();
  const data = await formData(kind, row.load);
  return (
    <>
      <PageHeader title={`Edit ${kind} #${id}`} />
      <LoadForm
        kind={kind}
        action={saveLoad.bind(null, kind, id)}
        today={todayIST()}
        initial={row.load}
        parties={data.parties}
        materials={data.materials}
        vehicles={data.vehicles}
        rates={data.rates}
        secondary={<RecordActions kind={`${kind}_load`} id={id} label="Load" listHref={`/${kind}`} />}
      />
    </>
  );
}

export async function LoadDetailPage({ kind, id }: { kind: LoadKind; id: number }) {
  const row = kind === "inward" ? await getInward(id) : await getOutward(id);
  if (!row) notFound();
  const { load, party, material } = row;
  const out = kind === "outward" ? (load as Awaited<ReturnType<typeof getOutward>>["load"]) : null;
  const inw = kind === "inward" ? (load as Awaited<ReturnType<typeof getInward>>["load"]) : null;

  const lines: [string, string][] = [
    ["Date", formatDate(load.date)],
    ["Vehicle", load.vehicleNo ?? "—"],
    ["Material", material.name],
    ["Gross weight", kgs(load.grossKg)],
    ["Tare weight", kgs(load.tareKg)],
    ["Net weight", kgs(load.netKg)],
    ["Deduction", kgs(load.deductionKg)],
    ["Billable weight", kgs(load.billableKg)],
    ["Rate", `${rupees2(load.rate)} / kg`],
    [out ? "Taxable value" : "Amount", rupees2(load.amount)],
  ];
  if (out) {
    if (out.igst) lines.push([`IGST ${out.gstRate}%`, rupees2(out.igst)]);
    else lines.push([`CGST + SGST ${out.gstRate}%`, rupees2(out.cgst + out.sgst)]);
    lines.push(["Invoice no.", out.invoiceNo ?? "—"], ["E-way bill", out.ewayBillNo ?? "—"]);
  }
  if (inw) lines.push(["Bill / slip no.", inw.billNo ?? "—"]);

  return (
    <>
      <PageHeader
        title={`${kind === "inward" ? "Inward" : "Outward"} #${id}`}
        subtitle={
          <Link href={`/parties/${party.id}`} className="text-maroon underline-offset-4 hover:underline">
            {party.name}
          </Link>
        }
      />
      <Card className="mb-4">
        <div className="text-sm text-muted">{out ? "Invoice total" : "Amount payable"}</div>
        <div className="text-3xl font-semibold">{rupees2(out ? out.total : load.amount)}</div>
      </Card>
      <Card className="mb-4 divide-y divide-line p-0">
        {lines.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-[15px]">
            <span className="text-muted">{k}</span>
            <span className="text-right font-medium">{v}</span>
          </div>
        ))}
        {load.notes && <p className="px-4 py-3 text-sm text-ink/80">{load.notes}</p>}
      </Card>
      <Card className="flex flex-wrap items-center gap-2 p-3 pr-20">
        <LinkButton href={`/${kind}/${id}/edit`}>
          <Pencil size={16} /> Edit
        </LinkButton>
        <LinkButton href={`/print/${kind}/${id}`} variant="secondary">
          <Printer size={16} /> {out ? "Tax invoice" : "Weighment slip"}
        </LinkButton>
        <LinkButton
          href={`/payments/new?party=${party.id}&direction=${kind === "inward" ? "paid" : "received"}`}
          variant="secondary"
        >
          <HandCoins size={16} /> {kind === "inward" ? "Pay supplier" : "Record receipt"}
        </LinkButton>
        <div className="ml-auto">
          <RecordActions kind={`${kind}_load`} id={id} label="Load" listHref={`/${kind}`} />
        </div>
      </Card>
      <p className="mt-6 text-xs text-muted">Entered by {load.createdBy ?? "—"}</p>
    </>
  );
}
