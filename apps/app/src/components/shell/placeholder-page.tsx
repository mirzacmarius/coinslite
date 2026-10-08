import { getI18n } from "@/locales/server";
import { EmptyState } from "@coinslite/ui/empty-state";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { type NavKey, navItems } from "./navigation";

/** Stands in for a section that a later release fills in. */
export async function PlaceholderPage({ section }: { section: NavKey }) {
  const t = await getI18n();
  const Icon = navItems.find(({ key }) => key === section)?.icon;
  return (
    <>
      <HeaderBar title={t(`nav.${section}`)} />
      <div className="p-4">
        <EmptyState
          icon={
            Icon && (
              <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
            )
          }
          title={t("placeholder.title")}
          description={t("placeholder.description")}
        />
      </div>
    </>
  );
}

export async function placeholderMetadata(section: NavKey) {
  const t = await getI18n();
  return { title: t(`nav.${section}`) };
}
