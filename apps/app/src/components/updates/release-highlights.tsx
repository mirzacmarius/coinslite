"use client";

import { isCurrent } from "@/components/shell/navigation";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Button } from "@coinslite/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@coinslite/ui/dialog";
import { useMutation } from "convex/react";
import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { updatesHref } from "./updates-href";
import { useUpdatesStatus } from "./use-updates-status";

/**
 * The highlights of a new release, shown once: the first time someone opens
 * the app after it ships. Closing them, or going on to the full list, is
 * enough; the marker on Account stays until the list is opened.
 */
export function ReleaseHighlights() {
  const t = useI18n();
  const { date } = useFormatters();
  const pathname = usePathname();
  const dismiss = useMutation(api.updates.dismissHighlights);
  const highlights = useUpdatesStatus()?.highlights ?? null;
  const [closed, setClosed] = useState<string>();
  // Keeps the text on screen while the dialog fades out, once the backend has moved on.
  const [shown, setShown] = useState(highlights);
  if (highlights && highlights !== shown) setShown(highlights);
  const gotIt = useRef<HTMLButtonElement>(null);

  if (!shown) return null;
  const open =
    highlights !== null &&
    highlights.version !== closed &&
    !isCurrent(pathname, updatesHref);
  const close = () => {
    setClosed(shown.version);
    // If this fails, the highlights come back next time: nothing else to do.
    dismiss({}).catch(() => undefined);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        className="sm:max-w-[480px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          gotIt.current?.focus();
        }}
      >
        <DialogHeader className="items-start">
          <div className="flex min-w-0 flex-col gap-0.5">
            <DialogTitle>
              {t("updates.highlightsTitle", { version: shown.version })}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {date(shown.date)}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t("updates.close")}
            >
              <X strokeWidth={1.75} />
            </Button>
          </DialogClose>
        </DialogHeader>
        <ul className="flex list-disc flex-col gap-2 pb-4 pl-8 pr-4 text-sm marker:text-muted-foreground">
          {shown.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="ghost" asChild>
            <Link href={updatesHref} onClick={close}>
              {t("updates.seeAll")}
            </Link>
          </Button>
          <Button ref={gotIt} onClick={close}>
            {t("updates.gotIt")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
