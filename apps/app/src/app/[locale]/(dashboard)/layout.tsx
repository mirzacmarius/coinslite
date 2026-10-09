import { EndSession } from "@/components/end-session";
import { AppShell } from "@/components/shell/app-shell";
import { api } from "@coinslite/backend/convex/_generated/api";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { Suspense } from "react";

/**
 * A valid session whose account has since been deleted is ended, then sign-in
 * opens. A plain redirect would loop: the proxy still sees a valid token.
 */
async function DeletedAccountCheck() {
  const user = await fetchQuery(
    api.users.getUser,
    {},
    { token: await convexAuthNextjsToken() },
  );
  return user ? null : <EndSession />;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {/* Alongside the page, not before it: the shell and the page are on
          screen without waiting for the backend. */}
      <Suspense>
        <DeletedAccountCheck />
      </Suspense>
      {children}
    </AppShell>
  );
}
