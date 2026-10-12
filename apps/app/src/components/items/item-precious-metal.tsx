"use client";

import { useCurrentLocale, useI18n } from "@/locales/client";
import {
  type BullionPresetId,
  bullionPresets,
} from "@coinslite/backend/convex/items/preciousMetal";
import { metals } from "@coinslite/backend/convex/spotPrices/rates";
import { CheckboxField, Field } from "@coinslite/ui/field";
import { PropertyPicker } from "@coinslite/ui/property-picker";
import { useSelector } from "@tanstack/react-form";
import { Gem, Sparkles } from "lucide-react";
import { fillForm, matchingPreset, presetValues } from "./item-form";
import { DetailGroup, TextField, useItemFields } from "./item-form-fields";

/**
 * A coin's precious metal under "More details": a bullion coin preset fills
 * the metal, weight, purity and country (and the title when it's empty);
 * weight and purity are the metal's, so they wait for one.
 */
export function PreciousMetalSection() {
  const t = useI18n();
  const locale = useCurrentLocale();
  const { form, baseId, fromEntry } = useItemFields();
  // A linked Item's cleared metal is its Catalog entry's.
  const metal =
    useSelector(form.store, (state) => state.values.metal) ?? fromEntry?.metal;
  const preset = useSelector(
    form.store,
    (state) => matchingPreset(bullionPresets, state.values)?.id,
  );
  const metalOptions = metals.map((metal) => ({
    value: metal,
    label: t(`items.materials.${metal}`),
  }));
  const presetOptions = bullionPresets.map(({ id }) => ({
    value: id,
    label: t(`preciousMetal.presets.${id}`),
  }));
  /** Fills the precious metal and country from a bullion coin, and the title when it's empty. */
  const applyPreset = (id: BullionPresetId) => {
    const chosen = bullionPresets.find((preset) => preset.id === id);
    if (!chosen) return;
    const filled = presetValues(chosen, locale);
    fillForm(form, {
      metal: filled.metal,
      weight: filled.weight,
      purity: filled.purity,
      country: filled.country,
      bullion: true,
    });
    if (!form.getFieldValue("title").trim())
      fillForm(form, { title: t(`preciousMetal.presets.${id}`) });
  };

  return (
    <DetailGroup title={t("preciousMetal.title")}>
      <Field
        id={`${baseId}-preset`}
        label={t("preciousMetal.preset")}
        hint={t("preciousMetal.presetHint")}
        className="sm:col-span-2"
      >
        {(control) => (
          <PropertyPicker
            id={control.id}
            aria-describedby={control["aria-describedby"]}
            icon={Sparkles}
            label={t("preciousMetal.preset")}
            placeholder={t("preciousMetal.presetPlaceholder")}
            value={preset}
            options={presetOptions}
            onChange={applyPreset}
            noResults={t("items.noMatches")}
          />
        )}
      </Field>
      <form.Field name="metal">
        {(field) => (
          <Field id={`${baseId}-metal`} label={t("preciousMetal.metal")}>
            {(control) => (
              <PropertyPicker
                id={control.id}
                icon={Gem}
                label={t("preciousMetal.metal")}
                placeholder={
                  (fromEntry?.metal &&
                    t(`items.materials.${fromEntry.metal}`)) ??
                  t("preciousMetal.setMetal")
                }
                value={field.state.value}
                options={metalOptions}
                onChange={field.handleChange}
                onClear={() => {
                  // Weight and purity are the metal's.
                  field.handleChange(undefined);
                  fillForm(form, { weight: "", purity: "" });
                }}
                clearLabel={t("preciousMetal.noMetal")}
                noResults={t("items.noMatches")}
              />
            )}
          </Field>
        )}
      </form.Field>
      <form.Field name="bullion">
        {(field) => (
          <CheckboxField
            id={`${baseId}-bullion`}
            label={t("preciousMetal.bullionLabel")}
            checked={field.state.value}
            onCheckedChange={field.handleChange}
            className="sm:self-end sm:pb-1"
          />
        )}
      </form.Field>
      <TextField
        name="weight"
        label={t("preciousMetal.weight")}
        hint={
          metal
            ? t("preciousMetal.weightHint")
            : t("preciousMetal.chooseMetalFirst")
        }
        inputMode="decimal"
        disabled={!metal}
      />
      <TextField
        name="purity"
        label={t("preciousMetal.purity")}
        hint={
          metal
            ? t("preciousMetal.purityHint")
            : t("preciousMetal.chooseMetalFirst")
        }
        inputMode="decimal"
        disabled={!metal}
      />
    </DetailGroup>
  );
}
