# Tirumala Plastics — daily register

Private web app for **Tirumala Plastics**, Kottavalasa. It records scrap coming in, material going out, party khata, worker salaries and daily expenses. It works on a phone and can be installed to the home screen.

**Stack:** Next.js 15 (App Router, server actions) · Neon Postgres + Drizzle ORM · Clerk auth · Tailwind CSS v4. Everything, backend included, runs as one Vercel deployment.

## What it does

| Screen | Purpose |
| --- | --- |
| **Home** | Today's and this month's kg / ₹ in and out, a 30-day chart, yard stock by material, top dues |
| **Inward** | Truck with scrap arrives: gross − tare = net, less deduction (kg or %) = billable × rate. Optionally record cash paid on the spot. Prints a weighment slip. |
| **Outward** | Dispatch to a buyer with GST (CGST+SGST inside AP, IGST for other states), invoice no. and e-way bill (flagged above ₹50,000). Prints a tax invoice. |
| **Payments / Parties** | Khata per supplier/buyer with a running balance. Filter by *To pay* and *To receive*. |
| **Workers** | Monthly fixed-salary sheet: advances, salary paid, balance, month by month |
| **Expenses** | One-tap diesel (litres), current bill (units, meter reading), repairs, transport, tea & food |
| **Reports** | Any date range: material in/out, rough margin, output GST, expenses by head. Print or download CSV for Excel. |

The app remembers the last rate per material and recent vehicle numbers. You can add a new party or material from inside the load form.

## Setup

1. **Install:** `npm install`
2. **Neon:** create a project and copy the *pooled* connection string.
3. **Clerk:** create an application with Email (and optionally Google) sign-in. In *Configure → Restrictions*, set sign-up mode to **Restricted** and add the two emails to the allowlist.
4. **Env:** `cp .env.example .env` and fill it in. `ALLOWED_EMAILS` is a second lock enforced by the app.
5. **Database:**
   ```bash
   npm run db:migrate   # creates the tables from ./drizzle
   npm run db:seed      # adds common materials (PP, HDPE, LDPE, PET, granules…)
   ```
6. **Run:** `npm run dev`, then open http://localhost:3000

## Deploy (Vercel)

1. Push to a **private** GitHub repo and import it in Vercel (framework: Next.js, all defaults).
2. Add the env vars from `.env.example` for **Production** (and Preview if you use preview links). Use `ALLOWED_EMAILS` with the owners' emails.
3. Deploy. `vercel.json` pins the server to Singapore (`sin1`), next to the Neon database.
4. Clerk: add the Vercel URL under *Domains*; in *Sessions → Customize session token* add
   `{"email": "{{user.primary_email_address}}", "name": "{{user.first_name}}"}` (saves a Clerk API call per request).
5. On each phone, open the site and choose **Add to Home Screen**.

Schema changes: run `npm run db:generate`, commit the new file in `./drizzle`, then `npm run db:migrate` against the production database **before** deploying the code that uses it.

No separate backend on Render is needed; server actions and route handlers run on Vercel.

## Scripts

`npm run dev` (Turbopack, writes to `.next-dev`) · `build` · `preview` (production build on :3001) · `lint` · `test` (unit) · `test:e2e` (every business flow against `DATABASE_URL`; cleans up after itself) · `db:generate` · `db:migrate` · `db:studio`

## Notes

- Business details used on printouts live in `src/lib/business.ts`.
- The logo is `public/logo.svg` (full) and `public/logo-mark.svg` (emblem): the Srivari namam under the kireetam, inside a three-arc ring.
- Yard stock is bought kg − sold kg per material. It does not subtract processing loss. If scrap is sold under a different material name (for example as granules), compare the totals.
