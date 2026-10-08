import { AppShell } from "@/components/shell/app-shell";
import { api } from "@coinslite/backend/convex/_generated/api";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";

export default async function Layout({
  children,
}: { children: React.ReactNode }) {
  const user = await fetchQuery(
    api.users.getUser,
    {},
    { token: await convexAuthNextjsToken() },
  );
  // A valid session whose account has since been deleted.
  if (!user) {
    return redirect("/login");
  }
  return <AppShell>{children}</AppShell>;
}
