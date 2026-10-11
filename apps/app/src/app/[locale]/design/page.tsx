import { AdminOnly } from "./admin-only";
import { DesignGallery } from "./gallery";

export const metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

/**
 * A living reference for the design system: every component on one page.
 * Signed-in admins only, in every environment; to anyone else it's not found.
 */
export default function Page() {
  return (
    <AdminOnly>
      <DesignGallery />
    </AdminOnly>
  );
}
