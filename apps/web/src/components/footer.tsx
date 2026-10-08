export function Footer() {
  return (
    <footer className="absolute bottom-0 w-full p-4 text-center text-xs text-muted-foreground">
      © {new Date().getFullYear()} CoinsLite
    </footer>
  );
}
