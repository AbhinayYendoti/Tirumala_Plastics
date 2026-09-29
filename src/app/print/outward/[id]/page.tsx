import { notFound } from "next/navigation";
import { BUSINESS } from "@/lib/business";
import { amountInWords, formatDate, plain, rupees2 } from "@/lib/format";
import { getOutward } from "@/lib/queries";

export const metadata = { title: "Tax invoice" };

export default async function TaxInvoice({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getOutward(Number(id));
  if (!row) notFound();
  const { load, party, material } = row;
  const interState = load.igst > 0;
  const half = load.gstRate / 2;

  return (
    <section className="pt-4">
      <h1 className="mb-4 text-center text-base font-bold tracking-[0.3em]">TAX INVOICE</h1>

      <div className="mb-4 grid grid-cols-2 border border-black">
        <div className="border-r border-black p-3">
          <div className="text-[11px] font-semibold uppercase text-black/60">Bill to</div>
          <div className="font-semibold">{party.name}</div>
          {party.address && <div className="whitespace-pre-line">{party.address}</div>}
          {party.gstin && <div>GSTIN: {party.gstin}</div>}
          <div>State code: {party.stateCode}</div>
        </div>
        <div className="grid grid-cols-2 gap-y-1 p-3">
          <span className="text-black/60">Invoice no.</span>
          <span className="font-semibold">{load.invoiceNo ?? `OUT-${load.id}`}</span>
          <span className="text-black/60">Date</span>
          <span>{formatDate(load.date)}</span>
          <span className="text-black/60">Vehicle</span>
          <span>{load.vehicleNo ?? "—"}</span>
          <span className="text-black/60">E-way bill</span>
          <span>{load.ewayBillNo ?? "—"}</span>
          <span className="text-black/60">Place of supply</span>
          <span>{party.stateCode}</span>
        </div>
      </div>

      <table className="w-full border border-black text-left">
        <thead className="bg-[#f6efe3]">
          <tr className="border-b border-black">
            <th className="px-2 py-2">#</th>
            <th className="px-2 py-2">Description</th>
            <th className="px-2 py-2">HSN</th>
            <th className="px-2 py-2 text-right">Qty (kg)</th>
            <th className="px-2 py-2 text-right">Rate</th>
            <th className="px-2 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="h-24 align-top">
            <td className="px-2 py-2">1</td>
            <td className="px-2 py-2">{material.name}</td>
            <td className="px-2 py-2">{material.hsn ?? ""}</td>
            <td className="px-2 py-2 text-right">{plain(load.billableKg)}</td>
            <td className="px-2 py-2 text-right">{plain(load.rate)}</td>
            <td className="px-2 py-2 text-right">{rupees2(load.amount)}</td>
          </tr>
        </tbody>
        <tfoot className="border-t border-black">
          <tr>
            <td colSpan={5} className="px-2 py-1 text-right">
              Taxable value
            </td>
            <td className="px-2 py-1 text-right">{rupees2(load.amount)}</td>
          </tr>
          {interState ? (
            <tr>
              <td colSpan={5} className="px-2 py-1 text-right">
                IGST @ {plain(load.gstRate)}%
              </td>
              <td className="px-2 py-1 text-right">{rupees2(load.igst)}</td>
            </tr>
          ) : (
            <>
              <tr>
                <td colSpan={5} className="px-2 py-1 text-right">
                  CGST @ {plain(half)}%
                </td>
                <td className="px-2 py-1 text-right">{rupees2(load.cgst)}</td>
              </tr>
              <tr>
                <td colSpan={5} className="px-2 py-1 text-right">
                  SGST @ {plain(half)}%
                </td>
                <td className="px-2 py-1 text-right">{rupees2(load.sgst)}</td>
              </tr>
            </>
          )}
          <tr className="border-t border-black bg-[#f6efe3] text-base font-bold">
            <td colSpan={5} className="px-2 py-2 text-right">
              Invoice total
            </td>
            <td className="px-2 py-2 text-right">{rupees2(load.total)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-2">
        <b>Amount in words:</b> {amountInWords(load.total)}
      </p>
      <p className="mt-1 text-xs text-black/70">
        Weighbridge: gross {plain(load.grossKg)} kg · tare {plain(load.tareKg)} kg · net {plain(load.netKg)} kg
        {load.deductionKg ? ` · deduction ${plain(load.deductionKg)} kg` : ""}
      </p>

      <div className="mt-14 flex justify-between text-xs">
        <div className="max-w-[55%] text-black/70">
          Declaration: We declare that this invoice shows the actual price of the goods described and that all
          particulars are true and correct.
        </div>
        <div className="text-center">
          <div className="mb-10 font-semibold">For {BUSINESS.legalName}</div>
          <div className="border-t border-black px-6 pt-1">Authorised signatory</div>
        </div>
      </div>
    </section>
  );
}
