import Link from "next/link";

export function Footer() {
  return (
    <footer className="flex w-full items-center justify-center gap-4 p-4 text-xs text-muted-foreground">
      <span>© {new Date().getFullYear()} CoinsLite</span>
      <Link href="/privacy" className="hover:text-foreground">
        Privacy policy
      </Link>
      <Link href="/terms" className="hover:text-foreground">
        Terms of use
      </Link>
    </footer>
  );
}
