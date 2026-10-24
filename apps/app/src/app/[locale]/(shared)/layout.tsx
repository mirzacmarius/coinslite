import { SharedFrame } from "@/components/shares/shared-frame";

/** Shared Albums and Sets, for whoever has the link, signed in or not. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <SharedFrame>{children}</SharedFrame>;
}
