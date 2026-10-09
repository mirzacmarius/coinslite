import type * as React from "react";

/** A plain reading page for legal texts. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 pb-16 pt-24">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-xs text-muted-foreground">{updated}</p>
      <div className="flex flex-col gap-3 text-sm leading-6">{children}</div>
    </main>
  );
}
