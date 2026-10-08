import { getI18n } from "@/locales/server";
import { EmptyState } from "@coinslite/ui/empty-state";
import { PageHeader } from "@coinslite/ui/page-header";
import { type NavKey, navItems } from "./navigation";

/** Stands in for a section that a later release fills in. */
export async function PlaceholderPage({ section }: { section: NavKey }) {
  const t = await getI18n();
  const Icon = navItems.find(({ key }) => key === section)?.icon;
  return (
    <>
      <PageHeader title={t(`nav.${section}`)} />
      <EmptyState
        icon={Icon && <Icon className="size-5" aria-hidden="true" />}
        title={t("placeholder.title")}
        description={t("placeholder.description")}
      />
    </>
  );
}

export async function placeholderMetadata(section: NavKey) {
  const t = await getI18n();
  return { title: t(`nav.${section}`) };
}
