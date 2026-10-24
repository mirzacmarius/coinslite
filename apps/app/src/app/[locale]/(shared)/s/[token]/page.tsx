import {
  SharedPage,
  SharedPageSkeleton,
} from "@/components/shares/shared-page";
import { getI18n } from "@/locales/server";
import { api } from "@coinslite/backend/convex/_generated/api";
import { isShareToken } from "@coinslite/backend/convex/shares/rules";
import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";

type Params = Promise<{ token: string }>;

/**
 * The tab's title and a link preview's name what the link opens, read from
 * the backend on the server. Search engines are asked to leave the page out:
 * a share link is as private as the people it was given to.
 */
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const t = await getI18n();
  const { token } = await params;
  const shared = isShareToken(token)
    ? await fetchQuery(api.shares.view, { token }).catch(() => null)
    : null;
  const title = shared
    ? `${shared.kind === "album" ? shared.name : shared.title} · ${t(
        shared.kind === "album" ? "shared.album" : "shared.set",
      )} · CoinsLite`
    : `${t("shared.goneTitle")} · CoinsLite`;
  return {
    title,
    description: t("common.appDescription"),
    robots: { index: false, follow: false },
  };
}

/** The token comes from the URL, so the page is read inside Suspense. */
export default function Page() {
  return (
    <Suspense fallback={<SharedPageSkeleton />}>
      <SharedPage />
    </Suspense>
  );
}
