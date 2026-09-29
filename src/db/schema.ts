import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  numeric,
  date,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const money = (name: string) => numeric(name, { precision: 14, scale: 2, mode: "number" });
const kg = (name: string) => numeric(name, { precision: 12, scale: 2, mode: "number" });
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const partyType = pgEnum("party_type", ["supplier", "buyer", "both"]);
export const payDirection = pgEnum("pay_direction", ["paid", "received"]);
export const payMode = pgEnum("pay_mode", ["cash", "upi", "bank", "cheque"]);
export const salaryTxnType = pgEnum("salary_txn_type", ["advance", "salary", "bonus"]);
export const expenseCategory = pgEnum("expense_category", [
  "diesel",
  "electricity",
  "maintenance",
  "transport",
  "food",
  "other",
]);

export const parties = pgTable("parties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: partyType("type").notNull().default("both"),
  phone: text("phone"),
  gstin: text("gstin"),
  address: text("address"),
  stateCode: text("state_code").notNull().default("37"),
  // Positive = we owe them, negative = they owe us
  openingBalance: money("opening_balance").notNull().default(0),
  archived: boolean("archived").notNull().default(false),
  createdAt: createdAt(),
});

export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  hsn: text("hsn"),
  defaultRate: money("default_rate"),
  archived: boolean("archived").notNull().default(false),
  createdAt: createdAt(),
});

const loadColumns = () => ({
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  partyId: integer("party_id")
    .notNull()
    .references(() => parties.id),
  materialId: integer("material_id")
    .notNull()
    .references(() => materials.id),
  vehicleNo: text("vehicle_no"),
  grossKg: kg("gross_kg").notNull(),
  tareKg: kg("tare_kg").notNull(),
  netKg: kg("net_kg").notNull(),
  deductionKg: kg("deduction_kg").notNull().default(0),
  billableKg: kg("billable_kg").notNull(),
  rate: money("rate").notNull(),
  amount: money("amount").notNull(),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: createdAt(),
});

export const inwardLoads = pgTable(
  "inward_loads",
  {
    ...loadColumns(),
    billNo: text("bill_no"),
  },
  (t) => [index("inward_date_idx").on(t.date), index("inward_party_idx").on(t.partyId)],
);

export const outwardLoads = pgTable(
  "outward_loads",
  {
    ...loadColumns(),
    invoiceNo: text("invoice_no"),
    ewayBillNo: text("eway_bill_no"),
    gstRate: numeric("gst_rate", { precision: 5, scale: 2, mode: "number" }).notNull().default(18),
    cgst: money("cgst").notNull().default(0),
    sgst: money("sgst").notNull().default(0),
    igst: money("igst").notNull().default(0),
    total: money("total").notNull(),
  },
  (t) => [
    index("outward_date_idx").on(t.date),
    index("outward_party_idx").on(t.partyId),
    // Two loads can never share an invoice number (blank ones are allowed).
    uniqueIndex("outward_invoice_no_uq").on(t.invoiceNo),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    partyId: integer("party_id")
      .notNull()
      .references(() => parties.id),
    direction: payDirection("direction").notNull(),
    amount: money("amount").notNull(),
    mode: payMode("mode").notNull().default("cash"),
    reference: text("reference"),
    notes: text("notes"),
    // Set when the money was paid / received on the spot while saving a load.
    // Deleting the load removes the payment with it.
    inwardLoadId: integer("inward_load_id").references(() => inwardLoads.id, { onDelete: "cascade" }),
    outwardLoadId: integer("outward_load_id").references(() => outwardLoads.id, { onDelete: "cascade" }),
    createdBy: text("created_by"),
    createdAt: createdAt(),
  },
  (t) => [
    index("payments_date_idx").on(t.date),
    index("payments_party_idx").on(t.partyId),
    index("payments_inward_load_idx").on(t.inwardLoadId),
    index("payments_outward_load_idx").on(t.outwardLoadId),
  ],
);

export const workers = pgTable("workers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role"),
  monthlySalary: money("monthly_salary").notNull(),
  joinDate: date("join_date", { mode: "string" }),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const salaryTxns = pgTable(
  "salary_txns",
  {
    id: serial("id").primaryKey(),
    workerId: integer("worker_id")
      .notNull()
      .references(() => workers.id),
    date: date("date", { mode: "string" }).notNull(),
    month: text("month").notNull(), // YYYY-MM the payment belongs to
    type: salaryTxnType("type").notNull(),
    amount: money("amount").notNull(),
    mode: payMode("mode").notNull().default("cash"),
    notes: text("notes"),
    createdBy: text("created_by"),
    createdAt: createdAt(),
  },
  (t) => [index("salary_worker_month_idx").on(t.workerId, t.month)],
);

export const expenses = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    category: expenseCategory("category").notNull(),
    amount: money("amount").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 2, mode: "number" }), // litres / units
    meterReading: text("meter_reading"),
    mode: payMode("mode").notNull().default("cash"),
    notes: text("notes"),
    createdBy: text("created_by"),
    createdAt: createdAt(),
  },
  (t) => [index("expenses_date_idx").on(t.date)],
);

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userEmail: text("user_email").notNull(),
  action: text("action").notNull(), // create | update | delete
  entity: text("entity").notNull(),
  entityId: integer("entity_id"),
  createdAt: createdAt(),
});

export type Party = typeof parties.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type InwardLoad = typeof inwardLoads.$inferSelect;
export type OutwardLoad = typeof outwardLoads.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Worker = typeof workers.$inferSelect;
export type SalaryTxn = typeof salaryTxns.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
