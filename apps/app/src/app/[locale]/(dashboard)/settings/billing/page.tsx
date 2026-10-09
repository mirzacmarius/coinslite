import {
  BillingPage,
  BillingPageSkeleton,
} from "@/components/billing/billing-page";
import { getI18n } from "@/locales/server";
import { headers } from "next/headers";
import { Suspense } from "react";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("shell.plans") };
}

/**
 * The visitor's country, when the host knows it (Vercel's geolocation), so
 * prices show in the currency checkout will charge.
 */
async function BillingForVisitor() {
  const country = (await headers()).get("x-vercel-ip-country") ?? undefined;
  return <BillingPage country={country} />;
}

export default function Page() {
  return (
    <Suspense fallback={<BillingPageSkeleton />}>
      <BillingForVisitor />
    </Suspense>
  );
}
