"use client";

import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import {
  cleanTag,
  hasTag,
  tagKey,
  tagLimits,
} from "@coinslite/backend/convex/items/tags";
import { Button } from "@coinslite/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@coinslite/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@coinslite/ui/popover";
import { useQuery } from "convex/react";
import { Check, Plus, Tag } from "lucide-react";
import { useState } from "react";

/**
 * The tags the person has used, most used first, and any of `held` they
 * haven't yet, `held` first: what a tag list offers.
 */
export function useTagOptions(held: readonly string[] = []) {
  const known = useQuery(api.collection.tags, {});
  return {
    loading: known === undefined,
    options: [...held, ...(known ?? []).filter((tag) => !hasTag(held, tag))],
  };
}

/**
 * Searching the tags offered and making a new one from what's typed: the
 * list both the Item form's Tags pill and select mode's Tag action open.
 * `picked` marks the tags ticked; `onPick` gets a tag chosen or made.
 */
export function TagList({
  options,
  picked,
  onPick,
  canAdd = true,
  typedLabel,
}: {
  options: readonly string[];
  picked?: readonly string[];
  onPick: (tag: string) => void;
  /** Whether a tag not yet picked can be picked: not on a full Item. */
  canAdd?: boolean;
  /**
   * What the row for a tag typed but not offered says; "Create tag “x”"
   * by default. Taking a tag off many Items names it so too, as the list
   * offers only the most used.
   */
  typedLabel?: (tag: string) => string;
}) {
  const t = useI18n();
  const [query, setQuery] = useState("");
  const typed = cleanTag(query);
  const canCreate =
    canAdd &&
    typed !== "" &&
    typed.length <= tagLimits.length &&
    !options.some((tag) => tagKey(tag) === tagKey(typed));
  return (
    // Matched as tags are: capitals, accents, spacing and commas aside.
    <Command
      filter={(value, search) =>
        tagKey(value).includes(tagKey(cleanTag(search))) ? 1 : 0
      }
    >
      <CommandInput
        placeholder={typedLabel ? t("tags.find") : t("tags.search")}
        value={query}
        onValueChange={setQuery}
        maxLength={tagLimits.length}
      />
      <CommandList>
        <CommandEmpty>
          {options.length === 0 ? t("tags.noneYet") : t("items.noMatches")}
        </CommandEmpty>
        {options.length > 0 && (
          <CommandGroup>
            {options.map((tag) => {
              const ticked = picked !== undefined && hasTag(picked, tag);
              return (
                <CommandItem
                  key={tagKey(tag)}
                  value={tag}
                  disabled={!ticked && !canAdd}
                  onSelect={() => {
                    onPick(tag);
                    setQuery("");
                  }}
                >
                  <Tag
                    className="text-muted-foreground"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span className="truncate">{tag}</span>
                  {ticked && (
                    <Check className="ml-auto text-link" aria-hidden="true" />
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
        {canCreate && (
          <CommandGroup>
            <CommandItem
              value={`create ${typed}`}
              onSelect={() => {
                onPick(typed);
                setQuery("");
              }}
            >
              {typedLabel ? (
                <Tag
                  className="text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              ) : (
                <Plus className="text-muted-foreground" aria-hidden="true" />
              )}
              <span className="truncate">
                {typedLabel?.(typed) ?? t("tags.create", { tag: typed })}
              </span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}

/**
 * The Item form's Tags pill: the Item's tags, or "Add tags"; it opens a
 * list to tick and untick the person's tags or make a new one, and stays
 * open for the next. An Item holds up to `tagLimits.perItem` tags.
 */
export function TagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const t = useI18n();
  const { options } = useTagOptions(value);
  const full = value.length >= tagLimits.perItem;
  const shown = value.length > 0 ? value.join(", ") : t("tags.add");
  const toggle = (tag: string) =>
    onChange(
      hasTag(value, tag)
        ? value.filter((held) => tagKey(held) !== tagKey(tag))
        : full
          ? value
          : [...value, tag],
    );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={value.length > 0 ? "subtle" : "ghost"}
          size="xs"
          aria-label={`${t("tags.tags")}: ${shown}`}
          className="max-w-full self-start justify-start"
        >
          <Tag
            className="text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span
            className={
              value.length > 0 ? "truncate" : "truncate text-muted-foreground"
            }
          >
            {shown}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <TagList
          options={options}
          picked={value}
          onPick={toggle}
          canAdd={!full}
        />
        {full && (
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">
            {t("tags.full", { limit: tagLimits.perItem })}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
