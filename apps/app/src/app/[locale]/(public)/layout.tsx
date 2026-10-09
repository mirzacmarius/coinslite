import { Logo } from "@/components/logo";
import { LanguageMenu } from "@/components/preferences";
import { env } from "@/env.mjs";

/** Sign-in, sign-up and their email steps: one calm column under a slim bar. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="flex h-12 items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
        <a
          href={env.NEXT_PUBLIC_WEB_URL}
          className="rounded-md text-[13px] font-medium"
        >
          <Logo />
        </a>
        <LanguageMenu />
      </div>
      <main
        id="main"
        className="flex flex-1 justify-center px-4 pb-16 pt-[10dvh]"
      >
        {children}
      </main>
    </div>
  );
}
