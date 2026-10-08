"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

export { toast };

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group border bg-card text-card-foreground shadow-md rounded-lg",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
        },
      }}
    />
  );
}
