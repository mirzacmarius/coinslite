import { getI18n } from "@/locales/server";
import type { NavKey } from "./navigation";

/** The page title of a section that a later release fills in. */
export async function placeholderMetadata(section: NavKey) {
  const t = await getI18n();
  return { title: t(`nav.${section}`) };
}
