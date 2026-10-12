"use client";

import {
  type CommonsFile,
  type CommonsProblem,
  commonsFileTitle,
  downloadCommonsPicture,
  fetchCommonsFile,
} from "@/lib/commons-image";
import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import { Field } from "@coinslite/ui/field";
import { Input } from "@coinslite/ui/input";
import { Loader2 } from "lucide-react";
import { useId, useState } from "react";

const placeholder = "https://commons.wikimedia.org/wiki/File:…";

type Status =
  | { step: "idle" }
  | { step: "reading" | "downloading" }
  | { step: "failed"; problem: CommonsProblem | "notCommonsFile" | "failed" };

/**
 * "From Wikimedia Commons" in the Catalog image dialog: the admin pastes a
 * file page's address, the file's licences and creator are read from the
 * Commons API and its picture is downloaded into the browser, then handed
 * to `onPicture` to convert and store like a chosen file, with its credit
 * filled in. Files whose licence isn't public domain, CC0, CC BY or CC BY-SA
 * are refused. It reminds the admin that the design must be free too.
 */
export function CatalogImageCommons({
  disabled,
  filledFrom,
  onBusyChange,
  onPicture,
}: {
  disabled: boolean;
  /** The file whose picture and credit the dialog took, once it took one. */
  filledFrom?: CommonsFile;
  onBusyChange: (busy: boolean) => void;
  onPicture: (file: CommonsFile, picture: Blob) => Promise<void>;
}) {
  const t = useI18n();
  const id = useId();
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<Status>({ step: "idle" });
  const busy = status.step === "reading" || status.step === "downloading";

  const fetchFile = async () => {
    if (busy || disabled || !address.trim()) return;
    const title = commonsFileTitle(address);
    if (!title) {
      setStatus({ step: "failed", problem: "notCommonsFile" });
      return;
    }
    onBusyChange(true);
    try {
      setStatus({ step: "reading" });
      const result = await fetchCommonsFile(title);
      if ("problem" in result) {
        setStatus({ step: "failed", problem: result.problem });
        return;
      }
      setStatus({ step: "downloading" });
      const picture = await downloadCommonsPicture(result.file.imageUrl);
      setStatus({ step: "idle" });
      await onPicture(result.file, picture);
    } catch {
      setStatus({ step: "failed", problem: "failed" });
    } finally {
      onBusyChange(false);
    }
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-xs font-medium">
        {t("catalogImages.commons.title")}
      </legend>
      <Field
        id={`${id}-address`}
        label={t("catalogImages.commons.address")}
        hint={t("catalogImages.commons.hint")}
        error={
          status.step === "failed"
            ? t(`catalogImages.commons.errors.${status.problem}`)
            : undefined
        }
      >
        {(control) => (
          <div className="flex gap-2">
            <Input
              {...control}
              type="url"
              inputMode="url"
              placeholder={placeholder}
              value={address}
              disabled={busy}
              onChange={(event) => setAddress(event.target.value)}
              onKeyDown={(event) => {
                // Enter fetches the file here instead of saving the dialog.
                if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
                  event.preventDefault();
                  void fetchFile();
                }
              }}
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void fetchFile()}
              disabled={busy || disabled || !address.trim()}
            >
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              {t("catalogImages.commons.fetch")}
            </Button>
          </div>
        )}
      </Field>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {status.step === "reading"
          ? t("catalogImages.commons.reading")
          : status.step === "downloading"
            ? t("catalogImages.commons.downloading")
            : filledFrom
              ? t("catalogImages.commons.read", {
                  title: filledFrom.title,
                  licence: filledFrom.licence.name,
                })
              : null}
      </p>
      {filledFrom && !filledFrom.credit.author && (
        <p className="text-xs text-muted-foreground">
          {t("catalogImages.commons.noAuthor")}
        </p>
      )}
      <p className="rounded-md border bg-muted/50 px-3 py-2 text-xs">
        {t("catalogImages.commons.designReminder")}
      </p>
    </fieldset>
  );
}
