import { placeholderMetadata } from "@/components/shell/placeholder-metadata";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export const generateMetadata = () => placeholderMetadata("albums");

export default function Page() {
  return <PlaceholderPage section="albums" />;
}
