import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/actions/util";
import { insertSnapshot, parseSnapshot } from "@/lib/records";

/**
 * Undo endpoint. A plain route (not a server action) so it runs immediately,
 * even while the page is still navigating after the delete.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  const snapshot = parseSnapshot(await req.json().catch(() => null));
  if (!snapshot) return Response.json({ error: "Nothing to restore" }, { status: 400 });

  const restored = await insertSnapshot(snapshot);
  for (const { table, rows } of snapshot) {
    if (rows.length) await audit(user.email, "restore", table, rows[0].id);
  }
  revalidatePath("/", "layout");
  return Response.json({ restored });
}
