import {
  BillingPage,
  BillingPageSkeleton,
} from "@/components/billing/billing-page";
import { getI18n } from "@/locales/server";
import { navigation } from "next/cache";
import { headers } from "next/headers";
import { Suspense } from "react";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("shell.plans") };
}

/**
 * The visitor's country, when the host knows it (Vercel's geolocation), so
 * prices show in the currency checkout will charge. Read once the link is
 * followed, so the links to Plans on every page prefetch a static shell.
 */
async function BillingForVisitor() {
  await navigation();
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
