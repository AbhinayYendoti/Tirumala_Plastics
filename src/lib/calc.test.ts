import { describe, expect, it } from "vitest";
import {
  computeGst,
  computeLoad,
  deductionFromPercent,
  needsEwayBill,
  partyBalance,
  removalMode,
  salaryBalance,
} from "./calc";
import { amountInWords, monthRange, shiftDays } from "./format";

describe("computeLoad", () => {
  it("derives net, billable and amount from weighbridge readings", () => {
    expect(computeLoad({ grossKg: 12450, tareKg: 5230, deductionKg: 120, rate: 28.5 })).toEqual({
      netKg: 7220,
      billableKg: 7100,
      amount: 202350,
    });
  });

  it("never goes negative when tare exceeds gross", () => {
    expect(computeLoad({ grossKg: 100, tareKg: 200, rate: 10 })).toEqual({ netKg: 0, billableKg: 0, amount: 0 });
  });

  it("converts a percent deduction to kg", () => {
    expect(deductionFromPercent(7220, 2)).toBe(144.4);
  });
});

describe("computeGst", () => {
  it("splits CGST/SGST inside Andhra Pradesh", () => {
    expect(computeGst(100000, 18, "37")).toEqual({ cgst: 9000, sgst: 9000, igst: 0, total: 118000 });
  });

  it("charges IGST for other states", () => {
    expect(computeGst(100000, 18, "36")).toEqual({ cgst: 0, sgst: 0, igst: 18000, total: 118000 });
  });

  it("keeps paise consistent when tax is odd", () => {
    const g = computeGst(1000.05, 18, "37");
    expect(g.cgst + g.sgst).toBeCloseTo(180.01, 2);
    expect(g.total).toBeCloseTo(1180.06, 2);
  });

  it("flags e-way bill above ₹50,000", () => {
    expect(needsEwayBill(50000)).toBe(false);
    expect(needsEwayBill(50000.01)).toBe(true);
  });
});

describe("balances", () => {
  it("party: purchases increase what we owe, sales and payments reduce it", () => {
    expect(partyBalance({ opening: 5000, inwardAmount: 200000, outwardTotal: 0, paid: 150000, received: 0 })).toBe(55000);
    expect(partyBalance({ opening: 0, inwardAmount: 0, outwardTotal: 118000, paid: 0, received: 100000 })).toBe(-18000);
  });

  it("deletes unused records but archives ones with history", () => {
    expect(removalMode(0)).toBe("delete");
    expect(removalMode(3)).toBe("archive");
  });

  it("salary: fixed salary minus advances and payments", () => {
    expect(salaryBalance({ monthlySalary: 15000, advances: 4000, salaryPaid: 6000 })).toBe(5000);
  });
});

describe("format helpers", () => {
  it("writes amounts in Indian words", () => {
    expect(amountInWords(118000)).toBe("Rupees One Lakh Eighteen Thousand Only");
    expect(amountInWords(12345678.5)).toBe(
      "Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight and Fifty Paise Only",
    );
  });

  it("handles month ranges and day shifts", () => {
    expect(monthRange("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(shiftDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
