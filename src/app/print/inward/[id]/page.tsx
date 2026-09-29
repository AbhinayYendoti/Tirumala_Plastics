import { notFound } from "next/navigation";
import { BUSINESS } from "@/lib/business";
import { formatDate, kgs, rupees2 } from "@/lib/format";
import { getInward } from "@/lib/queries";

export const metadata = { title: "Weighment slip" };

export default async function InwardSlip({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getInward(Number(id));
  if (!row) notFound();
  const { load, party, material } = row;

  const lines: [string, string][] = [
    ["Gross weight (loaded)", kgs(load.grossKg)],
    ["Tare weight (empty)", kgs(load.tareKg)],
    ["Net weight", kgs(load.netKg)],
    ["Less: deduction", kgs(load.deductionKg)],
    ["Billable weight", kgs(load.billableKg)],
    ["Rate per kg", rupees2(load.rate)],
  ];

  return (
    <section className="pt-5">
      <h1 className="mb-4 text-center text-base font-bold tracking-[0.3em]">WEIGHMENT & PURCHASE SLIP</h1>
      <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1">
        <div>
          <b>Slip no:</b> IN-{load.id}
        </div>
        <div className="text-right">
          <b>Date:</b> {formatDate(load.date)}
        </div>
        <div>
          <b>Supplier:</b> {party.name}
        </div>
        <div className="text-right">
          <b>Vehicle:</b> {load.vehicleNo ?? "—"}
        </div>
        <div>
          <b>Material:</b> {material.name}
        </div>
        <div className="text-right">
          <b>Supplier bill:</b> {load.billNo ?? "—"}
        </div>
      </div>
      <table className="w-full border border-black">
        <tbody>
          {lines.map(([k, v]) => (
            <tr key={k} className="border-b border-black/30">
              <td className="px-3 py-2">{k}</td>
              <td className="px-3 py-2 text-right font-medium">{v}</td>
            </tr>
          ))}
          <tr className="bg-[#f6efe3] text-base font-bold">
            <td className="px-3 py-2.5">Amount payable</td>
            <td className="px-3 py-2.5 text-right">{rupees2(load.amount)}</td>
          </tr>
        </tbody>
      </table>
      {load.notes && <p className="mt-3">Note: {load.notes}</p>}
      <div className="mt-16 grid grid-cols-2 text-center text-xs">
        <div className="mx-8 border-t border-black pt-1">Supplier / Driver signature</div>
        <div className="mx-8 border-t border-black pt-1">For {BUSINESS.legalName}</div>
      </div>
    </section>
  );
}
