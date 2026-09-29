// Adds the common scrap materials so the first entry is quick. Safe to run more than once.
// Usage: npm run db:seed
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { materials } from "../src/db/schema.ts";

const MATERIALS = [
  { name: "PP scrap", hsn: "3915" },
  { name: "HDPE scrap", hsn: "3915" },
  { name: "LDPE / film scrap", hsn: "3915" },
  { name: "PET bottles", hsn: "3915" },
  { name: "Mixed plastic scrap", hsn: "3915" },
  { name: "PP granules", hsn: "3902" },
  { name: "HDPE granules", hsn: "3901" },
  { name: "Grinded flakes", hsn: "3915" },
];

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL missing — put it in .env");
const db = drizzle(neon(url));

const existing = new Set((await db.select({ name: materials.name }).from(materials)).map((m) => m.name));
const toAdd = MATERIALS.filter((m) => !existing.has(m.name));
if (toAdd.length) await db.insert(materials).values(toAdd);
console.log(`Added ${toAdd.length} materials (${existing.size} already there).`);
