import { parseDecimal } from "@/components/items/item-form";
import {
  type CatalogError,
  type CatalogItemType,
  type CatalogKind,
  type CoinEdge,
  type EditorValues,
  type PreciousMetal,
  type TranslationValueKey,
  catalogErrors,
  checkNode,
  coinOnlyValues,
  columnOfValue,
  editorValueKeys,
  readCatalogKey,
  readEditorValues,
  translationValuesOf,
} from "@coinslite/backend/convex/catalog/fields";
import type { Strike } from "@coinslite/backend/convex/items/grades";
import type { Material } from "@coinslite/backend/convex/items/rules";
import { type Locale, formatNumber, locales } from "@coinslite/i18n";

/**
 * The Catalog editor's form for one node: its values as typed, and the rules
 * the backend applies to them (catalog/fields.ts), so every problem shows
 * under its field before anything is sent.
 */

/** Values typed as text; numbers in the person's way of writing them. */
type TextValue =
  | "key"
  | "title"
  | "sortOrder"
  | "denomination"
  | "series"
  | "weight"
  | "fineness"
  | "diameter"
  | "yearFrom"
  | "yearTo"
  | "mint"
  | "mintMark"
  | "composition"
  | "edgeLettering"
  | "thickness"
  | "width"
  | "height"
  | "designers"
  | "mintage"
  | "issueDate"
  | "withdrawalDate"
  | "technicalDetails"
  | "historicalNotes"
  | "numistaId"
  | "factsSource"
  | "factsAuthor"
  | "factsLicence"
  | "factsLink"
  | "notesSource"
  | "notesAuthor"
  | "notesLicence"
  | "notesLink"
  | TranslationValueKey;

export type NodeFormValues = Record<TextValue, string> & {
  /** A root is a country or a Theme; below one, a grouping or a Catalog entry. */
  kind: CatalogKind;
  itemType?: CatalogItemType;
  country?: string;
  material?: Material;
  strike?: Strike;
  metal?: PreciousMetal;
  edge?: CoinEdge;
  /** The language the notes are written in. */
  notesLanguage: string;
};
export type NodeFormField = keyof NodeFormValues;

/** Every translation's values, in each of the app's languages. */
export const translationFields = translationValuesOf(locales);

/** Problems the form finds that the backend has no code for. */
export const formErrors = {
  /** A country root without its country. */
  countryRequired: "COUNTRY_REQUIRED",
} as const;
export type NodeFormProblem =
  | CatalogError
  | (typeof formErrors)[keyof typeof formErrors];

/** The language notes are written in unless the admin says otherwise. */
const defaultLanguage = "en";

/** The node a new one goes below, as the tree knows it. */
export type ParentNode = {
  key: string;
  kind: CatalogKind;
  title: string;
  country?: string;
  itemType?: CatalogItemType;
};

const blankText: Record<TextValue, string> = {
  key: "",
  title: "",
  sortOrder: "0",
  denomination: "",
  series: "",
  weight: "",
  fineness: "",
  diameter: "",
  yearFrom: "",
  yearTo: "",
  mint: "",
  mintMark: "",
  composition: "",
  edgeLettering: "",
  thickness: "",
  width: "",
  height: "",
  designers: "",
  mintage: "",
  issueDate: "",
  withdrawalDate: "",
  technicalDetails: "",
  historicalNotes: "",
  numistaId: "",
  factsSource: "",
  factsAuthor: "",
  factsLicence: "",
  factsLink: "",
  notesSource: "",
  notesAuthor: "",
  notesLicence: "",
  notesLink: "",
  ...(Object.fromEntries(translationFields.map((key) => [key, ""])) as Record<
    TranslationValueKey,
    string
  >),
};

/**
 * A new node's values: a country root, or below a root a grouping, below a
 * grouping a Catalog entry, taking the parent's country and Item type.
 */
export function blankNode(parent: ParentNode | null): NodeFormValues {
  if (!parent)
    return { ...blankText, kind: "country", notesLanguage: defaultLanguage };
  return {
    ...blankText,
    notesLanguage: defaultLanguage,
    kind: parent.kind === "grouping" ? "entry" : "grouping",
    country: parent.country,
    itemType: parent.itemType,
  };
}

/** A stored node's values as the form shows them. */
export function valuesFromNode(
  node: { key: string; kind: CatalogKind; values: EditorValues },
  locale: Locale,
): NodeFormValues {
  const { values } = node;
  const decimal = (value?: number) =>
    value === undefined
      ? ""
      : formatNumber(value, locale, {
          useGrouping: false,
          maximumFractionDigits: 6,
        });
  const whole = (value?: number) => (value === undefined ? "" : String(value));
  const text = (value?: string) => value ?? "";
  return {
    kind: node.kind,
    key: node.key,
    title: values.title,
    sortOrder: decimal(values.sortOrder),
    itemType: values.itemType,
    country: values.country,
    denomination: text(values.denomination),
    series: text(values.series),
    material: values.material,
    strike: values.strike,
    metal: values.metal,
    weight: decimal(values.weight),
    fineness: decimal(values.fineness),
    diameter: decimal(values.diameter),
    yearFrom: whole(values.yearFrom),
    yearTo: whole(values.yearTo),
    mint: text(values.mint),
    mintMark: text(values.mintMark),
    composition: text(values.composition),
    edge: values.edge,
    edgeLettering: text(values.edgeLettering),
    thickness: decimal(values.thickness),
    width: decimal(values.width),
    height: decimal(values.height),
    designers: text(values.designers),
    mintage: whole(values.mintage),
    issueDate: text(values.issueDate),
    withdrawalDate: text(values.withdrawalDate),
    notesLanguage: values.notesLanguage ?? defaultLanguage,
    technicalDetails: text(values.technicalDetails),
    historicalNotes: text(values.historicalNotes),
    numistaId: whole(values.numistaId),
    factsSource: text(values.factsSource),
    factsAuthor: text(values.factsAuthor),
    factsLicence: text(values.factsLicence),
    factsLink: text(values.factsLink),
    notesSource: text(values.notesSource),
    notesAuthor: text(values.notesAuthor),
    notesLicence: text(values.notesLicence),
    notesLink: text(values.notesLink),
    ...(Object.fromEntries(
      translationFields.map((key) => [key, text(values[key])]),
    ) as Record<TranslationValueKey, string>),
  };
}

/** Whether the form's Item type leaves room for a metal and sizes. */
export const hasCoinFacts = (values: Pick<NodeFormValues, "itemType">) =>
  values.itemType !== "banknote";

const optionalText = (text: string) => text.trim() || undefined;

/**
 * What the editor saves from the form, and the numbers it couldn't read. A
 * Theme has no country, and a banknote no metal or sizes, whatever the form
 * still holds for them.
 */
export function editorArgsFrom(form: NodeFormValues) {
  const problems: Partial<Record<NodeFormField, NodeFormProblem>> = {};
  const number = (
    field: NodeFormField,
    text: string,
    read: (text: string) => number | null,
    code: CatalogError = catalogErrors.invalidNumber,
  ) => {
    if (!text.trim()) return undefined;
    const value = read(text.trim());
    if (value === null) problems[field] = code;
    return value ?? undefined;
  };
  /** A number that may be negative, written with either decimal mark and either minus sign. */
  const signed = (typed: string) => {
    const text = typed.replace("\u2212", "-").replace(",", ".");
    return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : null;
  };
  const wholeNumber = (pattern: RegExp) => (typed: string) => {
    const text = typed.replace("\u2212", "-");
    return pattern.test(text) ? Number(text) : null;
  };
  const coin = hasCoinFacts(form);

  const values: EditorValues = {
    title: form.title,
    sortOrder: number("sortOrder", form.sortOrder, signed) ?? 0,
    itemType: form.itemType,
    country: form.kind === "theme" ? undefined : form.country,
    denomination: optionalText(form.denomination),
    series: optionalText(form.series),
    material: coin ? form.material : undefined,
    strike: form.strike,
    metal: coin ? form.metal : undefined,
    weight: coin ? number("weight", form.weight, parseDecimal) : undefined,
    fineness: coin
      ? number("fineness", form.fineness, parseDecimal)
      : undefined,
    diameter: coin
      ? number("diameter", form.diameter, parseDecimal)
      : undefined,
    yearFrom: number(
      "yearFrom",
      form.yearFrom,
      wholeNumber(/^-?\d+$/),
      catalogErrors.invalidYear,
    ),
    yearTo: number(
      "yearTo",
      form.yearTo,
      wholeNumber(/^-?\d+$/),
      catalogErrors.invalidYear,
    ),
    mint: coin ? optionalText(form.mint) : undefined,
    mintMark: coin ? optionalText(form.mintMark) : undefined,
    composition: coin ? optionalText(form.composition) : undefined,
    edge: coin ? form.edge : undefined,
    edgeLettering: coin ? optionalText(form.edgeLettering) : undefined,
    thickness: coin
      ? number("thickness", form.thickness, parseDecimal)
      : undefined,
    width: number("width", form.width, parseDecimal),
    height: number("height", form.height, parseDecimal),
    designers: optionalText(form.designers),
    mintage: number("mintage", form.mintage, wholeNumber(/^\d+$/)),
    issueDate: optionalText(form.issueDate),
    withdrawalDate: optionalText(form.withdrawalDate),
    // English is the default, so it isn't stored.
    notesLanguage:
      form.notesLanguage === defaultLanguage ? undefined : form.notesLanguage,
    technicalDetails: optionalText(form.technicalDetails),
    historicalNotes: optionalText(form.historicalNotes),
    numistaId: number("numistaId", form.numistaId, wholeNumber(/^\d+$/)),
    factsSource: optionalText(form.factsSource),
    factsAuthor: optionalText(form.factsAuthor),
    factsLicence: optionalText(form.factsLicence),
    factsLink: optionalText(form.factsLink),
    notesSource: optionalText(form.notesSource),
    notesAuthor: optionalText(form.notesAuthor),
    notesLicence: optionalText(form.notesLicence),
    notesLink: optionalText(form.notesLink),
    ...Object.fromEntries(
      translationFields.map((key) => [key, optionalText(form[key])]),
    ),
  };
  for (const key of coinOnlyValues) {
    if (!coin) delete problems[key];
  }
  return { values, addable: form.kind === "entry", problems };
}

/** The form field each CSV column's problems belong to. */
const fieldOfColumn: Record<string, NodeFormField> = {
  ...Object.fromEntries(
    editorValueKeys.map((key) => [columnOfValue(key), key]),
  ),
  id: "key",
  is_addable: "kind",
};

/** The field a problem the backend reports by column belongs to, if any. */
export const fieldOfProblem = (code: string): NodeFormField | undefined =>
  (
    ({
      [catalogErrors.duplicateId]: "key",
      [catalogErrors.invalidId]: "key",
      [catalogErrors.idRequired]: "key",
      [catalogErrors.entryHasChildren]: "kind",
      [catalogErrors.entryHasItems]: "kind",
      [catalogErrors.rootNotAddable]: "kind",
      [catalogErrors.titleRequired]: "title",
      [catalogErrors.itemTypeRequired]: "itemType",
    }) as Record<string, NodeFormField>
  )[code];

/**
 * Every problem with the form, one per field: the numbers it can't read,
 * then the rules a Catalog CSV row meets. `creating` checks the new node's id.
 */
export function problemsOf(
  form: NodeFormValues,
  { creating }: { creating: boolean },
): Partial<Record<NodeFormField, NodeFormProblem>> {
  const { values, problems } = editorArgsFrom(form);
  const add = (field: NodeFormField | undefined, code: NodeFormProblem) => {
    if (field && problems[field] === undefined) problems[field] = code;
  };
  if (creating && readCatalogKey(form.key) === undefined)
    add(
      "key",
      form.key.trim() ? catalogErrors.invalidId : catalogErrors.idRequired,
    );
  if (form.kind === "country" && !form.country)
    add("country", formErrors.countryRequired);
  const read = readEditorValues(values);
  for (const problem of [
    ...read.problems,
    ...checkNode(read.values, form.kind),
  ]) {
    add(fieldOfColumn[problem.column], problem.code);
  }
  return problems;
}

/** Letters a node id can't hold, swapped for ones it can. */
const foldedLetters: Record<string, string> = {
  ø: "o",
  æ: "ae",
  œ: "oe",
  ß: "ss",
  ł: "l",
  đ: "d",
};

/**
 * A node id made from its title, below its parent's: "no-coins" and
 * "1 krone 1999" give "no-coins-1-krone-1999".
 */
export function suggestedKey(parentKey: string | null, title: string) {
  const slug = title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[øæœßłđ]/g, (letter) => foldedLetters[letter] ?? letter)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) return "";
  return (parentKey ? `${parentKey}-${slug}` : slug)
    .slice(0, 64)
    .replace(/-+$/, "");
}
