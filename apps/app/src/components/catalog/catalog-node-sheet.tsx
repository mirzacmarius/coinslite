"use client";

import { useGradeLabels } from "@/components/items/grade-labels";
import { useUnsavedInput } from "@/lib/unsaved-input";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import {
  type CatalogItemType,
  catalogItemTypes,
  catalogLimits,
  preciousMetals,
} from "@coinslite/backend/convex/catalog/fields";
import { commonLicences } from "@coinslite/backend/convex/catalog/imageRules";
import { materials } from "@coinslite/backend/convex/items/rules";
import { countryCodes, formatCountry } from "@coinslite/i18n";
import { Button } from "@coinslite/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@coinslite/ui/dialog";
import { Field } from "@coinslite/ui/field";
import { Input } from "@coinslite/ui/input";
import { Kbd, useModifierKey } from "@coinslite/ui/kbd";
import { PropertyPicker } from "@coinslite/ui/property-picker";
import { SegmentedControl } from "@coinslite/ui/segmented-control";
import { toast } from "@coinslite/ui/toaster";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import {
  BookOpen,
  ChevronRight,
  Coins,
  Gem,
  Globe,
  Hammer,
  Loader2,
  type LucideIcon,
  X,
} from "lucide-react";
import type * as React from "react";
import { useId, useMemo, useRef, useState } from "react";
import { CatalogImageAdmin } from "./catalog-image-admin";
import {
  type NodeFormField,
  type NodeFormProblem,
  type NodeFormValues,
  type ParentNode,
  blankNode,
  editorArgsFrom,
  fieldOfProblem,
  hasCoinFacts,
  problemsOf,
  suggestedKey,
  valuesFromNode,
} from "./catalog-node-form";

/** What the sheet opens on: a new node below a parent (none for a root), or an existing one. */
export type NodeSheetTarget =
  | { mode: "create"; parent: ParentNode | null }
  | { mode: "edit"; key: string };

type EditedNode = NonNullable<
  FunctionReturnType<typeof api.catalog.editor.node>
>;

/** Problems with a message of their own; anything else reads as "couldn't save". */
const knownProblemCodes = [
  "TITLE_REQUIRED",
  "TOO_LONG",
  "INVALID_VALUE",
  "INVALID_COUNTRY",
  "INVALID_NUMBER",
  "INVALID_YEAR",
  "INVALID_URL",
  "NUMISTA_DATA",
  "ITEM_TYPE_REQUIRED",
  "FIELD_NOT_FOR_TYPE",
  "YEARS_REVERSED",
  "SOURCE_REQUIRED",
  "CREDIT_REQUIRED",
  "ROOT_NOT_ADDABLE",
  "PARENT_NOT_FOUND",
  "PARENT_IS_ENTRY",
  "TOO_DEEP",
  "ENTRY_HAS_CHILDREN",
  "ENTRY_HAS_ITEMS",
  "TOO_MANY_LINKED_ITEMS",
  "TOO_MANY_NODES_BELOW",
  "ID_REQUIRED",
  "INVALID_ID",
  "DUPLICATE_ID",
  "COUNTRY_REQUIRED",
  "CATALOG_NODE_NOT_FOUND",
  "NOT_ADMIN",
] as const satisfies ReadonlyArray<
  NodeFormProblem | "CATALOG_NODE_NOT_FOUND" | "NOT_ADMIN"
>;
const knownProblems = new Set<string>(knownProblemCodes);
type KnownProblem = (typeof knownProblemCodes)[number];

/** On wider screens the dialog sits at the right edge, full height, like a sheet. */
const sheetClass =
  "sm:inset-y-0 sm:bottom-0 sm:left-auto sm:right-0 sm:top-0 sm:h-dvh sm:max-h-dvh sm:max-w-[480px] sm:translate-x-0 sm:translate-y-0 sm:rounded-none sm:border-y-0 sm:border-r-0";

const textareaClass =
  "flex min-h-20 w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 aria-[invalid=true]:border-destructive";

/**
 * The admins' sheet for one Catalog node: add a country, Theme, grouping or
 * Catalog entry, or edit every value of an existing one, including where its
 * facts and notes come from and, for an entry, its image. Mount it with a
 * fresh `key` each time it opens, so it starts from the node.
 */
export function CatalogNodeSheet({
  open,
  onOpenChange,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: NodeSheetTarget;
}) {
  const t = useI18n();
  const node = useQuery(
    api.catalog.editor.node,
    open && target.mode === "edit" ? { key: target.key } : "skip",
  );
  const titleRef = useRef<HTMLInputElement>(null);

  let body: React.ReactNode;
  if (target.mode === "create") {
    body = (
      <NodeForm
        parent={target.parent}
        titleRef={titleRef}
        onDone={() => onOpenChange(false)}
      />
    );
  } else if (node === undefined) {
    body = (
      <SheetMessage title={t("catalogEditor.editNode")}>
        <div className="flex flex-col gap-3" aria-hidden="true">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="h-8 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </SheetMessage>
    );
  } else if (node === null) {
    body = (
      <SheetMessage title={t("catalogEditor.editNode")}>
        <p className="text-sm text-muted-foreground">
          {t("catalogEditor.errors.CATALOG_NODE_NOT_FOUND")}
        </p>
      </SheetMessage>
    );
  } else {
    body = (
      <NodeForm
        node={node}
        titleRef={titleRef}
        onDone={() => onOpenChange(false)}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={sheetClass}
        onOpenAutoFocus={(event) => {
          // While an edited node loads, focus goes where it would by default.
          if (!titleRef.current) return;
          event.preventDefault();
          titleRef.current.focus();
        }}
      >
        {body}
      </DialogContent>
    </Dialog>
  );
}

/** The sheet while its node loads, or once it's gone. */
function SheetMessage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const t = useI18n();
  return (
    <>
      <DialogHeader className="border-b">
        <DialogTitle>{title}</DialogTitle>
        <DialogClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t("catalogEditor.close")}
          >
            <X />
          </Button>
        </DialogClose>
      </DialogHeader>
      <DialogDescription className="sr-only">
        {t("catalogEditor.sheetDescription")}
      </DialogDescription>
      <div className="p-4">{children}</div>
    </>
  );
}

/** The fields' order, for focusing the first one with a problem. */
const fieldOrder: NodeFormField[] = [
  "kind",
  "title",
  "key",
  "sortOrder",
  "itemType",
  "country",
  "denomination",
  "series",
  "yearFrom",
  "yearTo",
  "strike",
  "material",
  "metal",
  "weight",
  "fineness",
  "diameter",
  "historicalNotes",
  "technicalDetails",
  "factsSource",
  "factsAuthor",
  "factsLicence",
  "factsLink",
  "notesSource",
  "notesAuthor",
  "notesLicence",
  "notesLink",
  "numistaId",
];

type TextField = Exclude<
  NodeFormField,
  "kind" | "itemType" | "country" | "material" | "strike" | "metal"
>;

function NodeForm({
  parent = null,
  node,
  titleRef,
  onDone,
}: {
  parent?: ParentNode | null;
  node?: EditedNode;
  titleRef: React.RefObject<HTMLInputElement | null>;
  onDone: () => void;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const mod = useModifierKey();
  const baseId = useId();
  const labels = useGradeLabels();
  const createNode = useMutation(api.catalog.editor.create);
  const updateNode = useMutation(api.catalog.editor.update);
  const creating = node === undefined;
  const isRoot = creating ? parent === null : node.parentKey === null;
  const parentKey = creating ? parent?.key ?? null : node.parentKey;
  // One object for the sheet's life: the form resets when it sees new defaults.
  const [defaults] = useState<NodeFormValues>(() =>
    node ? valuesFromNode(node, locale) : blankNode(parent),
  );
  /** Whether the admin typed the id; until then it follows the title. */
  const [keyTyped, setKeyTyped] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [failed, setFailed] = useState<string>();

  const problemText = (code: string) =>
    knownProblems.has(code)
      ? t(`catalogEditor.errors.${code as KnownProblem}`)
      : t("catalogEditor.errors.failed");

  const form = useForm({
    defaultValues: defaults,
    onSubmit: async ({ value }) => {
      setFailed(undefined);
      const { values, addable } = editorArgsFrom(value);
      try {
        if (creating) {
          await createNode({ parentKey, key: value.key, addable, values });
        } else {
          await updateNode({ key: node.key, addable, values });
        }
      } catch (failure) {
        const code = failure instanceof ConvexError ? String(failure.data) : "";
        setFailed(problemText(code));
        const field = fieldOfProblem(code);
        if (field) document.getElementById(`${baseId}-${field}`)?.focus();
        return;
      }
      toast.success(
        t(creating ? "catalogEditor.added" : "catalogEditor.saved", {
          title: value.title.trim(),
        }),
      );
      onDone();
    },
  });
  const values = form.useStore((state) => state.values);
  const submitting = form.useStore((state) => state.isSubmitting);
  const isDirty = form.useStore((state) => state.isDirty);
  useUnsavedInput(isDirty);
  const problems = useMemo(
    () => problemsOf(values, { creating }),
    [values, creating],
  );
  const errorOf = (field: NodeFormField) => {
    const problem = submitted ? problems[field] : undefined;
    return problem ? problemText(problem) : undefined;
  };

  const submit = () => {
    if (submitting) return;
    setSubmitted(true);
    const first = fieldOrder.find((field) => problems[field]);
    if (first) {
      document.getElementById(`${baseId}-${first}`)?.focus();
      return;
    }
    void form.handleSubmit();
  };

  /** Keeps a new node's id following its title and country until the admin types one. */
  const followKey = (next: Partial<NodeFormValues>) => {
    if (!creating || keyTyped) return;
    const merged = { ...form.state.values, ...next };
    const countryKey =
      isRoot && merged.kind === "country" && merged.country
        ? merged.country.toLowerCase()
        : undefined;
    form.setFieldValue(
      "key",
      countryKey ?? suggestedKey(parentKey, merged.title),
    );
  };

  const countryOptions = useMemo(
    () =>
      countryCodes
        .map((code) => ({ value: code, label: formatCountry(code, locale) }))
        .sort((a, b) => a.label.localeCompare(b.label, locale)),
    [locale],
  );
  const itemTypeOptions = catalogItemTypes.map((type) => ({
    value: type,
    label: t(`items.types.${type}`),
  }));
  const materialOptions = materials.map((material) => ({
    value: material,
    label: t(`items.materials.${material}`),
  }));
  const metalOptions = preciousMetals.map((metal) => ({
    value: metal,
    label: t(`items.materials.${metal}`),
  }));
  const kindOptions = isRoot
    ? (["country", "theme"] as const)
    : (["grouping", "entry"] as const);

  const textField = (
    name: TextField,
    label: string,
    options: {
      hint?: string;
      placeholder?: string;
      maxLength?: number;
      inputMode?: "numeric" | "decimal" | "url";
      wide?: boolean;
      list?: string;
      onChange?: (value: string) => void;
      readOnly?: boolean;
      inputRef?: React.RefObject<HTMLInputElement | null>;
    } = {},
  ) => (
    <form.Field name={name}>
      {(field) => (
        <Field
          id={`${baseId}-${name}`}
          label={label}
          hint={options.hint}
          error={errorOf(name)}
          className={options.wide ? "sm:col-span-2" : undefined}
        >
          {(control) => (
            <Input
              {...control}
              ref={options.inputRef}
              inputMode={options.inputMode}
              type={options.inputMode === "url" ? "url" : "text"}
              placeholder={options.placeholder}
              maxLength={options.maxLength}
              list={options.list}
              readOnly={options.readOnly}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                options.onChange?.(event.target.value);
              }}
              onBlur={field.handleBlur}
            />
          )}
        </Field>
      )}
    </form.Field>
  );
  const notesField = (
    name: "historicalNotes" | "technicalDetails",
    label: string,
  ) => (
    <form.Field name={name}>
      {(field) => (
        <Field
          id={`${baseId}-${name}`}
          label={label}
          error={errorOf(name)}
          className="sm:col-span-2"
        >
          {(control) => (
            <textarea
              {...control}
              rows={3}
              className={textareaClass}
              maxLength={catalogLimits.notes}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          )}
        </Field>
      )}
    </form.Field>
  );
  const sourceFields = (group: "facts" | "notes") => (
    <>
      {textField(`${group}Source`, t("catalogImages.source"), {
        placeholder: t("catalogImages.sourcePlaceholder"),
        maxLength: catalogLimits.provenance,
      })}
      {textField(`${group}Author`, t("catalogImages.author"), {
        placeholder: t("catalogImages.authorPlaceholder"),
        maxLength: catalogLimits.provenance,
      })}
      {textField(`${group}Licence`, t("catalogImages.licence"), {
        placeholder: t("catalogImages.licencePlaceholder"),
        maxLength: catalogLimits.provenance,
        list: `${baseId}-licences`,
      })}
      {textField(`${group}Link`, t("catalogImages.link"), {
        placeholder: t("catalogImages.linkPlaceholder"),
        maxLength: catalogLimits.url,
        inputMode: "url",
      })}
    </>
  );
  const picker = <T extends string>(
    name: "itemType" | "country" | "material" | "strike" | "metal",
    props: {
      label: string;
      icon: LucideIcon;
      placeholder: string;
      clearLabel: string;
      options: Array<{ value: T; label: string }>;
      onChange?: (value: T | undefined) => void;
    },
  ) => (
    <form.Field name={name}>
      {(field) => (
        <Field
          id={`${baseId}-${name}`}
          label={props.label}
          error={errorOf(name)}
        >
          {(control) => (
            <PropertyPicker<T>
              id={control.id}
              icon={props.icon}
              label={props.label}
              placeholder={props.placeholder}
              value={field.state.value as T | undefined}
              options={props.options}
              onChange={(value) => {
                field.handleChange(value as never);
                props.onChange?.(value);
              }}
              onClear={() => {
                field.handleChange(undefined as never);
                props.onChange?.(undefined);
              }}
              clearLabel={props.clearLabel}
              noResults={t("items.noMatches")}
            />
          )}
        </Field>
      )}
    </form.Field>
  );

  const crumb = creating
    ? parent?.title ?? t("nav.catalog")
    : node.ancestors.at(-1)?.title ?? t("nav.catalog");
  const coin = hasCoinFacts(values);
  const storedEntry = node?.kind === "entry";

  return (
    <form
      method="post"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          submit();
        }
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <DialogHeader className="border-b">
        <div className="flex min-w-0 items-center gap-1 text-[13px] text-muted-foreground">
          <BookOpen
            className="size-4 shrink-0"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span className="truncate">{crumb}</span>
          <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
          <DialogTitle className="truncate text-foreground">
            {creating
              ? t("catalogEditor.newNode")
              : t("catalogEditor.editNode")}
          </DialogTitle>
        </div>
        <DialogClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t("catalogEditor.close")}
          >
            <X />
          </Button>
        </DialogClose>
      </DialogHeader>
      <DialogDescription className="sr-only">
        {t("catalogEditor.sheetDescription")}
      </DialogDescription>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          <form.Field name="kind">
            {(field) => (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <p
                  aria-hidden="true"
                  className="text-xs font-medium text-muted-foreground"
                >
                  {t("catalogEditor.kind")}
                </p>
                <SegmentedControl
                  label={t("catalogEditor.kind")}
                  options={kindOptions.map((kind) => ({
                    value: kind,
                    label: t(`catalogEditor.kinds.${kind}`),
                  }))}
                  value={field.state.value}
                  onChange={(kind) => {
                    field.handleChange(kind);
                    followKey({ kind });
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {t(`catalogEditor.kindHints.${field.state.value}`)}
                </p>
                {errorOf("kind") && (
                  <p className="text-xs text-destructive">{errorOf("kind")}</p>
                )}
              </div>
            )}
          </form.Field>
          {textField("title", t("items.title"), {
            maxLength: catalogLimits.title,
            wide: true,
            inputRef: titleRef,
            onChange: (title) => followKey({ title }),
          })}
          {textField("key", t("catalogEditor.id"), {
            hint: creating
              ? t("catalogEditor.idHint")
              : t("catalogEditor.idFixedHint"),
            maxLength: catalogLimits.key,
            readOnly: !creating,
            onChange: () => setKeyTyped(true),
          })}
          {textField("sortOrder", t("catalogEditor.sortOrder"), {
            hint: t("catalogEditor.sortOrderHint"),
            inputMode: "decimal",
          })}
          {picker<CatalogItemType>("itemType", {
            label: t("items.type"),
            icon: Coins,
            placeholder: t("catalogEditor.setItemType"),
            clearLabel: t("catalogEditor.noItemType"),
            options: itemTypeOptions,
          })}
          {values.kind !== "theme" &&
            picker("country", {
              label: t("items.country"),
              icon: Globe,
              placeholder: t("items.setCountry"),
              clearLabel: t("catalogEditor.noCountry"),
              options: countryOptions,
              onChange: (country) => followKey({ country }),
            })}
        </div>

        <FormSection title={t("items.description")}>
          {textField("denomination", t("items.denomination"), {
            maxLength: catalogLimits.denomination,
          })}
          {textField("series", t("items.series"), {
            maxLength: catalogLimits.series,
          })}
          {textField("yearFrom", t("catalogEditor.yearFrom"), {
            hint: t("catalogEditor.yearHint"),
            inputMode: "numeric",
          })}
          {textField("yearTo", t("catalogEditor.yearTo"), {
            hint: t("catalogEditor.yearToHint"),
            inputMode: "numeric",
          })}
          {picker("strike", {
            label: t("items.strike"),
            icon: Hammer,
            placeholder: t("items.setStrike"),
            clearLabel: t("items.noStrike"),
            options: labels.strikeOptions(),
          })}
        </FormSection>

        {coin && (
          <FormSection title={t("items.physical")}>
            {picker("material", {
              label: t("items.material"),
              icon: Gem,
              placeholder: t("items.setMaterial"),
              clearLabel: t("items.noMaterial"),
              options: materialOptions,
            })}
            {picker("metal", {
              label: t("preciousMetal.metal"),
              icon: Gem,
              placeholder: t("preciousMetal.setMetal"),
              clearLabel: t("preciousMetal.noMetal"),
              options: metalOptions,
            })}
            {textField("weight", t("preciousMetal.weight"), {
              hint: t("catalogEditor.weightHint"),
              inputMode: "decimal",
            })}
            {textField("fineness", t("catalog.fineness"), {
              hint: t("catalogEditor.finenessHint"),
              inputMode: "decimal",
            })}
            {textField("diameter", t("items.diameter"), {
              hint: t("items.millimetres"),
              inputMode: "decimal",
            })}
          </FormSection>
        )}

        <FormSection title={t("catalog.notes")}>
          {notesField("historicalNotes", t("catalog.historicalNotes"))}
          {notesField("technicalDetails", t("catalog.technicalDetails"))}
        </FormSection>

        <FormSection
          title={t("catalogEditor.factsSources")}
          hint={t("catalogEditor.sourcesHint")}
        >
          {sourceFields("facts")}
        </FormSection>
        <FormSection title={t("catalogEditor.notesSources")}>
          {sourceFields("notes")}
        </FormSection>
        <datalist id={`${baseId}-licences`}>
          {commonLicences.map((licence) => (
            <option key={licence} value={licence} />
          ))}
        </datalist>

        <FormSection title={t("catalog.numista")}>
          {textField("numistaId", t("catalogEditor.numistaId"), {
            hint: t("catalogEditor.numistaHint"),
            inputMode: "numeric",
          })}
        </FormSection>

        {node && storedEntry && (
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-muted-foreground">
              {t("catalogEditor.image")}
            </h3>
            <div className="flex items-start gap-3">
              {node.imageUrl ? (
                <img
                  src={node.imageUrl}
                  alt={node.values.title}
                  referrerPolicy="no-referrer"
                  className="size-16 shrink-0 rounded-md border bg-muted object-contain"
                />
              ) : (
                <div
                  role="img"
                  aria-label={t("catalog.noImage")}
                  className="flex size-16 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground"
                >
                  <Coins
                    className="size-5"
                    strokeWidth={1.25}
                    aria-hidden="true"
                  />
                </div>
              )}
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-xs text-muted-foreground">
                  {node.imageProvenance
                    ? [
                        node.imageProvenance.source,
                        node.imageProvenance.author,
                        node.imageProvenance.licence,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : t("catalogEditor.imageHint")}
                </p>
                <CatalogImageAdmin
                  entry={{
                    key: node.key,
                    title: node.values.title,
                    imageUrl: node.imageUrl,
                    imageProvenance: node.imageProvenance,
                  }}
                />
              </div>
            </div>
          </section>
        )}

        {failed && (
          <p role="alert" className="text-xs text-destructive">
            {failed}
          </p>
        )}
      </div>

      <DialogFooter>
        <span />
        <div className="flex items-center gap-2">
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={submitting}>
              {t("items.cancel")}
            </Button>
          </DialogClose>
          {/* Not a submit button: Enter in a field or picker never saves the
              sheet; the button and Cmd/Ctrl+Enter do. */}
          <Button type="button" disabled={submitting} onClick={submit}>
            {submitting && (
              <Loader2 className="animate-spin" aria-hidden="true" />
            )}
            {creating ? t("catalogEditor.add") : t("items.save")}
            {mod && (
              <Kbd className="ml-1 border-primary-foreground/40 bg-transparent text-primary-foreground">
                {mod}↵
              </Kbd>
            )}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

/** A titled group of fields. */
function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}
