const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const inr2 = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export const rupees = (n: number | null | undefined) => inr.format(n ?? 0);
export const rupees2 = (n: number | null | undefined) => inr2.format(n ?? 0);
export const kgs = (n: number | null | undefined) => `${num.format(n ?? 0)} kg`;
export const tonnes = (n: number | null | undefined) => `${num.format((n ?? 0) / 1000)} t`;
export const plain = (n: number | null | undefined) => num.format(n ?? 0);

/** Today's date (YYYY-MM-DD) in India time, regardless of server timezone. */
export function todayIST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

export const monthOf = (isoDate: string) => isoDate.slice(0, 7);

export function shiftDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { start, end };
}

export function formatDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-");
  return `${d}-${m}-${y}`;
}

export function formatMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const CATEGORY_LABELS: Record<string, string> = {
  diesel: "Diesel",
  electricity: "Electricity",
  maintenance: "Maintenance",
  transport: "Transport",
  food: "Tea & Food",
  other: "Other",
};

export const MODE_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank: "Bank",
  cheque: "Cheque",
};

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number) {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
}

function threeDigits(n: number) {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", rest ? twoDigits(rest) : ""].filter(Boolean).join(" ");
}

/** Indian numbering (lakh / crore), as printed on invoices. */
export function amountInWords(amount: number) {
  const rupeesPart = Math.floor(amount);
  const paise = Math.round((amount - rupeesPart) * 100);
  const parts: string[] = [];
  let n = rupeesPart;
  const crore = Math.floor(n / 1e7);
  n %= 1e7;
  const lakh = Math.floor(n / 1e5);
  n %= 1e5;
  const thousand = Math.floor(n / 1e3);
  n %= 1e3;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push(threeDigits(n));
  const words = parts.join(" ") || "Zero";
  return `Rupees ${words}${paise ? ` and ${twoDigits(paise)} Paise` : ""} Only`;
}
