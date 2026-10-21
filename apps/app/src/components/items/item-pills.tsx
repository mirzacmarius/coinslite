"use client";

import { AlbumPicker } from "@/components/albums/album-picker";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { hasStrike, isGrade } from "@coinslite/backend/convex/items/grades";
import { itemLimits } from "@coinslite/backend/convex/items/rules";
import { countryCodes, formatCountry } from "@coinslite/i18n";
import { Input } from "@coinslite/ui/input";
import { PropertyPicker } from "@coinslite/ui/property-picker";
import { Award, Globe, Hammer } from "lucide-react";
import { useMemo } from "react";
import { useGradeLabels } from "./grade-labels";
import { CatalogLink } from "./item-catalog-link";
import { useItemFields, useItemKind } from "./item-form-fields";
import type { LinkedEntry } from "./item-form-submit";

/**
 * The Item form's row of pills, always in view: the Catalog entry or Item
 * type, the Album, country, Grade, strike and quantity.
 */
export function ItemPills({
  linked,
  typePicker,
  onPickEntry,
  onAlbumCreateFailed,
}: {
  linked: LinkedEntry | undefined;
  /** Whether the Item type pill shows: not where the page picks the type (new-item.tsx). */
  typePicker?: boolean;
  /** Opens the Catalog picker. */
  onPickEntry: () => void;
  /** Says an Album made from the Album pill couldn't be created. */
  onAlbumCreateFailed: (message: string) => void;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const labels = useGradeLabels();
  const { form, fromEntry, rules, errorOf } = useItemFields();
  const { type, strike, scale } = useItemKind();
  const countryOptions = useMemo(
    () =>
      countryCodes
        .map((code) => ({ value: code, label: formatCountry(code, locale) }))
        .sort((a, b) => a.label.localeCompare(b.label, locale)),
    [locale],
  );
  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <CatalogLink
          linked={linked}
          typePicker={typePicker}
          onPick={onPickEntry}
        />
        <form.Field name="albumId">
          {(field) => (
            <AlbumPicker
              value={field.state.value}
              onChange={field.handleChange}
              onCreateFailed={onAlbumCreateFailed}
            />
          )}
        </form.Field>
        <form.Field name="country">
          {(field) => (
            <PropertyPicker
              icon={Globe}
              label={t("items.country")}
              placeholder={
                (fromEntry?.country &&
                  formatCountry(fromEntry.country, locale)) ??
                t("items.setCountry")
              }
              value={field.state.value}
              options={countryOptions}
              onChange={field.handleChange}
              onClear={() => field.handleChange(undefined)}
              clearLabel={t("account.contact.noCountry")}
              noResults={t("items.noMatches")}
            />
          )}
        </form.Field>
        <form.Field name="grade">
          {(field) => (
            <PropertyPicker
              icon={Award}
              label={t("items.grade")}
              placeholder={t("items.setGrade")}
              value={
                field.state.value && isGrade(scale, field.state.value)
                  ? field.state.value
                  : undefined
              }
              options={labels.gradeOptions(scale, strike)}
              onChange={field.handleChange}
              onClear={() => field.handleChange(undefined)}
              clearLabel={t("items.noGrade")}
              noResults={t("items.noMatches")}
            />
          )}
        </form.Field>
        {hasStrike(type) && (
          <form.Field name="strike">
            {(field) => (
              <PropertyPicker
                icon={Hammer}
                label={t("items.strike")}
                placeholder={
                  (fromEntry?.strike && labels.strike(fromEntry.strike)) ??
                  t("items.setStrike")
                }
                value={field.state.value}
                options={labels.strikeOptions()}
                onChange={field.handleChange}
                onClear={() => field.handleChange(undefined)}
                clearLabel={t("items.noStrike")}
                noResults={t("items.noMatches")}
              />
            )}
          </form.Field>
        )}
        <form.Field name="quantity" validators={{ onChange: rules.quantity }}>
          {(field) => (
            <label className="flex h-7 items-center gap-1.5 rounded-md px-2 text-ui text-muted-foreground">
              {t("items.quantity")}
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={itemLimits.quantity}
                aria-invalid={
                  errorOf(field.state.meta.errors) ? true : undefined
                }
                className="h-7 w-16 px-2 text-right text-ui"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                // Typing replaces the number rather than going in front of
                // it; a frame later, so a tap's own caret doesn't undo it.
                onFocus={(event) => {
                  const input = event.currentTarget;
                  requestAnimationFrame(() => input.select());
                }}
                onBlur={field.handleBlur}
              />
            </label>
          )}
        </form.Field>
      </div>
      <form.Subscribe selector={(state) => state.fieldMeta.quantity?.errors}>
        {(errors) =>
          errors && errorOf(errors) ? (
            <p className="text-xs text-destructive">{errorOf(errors)}</p>
          ) : null
        }
      </form.Subscribe>
    </>
  );
}
