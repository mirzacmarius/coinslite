import { env } from "@/env";
import { buttonVariants } from "@coinslite/ui/button";
import Link from "next/link";

export function Header() {
  return (
    <header className="absolute top-0 w-full flex items-center justify-between p-4 z-10">
      <Link href="/" className="text-sm font-medium">
        CoinsLite
      </Link>
      <a
        href={env.NEXT_PUBLIC_APP_URL}
        className={buttonVariants({ size: "sm", className: "rounded-full" })}
      >
        Sign in
      </a>
    </header>
  );
}
