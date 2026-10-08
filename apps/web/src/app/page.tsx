import { env } from "@/env";
import { buttonVariants } from "@coinslite/ui/button";

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl md:text-6xl font-medium">CoinsLite</h1>
      <p className="max-w-xl text-muted-foreground md:text-lg">
        Record the coins, banknotes and stamps you own, organise them, and know
        what your collection is worth.
      </p>
      <a
        href={env.NEXT_PUBLIC_APP_URL}
        className={buttonVariants({ size: "sm", className: "rounded-full" })}
      >
        Open the app
      </a>
    </main>
  );
}
