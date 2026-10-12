"use client";

import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { calledOffReasons } from "@coinslite/backend/convex/homeCurrency/rules";
import type { HomeCurrency, MoneyFormatOptions } from "@coinslite/i18n";
import { toast } from "@coinslite/ui/toaster";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";

/**
 * The currency a Home currency change is converting the Collection's amounts
 * to in the background, if one is under way (or stopped part-way). Until
 * it's done, the Collection's money shows as "Converting to …" rather than
 * half in each currency, and amounts can't be edited.
 */
export function useConvertingTo(): HomeCurrency | undefined {
  const change = useQuery(api.users.getUser)?.homeCurrencyChange;
  return change?.state === "converting" || change?.state === "stalled"
    ? change.to
    : undefined;
}

/**
 * For a form with amount fields: the Home currency its amounts are in (the
 * one when it opened, sent with them as `amountsIn`), and why they can't be
 * edited now, if they can't: a change of the Home currency is converting
 * them, or changed it while the form was open.
 */
export function useAmountsCurrency(open: boolean) {
  const t = useI18n();
  const home = useQuery(api.users.getUser)?.homeCurrency;
  const convertingTo = useConvertingTo();
  const [amountsIn, setAmountsIn] = useState<HomeCurrency>();
  useEffect(() => {
    if (!open) setAmountsIn(undefined);
    else if (home) setAmountsIn((pinned) => pinned ?? home);
  }, [open, home]);
  const locked = convertingTo
    ? t("homeCurrency.amountsWait", { currency: convertingTo })
    : home && amountsIn && home !== amountsIn
      ? t("homeCurrency.changedWhileOpen", { currency: home })
      : undefined;
  return { amountsIn, currency: amountsIn ?? home, locked };
}

/**
 * Formats an amount of the Collection's in its Home currency, or says the
 * amounts are being converted while a Home currency change is under way.
 */
export function useMoney() {
  const t = useI18n();
  const format = useFormatters();
  const convertingTo = useConvertingTo();
  return (
    amount: number,
    currency: HomeCurrency,
    options?: MoneyFormatOptions,
  ) =>
    convertingTo
      ? t("homeCurrency.converting", { currency: convertingTo })
      : format.money(amount, currency, options);
}

/**
 * Says how a Home currency change in the background went, wherever the
 * person is in the app: done, stopped part-way (with a way to try again), or
 * called off. One called off is said once, even when it happened while the
 * app was closed.
 */
export function HomeCurrencyChangeNotices() {
  const t = useI18n();
  const user = useQuery(api.users.getUser);
  const dismissFailure = useMutation(api.homeCurrency.dismissFailure);
  const retry = useMutation(api.homeCurrency.retryChange);
  // The currency a change was converting to when last seen.
  const watched = useRef<HomeCurrency | undefined>(undefined);
  const change = user?.homeCurrencyChange;
  const state = change?.state;
  const to = change?.to;
  const reason = change?.state === "failed" ? change.reason : undefined;
  const current = user?.homeCurrency;

  useEffect(() => {
    const id = "home-currency-change";
    if (state === "converting") {
      watched.current = to;
      return;
    }
    if (state === "stalled") {
      // Said once per stop, not on every visit.
      if (watched.current === to)
        toast.error(t("homeCurrency.stalled", { currency: to }), {
          id,
          action: {
            label: t("homeCurrency.retry"),
            onClick: () => retry().catch(() => undefined),
          },
        });
      watched.current = undefined;
      return;
    }
    if (state === "failed") {
      toast.error(
        reason === calledOffReasons.amountTooLarge
          ? t("homeCurrency.calledOff", { currency: to })
          : t("homeCurrency.failed"),
        { id },
      );
      // Left undismissed, the next visit says it again.
      dismissFailure().catch(() => undefined);
    } else if (watched.current !== undefined && watched.current === current) {
      toast.success(t("homeCurrency.changed", { currency: current }), { id });
    }
    watched.current = undefined;
  }, [state, to, reason, current, t, dismissFailure, retry]);

  return null;
}
