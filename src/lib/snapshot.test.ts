import { describe, expect, it } from "vitest";
import { parseSnapshot } from "./snapshot";

describe("parseSnapshot", () => {
  it("revives timestamps that became strings in JSON", () => {
    const json = JSON.parse(
      JSON.stringify([{ table: "party", rows: [{ id: 7, name: "Ravi", createdAt: new Date("2026-09-29T10:00:00Z") }] }]),
    );
    const snap = parseSnapshot(json)!;
    expect(snap[0].rows[0].createdAt).toBeInstanceOf(Date);
    expect((snap[0].rows[0].createdAt as Date).toISOString()).toBe("2026-09-29T10:00:00.000Z");
    expect(snap[0].rows[0].name).toBe("Ravi");
  });

  it("rejects unknown tables and malformed input", () => {
    expect(parseSnapshot([{ table: "users", rows: [{ id: 1 }] }])).toBeNull();
    expect(parseSnapshot({ table: "party" })).toBeNull();
    expect(parseSnapshot(null)).toBeNull();
  });
});
