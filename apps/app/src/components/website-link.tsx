"use client";

import { env } from "@/env.mjs";
import { useCurrentLocale } from "@/locales/client";

/** A link to the marketing site's home page, in the language the app shows. */
export function WebsiteLink({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const locale = useCurrentLocale();
  return (
    <a href={`${env.NEXT_PUBLIC_WEB_URL}/${locale}`} className={className}>
      {children}
    </a>
  );
}
