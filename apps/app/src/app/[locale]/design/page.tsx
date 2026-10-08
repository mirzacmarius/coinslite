import { notFound } from "next/navigation";
import { DesignGallery } from "./gallery";

export const metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

/** A living reference for the design system. Never served in production. */
export default function Page() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <DesignGallery />;
}
