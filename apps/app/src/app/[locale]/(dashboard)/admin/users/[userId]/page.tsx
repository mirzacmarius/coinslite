import { UserDetail } from "@/components/admin/user-detail";
import { getI18n } from "@/locales/server";
import { Suspense } from "react";

export async function generateMetadata() {
  const t = await getI18n();
  return { title: t("adminUsers.title") };
}

/** Admins only. The user comes from the URL, so it's read inside Suspense. */
export default function Page() {
  return (
    <Suspense>
      <UserDetail />
    </Suspense>
  );
}
