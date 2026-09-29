import { BackButton, PrintButton } from "@/components/controls";
import { LogoMark } from "@/components/logo";
import { requireUser } from "@/lib/auth";
import { BUSINESS } from "@/lib/business";

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="min-h-dvh bg-[#eee7dc] px-3 py-6 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between">
        <BackButton />
        <PrintButton />
      </div>
      <div className="mx-auto max-w-[210mm] bg-white p-6 text-[13px] text-black shadow-sm sm:p-10 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start gap-4 border-b-2 border-maroon pb-4">
          <LogoMark className="h-16 w-16 shrink-0" />
          <div className="flex-1">
            <div className="font-serif text-2xl font-semibold tracking-wide text-maroon">{BUSINESS.legalName}</div>
            {BUSINESS.addressLines.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
          <div className="text-right text-xs">
            <div>
              <b>GSTIN:</b> {BUSINESS.gstin}
            </div>
            <div>
              State: {BUSINESS.state} ({BUSINESS.stateCode})
            </div>
            <div>Cell: {BUSINESS.phone}</div>
            <div>{BUSINESS.email}</div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
