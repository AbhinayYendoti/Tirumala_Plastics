"use client";

import { useRouter } from "next/navigation";
import { startTransition, useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { deleteRecord, setArchived } from "@/lib/actions/records";
import type { RecordKind, Snapshot } from "@/lib/snapshot";
import { removalMode } from "@/lib/calc";
import { ConfirmDelete } from "./controls";
import { Spinner } from "./spinner";
import { useToast } from "./toast";
import { Badge, cx } from "./ui";

/** Puts back whatever a delete removed, with feedback either way. */
export function useUndo() {
  const toast = useToast();
  const router = useRouter();

  // A plain fetch rather than a server action: server actions wait behind any
  // navigation still in flight (e.g. the jump back to the list after deleting).
  return async function undo(snapshot: Snapshot, label: string) {
    try {
      const res = await fetch("/api/records/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ message: `${label} restored` });
      router.refresh();
    } catch (e) {
      console.error("[undo] restore failed", e);
      toast({ message: `Couldn't restore the ${label.toLowerCase()}. Please add it again.`, tone: "error" });
    }
  };
}

/** Delete with an Undo toast. Used by sheets and detail pages. */
export function useRemove() {
  const toast = useToast();
  const router = useRouter();
  const undo = useUndo();

  return async function remove(kind: RecordKind, id: number, opts: { label: string; goTo?: string }) {
    const res = await deleteRecord(kind, id);
    if (!res.ok) {
      toast({ message: res.error, tone: "error" });
      return false;
    }
    if (opts.goTo) router.push(opts.goTo);
    toast({
      message: `${opts.label} deleted${res.note ? ` ${res.note}` : ""}`,
      action: { label: "Undo", onClick: () => undo(res.snapshot, opts.label) },
    });
    return true;
  };
}

type Archivable = "party" | "worker" | "material";

/**
 * The one place a record is removed from: Delete when nothing refers to it,
 * Archive when it has history (so khata / payroll never lose entries), Restore when archived.
 */
export function RecordActions({
  kind,
  id,
  label,
  usage = 0,
  archived = false,
  listHref,
  onDone,
}: {
  kind: RecordKind;
  id: number;
  label: string;
  usage?: number;
  archived?: boolean;
  listHref?: string;
  onDone?: () => void;
}) {
  const remove = useRemove();
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const archivable = kind === "party" || kind === "worker" || kind === "material";

  const toggleArchive = (next: boolean) =>
    start(async () => {
      await setArchived(kind as Archivable, id, next);
      onDone?.();
      router.refresh();
      toast({
        message: `${label} ${next ? "archived" : "restored"}`,
        action: next
          ? { label: "Undo", onClick: () => startTransition(() => setArchived(kind as Archivable, id, false)) }
          : undefined,
      });
    });

  if (archivable && archived) {
    return (
      <div className="flex items-center gap-2">
        <Badge tone="gold">Archived</Badge>
        <button
          type="button"
          onClick={() => toggleArchive(false)}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-maroon hover:bg-maroon/5"
        >
          {pending ? <Spinner size="sm" /> : <ArchiveRestore size={16} />} Restore
        </button>
      </div>
    );
  }

  if (archivable && removalMode(usage) === "archive") {
    return (
      <button
        type="button"
        onClick={() => toggleArchive(true)}
        disabled={pending}
        title={`Has ${usage} entries — archiving keeps the history`}
        className={cx(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-line/60",
        )}
      >
        {pending ? <Spinner size="sm" /> : <Archive size={16} />} Archive
      </button>
    );
  }

  return (
    <ConfirmDelete
      onConfirm={async () => {
        const ok = await remove(kind, id, { label, goTo: listHref });
        if (ok) onDone?.();
      }}
    />
  );
}
