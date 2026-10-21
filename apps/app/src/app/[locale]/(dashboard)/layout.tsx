import { HomeCurrencyChangeNotices } from "@/components/account/home-currency-change";
import { ProfileLanguage } from "@/components/account/profile-language";
import { EndSession, UntilSessionEnds } from "@/components/end-session";
import {
  AddItemProvider,
  AddItemQuickAction,
  AddItemTabButton,
} from "@/components/items/add-item";
import { SidebarPlanUsage } from "@/components/plans/plan-usage";
import { ScanCoinProvider } from "@/components/scanner/scan-coin";
import { AppShell } from "@/components/shell/app-shell";
import { SidebarSpotPrices } from "@/components/spot-prices/spot-prices";
import { ReleaseHighlights } from "@/components/updates/release-highlights";
import { api } from "@coinslite/backend/convex/_generated/api";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

/**
 * Links into the dashboard prefetch static output only, so the sidebar's links
 * cost no server render. Whatever reads the request waits for the click.
 */
export const ensureStatic = "prefetch";

/**
 * Checks the account behind the session. One deleted since is ended, then
 * sign-in opens (a plain redirect would loop: the proxy still sees a valid
 * token). One not set up yet (a first Google or sign-in-link visit) finishes
 * setting up first.
 */
async function AccountCheck() {
  // Per request, never part of a prerendered shell: it reads the session
  // cookie, and the Convex client it creates draws random ids.
  await connection();
  const user = await fetchQuery(
    api.users.getUser,
    {},
    { token: await convexAuthNextjsToken() },
  );
  if (!user) return <EndSession />;
  if (user.termsAcceptedAt === undefined) redirect("/welcome");
  return null;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AddItemProvider>
      <ScanCoinProvider>
        <AppShell
          quickActions={<AddItemQuickAction />}
          phoneAction={<AddItemTabButton />}
          sidebarFooter={
            <>
              <SidebarSpotPrices />
              <SidebarPlanUsage />
            </>
          }
        >
          {/* Alongside the page, not before it: the shell and the page are on
            screen without waiting for the backend. */}
          <Suspense>
            <AccountCheck />
          </Suspense>
          <ProfileLanguage />
          <HomeCurrencyChangeNotices />
          <ReleaseHighlights />
          <UntilSessionEnds>{children}</UntilSessionEnds>
        </AppShell>
      </ScanCoinProvider>
    </AddItemProvider>
  );
}
