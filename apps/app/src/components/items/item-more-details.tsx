"use client";

import { useI18n } from "@/locales/client";
import {
  graderNames,
  graders,
  stampCatalogueNames,
  stampCatalogues,
} from "@coinslite/backend/convex/items/references";
import {
  fieldSuits,
  itemLimits,
  materials,
} from "@coinslite/backend/convex/items/rules";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@coinslite/ui/collapsible";
import { Field } from "@coinslite/ui/field";
import { PropertyPicker } from "@coinslite/ui/property-picker";
import { BadgeCheck, BookMarked, ChevronRight, Gem, Ruler } from "lucide-react";
import { useGradeLabels } from "./grade-labels";
import {
  DetailGroup,
  TextField,
  useItemFields,
  useItemKind,
} from "./item-form-fields";
import { PreciousMetalSection } from "./item-precious-metal";
import { PurchaseSection } from "./item-purchase";

/**
 * The Item form's fields beyond the basics, in a group that opens by itself
 * when it holds values or errors (use-item-form.ts): description, a coin's
 * physical facts and precious metal, Grade, references, and purchase. Only
 * the fields the Item type has show.
 */
export function MoreDetails({
  open,
  onOpenChange,
  linked,
  currency,
  locked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether the form is linked to a Catalog entry, whose facts it shows. */
  linked: boolean;
  /** The currency amounts are typed in, and why they can't be, if so. */
  currency: string;
  locked: string | undefined;
}) {
  const t = useI18n();
  const isCoin = useItemKind().type === "coin";
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="group flex h-7 items-center gap-1 rounded-md text-[13px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronRight
          className="size-3.5 transition-transform duration-150 group-data-[state=open]:rotate-90"
          aria-hidden="true"
        />
        {t("items.moreDetails")}
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-5 pb-1 pt-3">
        {linked && (
          <p className="text-xs text-muted-foreground">
            {t("catalogPicker.factsHint")}
          </p>
        )}
        <DescriptionGroup />
        {isCoin && <PhysicalGroup />}
        {isCoin && <PreciousMetalSection />}
        <GradeGroup />
        <ReferencesGroup />
        <PurchaseSection currency={currency} locked={locked} />
      </CollapsibleContent>
    </Collapsible>
  );
}

function DescriptionGroup() {
  const t = useI18n();
  const { type } = useItemKind();
  return (
    <DetailGroup title={t("items.description")}>
      <TextField name="year" label={t("items.year")} inputMode="numeric" />
      <TextField
        name="denomination"
        label={t("items.denomination")}
        maxLength={itemLimits.denomination}
      />
      <TextField
        name="series"
        label={t("items.series")}
        maxLength={itemLimits.series}
      />
      <TextField
        name="category"
        label={t("items.category")}
        maxLength={itemLimits.category}
      />
      {fieldSuits("ruler", type) && (
        <TextField
          name="ruler"
          label={t("items.ruler")}
          maxLength={itemLimits.ruler}
        />
      )}
      {fieldSuits("mintMark", type) && (
        <TextField
          name="mintMark"
          label={t("items.mintMark")}
          maxLength={itemLimits.mintMark}
        />
      )}
      {fieldSuits("mintage", type) && (
        <TextField
          name="mintage"
          label={t("items.mintage")}
          inputMode="numeric"
        />
      )}
      {fieldSuits("numistaNumber", type) && (
        <TextField
          name="numistaNumber"
          label={t("items.numistaNumber")}
          inputMode="numeric"
        />
      )}
    </DetailGroup>
  );
}

/** A coin's material and size. */
function PhysicalGroup() {
  const t = useI18n();
  const { form, baseId, fromEntry } = useItemFields();
  const materialOptions = materials.map((material) => ({
    value: material,
    label: t(`items.materials.${material}`),
  }));
  return (
    <DetailGroup title={t("items.physical")}>
      <form.Field name="material">
        {(field) => (
          <Field id={`${baseId}-material`} label={t("items.material")}>
            {(control) => (
              <PropertyPicker
                id={control.id}
                icon={Gem}
                label={t("items.material")}
                placeholder={
                  (fromEntry?.material &&
                    t(`items.materials.${fromEntry.material}`)) ??
                  t("items.setMaterial")
                }
                value={field.state.value}
                options={materialOptions}
                onChange={field.handleChange}
                onClear={() => field.handleChange(undefined)}
                clearLabel={t("items.noMaterial")}
                noResults={t("items.noMatches")}
              />
            )}
          </Field>
        )}
      </form.Field>
      <TextField
        name="materialNote"
        label={t("items.materialNote")}
        placeholder={t("items.materialNotePlaceholder")}
        maxLength={itemLimits.materialNote}
      />
      <TextField
        name="diameter"
        label={t("items.diameter")}
        hint={t("items.millimetres")}
        inputMode="decimal"
      />
      <TextField
        name="thickness"
        label={t("items.thickness")}
        hint={t("items.millimetres")}
        inputMode="decimal"
      />
    </DetailGroup>
  );
}

/** The scale the Grade is on, and a note on it. */
function GradeGroup() {
  const t = useI18n();
  const labels = useGradeLabels();
  const { form, baseId } = useItemFields();
  const { type, scale } = useItemKind();
  return (
    <DetailGroup title={t("items.grade")}>
      <form.Field name="gradingScale">
        {(field) => (
          <Field id={`${baseId}-scale`} label={t("items.gradingScale")}>
            {(control) => (
              <PropertyPicker
                id={control.id}
                icon={Ruler}
                label={t("items.gradingScale")}
                value={scale}
                options={labels.scaleOptions(type)}
                onChange={field.handleChange}
                noResults={t("items.noMatches")}
              />
            )}
          </Field>
        )}
      </form.Field>
      <TextField
        name="gradeNote"
        label={t("items.gradeNote")}
        placeholder={t(`items.gradeNotePlaceholder.${type}`)}
        maxLength={itemLimits.gradeNote}
      />
    </DetailGroup>
  );
}

/** A grader's certificate, a stamp's catalogue number, a banknote's serial number. */
function ReferencesGroup() {
  const t = useI18n();
  const { form, baseId } = useItemFields();
  const { type, grader, stampCatalogue } = useItemKind();
  const graderOptions = graders.map((grader) => ({
    value: grader,
    label: grader === "other" ? t("items.otherReference") : graderNames[grader],
  }));
  const stampCatalogueOptions = stampCatalogues.map((catalogue) => ({
    value: catalogue,
    label:
      catalogue === "other"
        ? t("items.otherReference")
        : stampCatalogueNames[catalogue],
  }));
  /** A reference typed as plain text, when the Item type has it. */
  const reference = (
    name:
      | "graderName"
      | "certificateNumber"
      | "stampCatalogueName"
      | "stampCatalogueNumber"
      | "perforation"
      | "watermark"
      | "colour"
      | "serialNumber"
      | "signatures"
      | "printer",
    placeholder?: string,
  ) =>
    fieldSuits(name, type) && (
      <TextField
        name={name}
        label={t(`items.${name}`)}
        placeholder={placeholder}
        maxLength={itemLimits.reference}
      />
    );
  return (
    <DetailGroup title={t("items.references")}>
      {fieldSuits("grader", type) && (
        <form.Field name="grader">
          {(field) => (
            <Field id={`${baseId}-grader`} label={t("items.grader")}>
              {(control) => (
                <PropertyPicker
                  id={control.id}
                  icon={BadgeCheck}
                  label={t("items.grader")}
                  placeholder={t("items.setGrader")}
                  value={field.state.value}
                  options={graderOptions}
                  onChange={field.handleChange}
                  onClear={() => field.handleChange(undefined)}
                  clearLabel={t("items.noGrader")}
                  noResults={t("items.noMatches")}
                />
              )}
            </Field>
          )}
        </form.Field>
      )}
      {grader === "other" && reference("graderName")}
      {reference("certificateNumber")}
      {fieldSuits("stampCatalogue", type) && (
        <form.Field name="stampCatalogue">
          {(field) => (
            <Field
              id={`${baseId}-stampCatalogue`}
              label={t("items.stampCatalogue")}
            >
              {(control) => (
                <PropertyPicker
                  id={control.id}
                  icon={BookMarked}
                  label={t("items.stampCatalogue")}
                  placeholder={t("items.setStampCatalogue")}
                  value={field.state.value}
                  options={stampCatalogueOptions}
                  onChange={field.handleChange}
                  onClear={() => field.handleChange(undefined)}
                  clearLabel={t("items.noStampCatalogue")}
                  noResults={t("items.noMatches")}
                />
              )}
            </Field>
          )}
        </form.Field>
      )}
      {stampCatalogue === "other" && reference("stampCatalogueName")}
      {reference("stampCatalogueNumber")}
      {reference("perforation", t("items.perforationPlaceholder"))}
      {reference("watermark")}
      {reference("colour")}
      {reference("serialNumber")}
      {reference("signatures")}
      {reference("printer")}
    </DetailGroup>
  );
}
