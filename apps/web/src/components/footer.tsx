import { cacheLife } from "next/cache";
import Link from "next/link";

/** The current year, cached for a day so the prerendered page can carry it. */
async function copyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function Footer() {
  const year = await copyrightYear();
  return (
    <footer className="flex w-full items-center justify-center gap-4 p-4 text-xs text-muted-foreground">
      <span>© {year} CoinsLite</span>
      <Link href="/privacy" className="hover:text-foreground">
        Privacy policy
      </Link>
      <Link href="/terms" className="hover:text-foreground">
        Terms of use
      </Link>
    </footer>
  );
}
