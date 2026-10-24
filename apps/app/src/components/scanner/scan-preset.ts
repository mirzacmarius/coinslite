import type { api } from "@coinslite/backend/convex/_generated/api";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import type { PhotoSide } from "@coinslite/backend/convex/photos/rules";
import type { ScanItemType } from "@coinslite/backend/convex/scanner/rules";
import type { FunctionReturnType } from "convex/server";

/** What a scan suggests, as the Item form fills it in. */
export type ScanSuggestion = Extract<
  FunctionReturnType<typeof api.scan.identify>,
  { outcome: "suggested" }
>;

/**
 * A scan photo and its thumbnail, uploaded and registered to the person,
 * with a local address to show the photo.
 */
export type ScannedPhoto = {
  storageId: Id<"_storage">;
  thumbnailId: Id<"_storage">;
  url: string;
};

/**
 * What a scan hands the "New Item" form: the Item type (the one read, else
 * the one scanned for), the photos taken, which become the new Item's, and
 * the suggestion when the piece was identified.
 */
export type ScanPreset = {
  itemType: ScanItemType;
  photos: Partial<Record<PhotoSide, ScannedPhoto>>;
  suggestion?: ScanSuggestion;
};
