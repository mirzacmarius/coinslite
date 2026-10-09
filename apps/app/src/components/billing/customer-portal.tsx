"use client";

import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { billingErrors } from "@coinslite/backend/convex/billing/rules";
import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { useState } from "react";

/**
 * Opens Polar's customer portal, where a Premium member changes or cancels
 * their subscription. `error` says why it didn't open.
 */
export function useCustomerPortal() {
  const t = useI18n();
  const customerPortal = useAction(api.billing.customerPortal);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string>();

  const open = async () => {
    setError(undefined);
    setOpening(true);
    try {
      const { url } = await customerPortal();
      // Off to Polar; the spinner stays until the page goes.
      window.location.assign(url);
    } catch (failure) {
      setOpening(false);
      const code = failure instanceof ConvexError ? String(failure.data) : "";
      setError(
        t(
          code === billingErrors.unavailable
            ? "billing.portalUnavailable"
            : code === billingErrors.noSubscription
              ? "billing.noSubscription"
              : "billing.portalFailed",
        ),
      );
    }
  };

  return { open, opening, error };
}
