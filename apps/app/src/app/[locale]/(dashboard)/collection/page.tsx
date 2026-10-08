import {
  PlaceholderPage,
  placeholderMetadata,
} from "@/components/shell/placeholder-page";

export const generateMetadata = () => placeholderMetadata("collection");

export default function Page() {
  return <PlaceholderPage section="collection" />;
}
