import { LanguageSwitcher } from "@/components/language-switcher";

export default async function Layout({
  children,
}: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen w-full bg-card">
      <div className="absolute left-1/2 top-8 mx-auto -translate-x-1/2 transform justify-center">
        <span className="text-xl font-medium">CoinsLite</span>
      </div>
      <div className="absolute right-4 top-4 z-20">
        <LanguageSwitcher />
      </div>
      <div className="z-10 h-screen w-screen">{children}</div>
      <div className="base-grid fixed h-screen w-screen opacity-40" />
      <div className="fixed bottom-0 h-screen w-screen bg-gradient-to-t from-[hsl(var(--card))] to-transparent" />
    </div>
  );
}
