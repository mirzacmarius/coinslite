import { LanguageMenu } from "@/components/preferences";
import { WebsiteLink } from "@/components/website-link";
import { Logo } from "@coinslite/ui/logo";

/** Sign-in, sign-up and their email steps: one calm column under a slim bar. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="flex h-12 items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
        <WebsiteLink className="rounded-md text-ui font-medium">
          <Logo />
        </WebsiteLink>
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
