"use client";

import { useCurrentLocale, useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { homeCurrencyErrors } from "@coinslite/backend/convex/homeCurrency/rules";
import { type HomeCurrency, homeCurrencies } from "@coinslite/i18n";
import { Button } from "@coinslite/ui/button";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import { PropertyPicker } from "@coinslite/ui/property-picker";
import { toast } from "@coinslite/ui/toaster";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { Clock, Wallet } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Preview = FunctionReturnType<typeof api.homeCurrency.preview>;

/**
 * The Home currency as a pill. Picking another one asks for confirmation,
 * stating how many stored amounts get converted and at which exchange rate.
 * While a change converts in the background, it says so instead, and offers
 * to try again if that stopped part-way.
 */
export function HomeCurrencySetting({
  current,
  hintId,
}: {
  current: HomeCurrency;
  /** The id of the hint under the pill, so it's read with it. */
  hintId?: string;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<HomeCurrency>(current);
  // Each pick starts a fresh confirmation.
  const [attempt, setAttempt] = useState(0);
  const change = useQuery(api.users.getUser)?.homeCurrencyChange;
  const retry = useMutation(api.homeCurrency.retryChange);
  const options = useMemo(() => {
    const names = new Intl.DisplayNames(locale, { type: "currency" });
    return homeCurrencies.map((code) => ({
      value: code,
      label: code,
      hint: names.of(code),
    }));
  }, [locale]);

  if (change?.state === "converting")
    return (
      <p
        role="status"
        aria-describedby={hintId}
        className="text-ui text-muted-foreground"
      >
        {t("homeCurrency.converting", { currency: change.to })}
      </p>
    );
  if (change?.state === "stalled")
    return (
      <div role="status" className="flex flex-col items-start gap-1.5">
        <p className="text-ui text-muted-foreground">
          {t("homeCurrency.stalled", { currency: change.to })}
        </p>
        <Button
          size="xs"
          variant="subtle"
          onClick={() =>
            retry().catch(() => toast.error(t("homeCurrency.failed")))
          }
        >
          {t("homeCurrency.retry")}
        </Button>
      </div>
    );

  return (
    <>
      <PropertyPicker
        icon={Wallet}
        label={t("account.preferences.homeCurrency")}
        aria-describedby={hintId}
        value={current}
        options={options}
        onChange={(value) => {
          if (value === current) return;
          setTarget(value);
          setAttempt((count) => count + 1);
          setOpen(true);
        }}
        noResults={t("items.noMatches")}
      />
      <ChangeDialog
        key={attempt}
        open={open}
        onOpenChange={setOpen}
        to={target}
      />
    </>
  );
}

function ChangeDialog({
  open,
  onOpenChange,
  to,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  to: HomeCurrency;
}) {
  const t = useI18n();
  const change = useMutation(api.homeCurrency.change);
  const [error, setError] = useState<string>();
  // What was confirmed: shown unchanged while the dialog closes, even though
  // the preview itself moves on to the new Home currency.
  const [confirmed, setConfirmed] = useState<Preview>();
  const live = useQuery(
    api.homeCurrency.preview,
    open ? { homeCurrency: to } : "skip",
  );
  // Closing stops the preview; keep showing it while the dialog fades out.
  const last = useRef<Preview | undefined>(undefined);
  useEffect(() => {
    if (live !== undefined) last.current = live;
  });
  const preview = confirmed ?? (open ? live : last.current);

  // Amounts to convert, counted or not, need a rate to convert at.
  const blocked =
    !preview || ((preview.amounts > 0 || !preview.countedAll) && !preview.rate);

  const errorMessage = (code: string) => {
    switch (code) {
      case homeCurrencyErrors.rateChanged:
        return t("homeCurrency.rateChanged");
      case homeCurrencyErrors.rateUnavailable:
        return t("homeCurrency.noRate");
      case homeCurrencyErrors.changing:
        return t("homeCurrency.busy");
      case homeCurrencyErrors.amountTooLarge:
        return t("homeCurrency.amountTooLarge");
      case homeCurrencyErrors.sameCurrency:
        return t("homeCurrency.sameCurrency");
      default:
        return t("homeCurrency.failed");
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("homeCurrency.confirmTitle", { currency: to })}
      description={
        !preview
          ? t("homeCurrency.checking")
          : preview.amounts === 0 && preview.countedAll
            ? t("homeCurrency.nothingToConvert")
            : !preview.rate
              ? t("homeCurrency.noRate")
              : t("homeCurrency.willConvert", {
                  from: preview.from,
                  to: preview.to,
                })
      }
      confirmLabel={t("homeCurrency.confirm", { currency: to })}
      cancelLabel={t("homeCurrency.cancel")}
      confirmDisabled={blocked}
      onConfirm={async () => {
        if (!preview) return;
        setError(undefined);
        setConfirmed(preview);
        let inBackground: boolean;
        try {
          ({ inBackground } = await change({
            homeCurrency: to,
            rate: preview.rate?.value,
          }));
        } catch (failure) {
          const code =
            failure instanceof ConvexError ? String(failure.data) : "";
          setConfirmed(undefined);
          setError(errorMessage(code));
          // Keeps the dialog open, showing the latest rate and the error.
          throw failure;
        }
        // One in the background says when it's done (HomeCurrencyChangeNotices).
        if (inBackground)
          toast.info(t("homeCurrency.convertingStarted", { currency: to }));
        else toast.success(t("homeCurrency.changed", { currency: to }));
      }}
    >
      {preview && (preview.amounts > 0 || !preview.countedAll) && (
        <ConversionFacts preview={preview} />
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </ConfirmDialog>
  );
}

/** How many amounts get converted, at which rate, quoted when. */
function ConversionFacts({ preview }: { preview: Preview }) {
  const t = useI18n();
  const format = useFormatters();
  const { rate } = preview;
  return (
    <div className="flex flex-col gap-2">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md border px-3 py-2 text-ui">
        <dt className="text-muted-foreground">{t("homeCurrency.amounts")}</dt>
        <dd className="text-right">
          {preview.countedAll
            ? format.number(preview.amounts)
            : t("homeCurrency.amountsAtLeast", {
                count: format.number(preview.amounts),
              })}
        </dd>
        {rate && (
          <>
            <dt className="text-muted-foreground">{t("homeCurrency.rate")}</dt>
            <dd className="text-right">
              {t("homeCurrency.rateValue", {
                from: preview.from,
                to: preview.to,
                rate: format.number(rate.value, {
                  maximumSignificantDigits: 4,
                }),
              })}
            </dd>
            <dt className="text-muted-foreground">
              {t("homeCurrency.rateFrom")}
            </dt>
            <dd className="text-right">{format.dateTime(rate.quotedAt)}</dd>
          </>
        )}
      </dl>
      {preview.inBackground && (
        <p className="text-xs text-muted-foreground">
          {t("homeCurrency.inBackground")}
        </p>
      )}
      {rate?.stale && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Clock
            className="mt-px size-3.5 shrink-0"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          {t("homeCurrency.stale")}
        </p>
      )}
    </div>
  );
}
