import { type Infer, v } from "convex/values";
import { homeCurrency, language } from "../utils/validators";
import { collectionView } from "./browse";
import { labelItem } from "./labelSheet";

/**
 * What the label sheets are made from (spec 7), shared by the query that
 * reads them and the action that makes the PDF.
 */

/** Which Items labels are printed for: a Collection view's, or chosen ones (select mode's, the Item page's one). */
export const labelSource = v.union(
  v.object({ kind: v.literal("view"), view: collectionView }),
  v.object({ kind: v.literal("items"), itemIds: v.array(v.id("items")) }),
);
export type LabelSource = Infer<typeof labelSource>;

/** Everything the label sheets show, read in one transaction. */
export const labelSheetContents = v.object({
  /** The language the labels are written in. */
  locale: language,
  /** The Home currency the amounts are in. */
  currency: homeCurrency,
  /** The app's address, for the QR codes; null on a deployment without one. */
  appUrl: v.union(v.string(), v.null()),
  /** One per Item, in the view's order or as chosen. */
  items: v.array(labelItem),
});
export type LabelSheetContents = Infer<typeof labelSheetContents>;
