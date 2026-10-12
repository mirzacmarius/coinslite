"use client";

import { seriesColorVariables } from "@/components/collection-totals/chart-card";
import { TotalsFigures } from "@/components/collection-totals/collection-totals";
import { ValueChart } from "@/components/collection-totals/value-chart";
import { ValueDistributionChart } from "@/components/collection-totals/value-distribution-chart";
import { AppearancePicker } from "@/components/preferences";
import { AppShell } from "@/components/shell/app-shell";
import { UnseenMarker } from "@/components/updates/unseen-marker";
import { useFormatters } from "@/locales/use-formatters";
import {
  collectionTotals,
  valueByDateAdded,
} from "@coinslite/backend/convex/items/totals";
import type { MonthValue } from "@coinslite/backend/convex/items/valueOverTime";
import { Badge } from "@coinslite/ui/badge";
import { Button } from "@coinslite/ui/button";
import { Card } from "@coinslite/ui/card";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@coinslite/ui/command";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@coinslite/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@coinslite/ui/dropdown-menu";
import { EmptyState } from "@coinslite/ui/empty-state";
import { CheckboxField, Field } from "@coinslite/ui/field";
import { FilterChip } from "@coinslite/ui/filter-chip";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { IconButton } from "@coinslite/ui/icon-button";
import { Input } from "@coinslite/ui/input";
import { type ItemType, ItemTypeIcon } from "@coinslite/ui/item-type-icon";
import { Kbd, useModifierKey } from "@coinslite/ui/kbd";
import { Label } from "@coinslite/ui/label";
import { PhotoViewer } from "@coinslite/ui/photo-viewer";
import { Progress } from "@coinslite/ui/progress";
import { PropertyPicker } from "@coinslite/ui/property-picker";
import { SegmentedControl } from "@coinslite/ui/segmented-control";
import { SettingsGroup, SettingsRow } from "@coinslite/ui/settings-group";
import { Switch } from "@coinslite/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coinslite/ui/table";
import { toast } from "@coinslite/ui/toaster";
import { cn } from "@coinslite/ui/utils";
import {
  Award,
  Banknote,
  Check,
  ChevronRight,
  Coins,
  Copy,
  Folder,
  ListFilter,
  MoreHorizontal,
  Pencil,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Stamp,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";

// Sample data only; amounts are in euro cents.
const items = [
  {
    title: "Krugerrand 1 oz",
    detail: "2022 · South Africa",
    type: "coin",
    grade: "MS-66",
    qty: 2,
    market: 265000,
  },
  {
    title: "Morgan dollar 1881-S",
    detail: "1881 · USA",
    type: "coin",
    grade: "MS-63",
    qty: 1,
    market: 7500,
  },
  {
    title: "10 lei 2008",
    detail: "2008 · Romania",
    type: "banknote",
    grade: "UNC",
    qty: 1,
    market: 1400,
  },
  {
    title: "Europa 2019 · Birds",
    detail: "2019 · Norway",
    type: "stamp",
    grade: "MNH",
    qty: 1,
    market: 550,
  },
] as const;
const tokens = [
  "sidebar",
  "sidebar-accent",
  "background",
  "card",
  "muted",
  "accent",
  "primary",
  "link",
  "success",
  "destructive",
  "border",
] as const;
const typeOptions = [
  { value: "coin", label: "Coin", icon: <Coins strokeWidth={1.75} /> },
  {
    value: "banknote",
    label: "Banknote",
    icon: <Banknote strokeWidth={1.75} />,
  },
  { value: "stamp", label: "Stamp", icon: <Stamp strokeWidth={1.75} /> },
] satisfies { value: ItemType; label: string; icon: React.ReactNode }[];
const albumDot = (colour: string) => (
  <span
    className="size-1.5 rounded-full"
    style={{ background: colour }}
    aria-hidden="true"
  />
);
const albumOptions = [
  { value: "travel", label: "Travel", icon: albumDot("#0ea5e9"), count: 12 },
  { value: "morgans", label: "Morgans", icon: albumDot("#f59e0b"), count: 4 },
  { value: "bullion", label: "Bullion", icon: albumDot("#a855f7"), count: 7 },
];
const gradeOptions = ["MS-66", "MS-63", "AU-58", "XF-45", "VF-20"].map(
  (grade) => ({
    value: grade,
    label: grade,
    hint: "Sheldon",
  }),
);
const currencyOptions = [
  { value: "NOK", label: "NOK", hint: "Norwegian krone" },
  { value: "EUR", label: "EUR", hint: "Euro" },
  { value: "RON", label: "RON", hint: "Romanian leu" },
];

/**
 * A sample "Value over time": the sample Collection's purchases by month, its
 * Market value drifting up a little each month, and some gold.
 */
const sampleOverTime = (): MonthValue[] =>
  valueByDateAdded(sampleTotals).map((point, index) => ({
    month: point.month,
    purchasePrice: point.purchasePrice,
    marketValue: Math.round(point.marketValue * (1 + index * 0.01)),
    metalValue: Math.round(point.purchasePrice * 0.4 * (1 + index * 0.02)),
  }));

/** A sample Collection for the charts: Items added over a year and a half. */
const sampleTotals = {
  ...collectionTotals(
    [
      ["2025-02", "coin", 3, 15_000, 18_000],
      ["2025-03", "banknote", 1, 40_000, 35_000],
      ["2025-06", "coin", 1, 250_000, 310_000],
      ["2025-09", "stamp", 12, 2_500, 4_000],
      ["2026-01", "coin", 2, 90_000, 120_000],
      ["2026-05", "banknote", 4, 12_000, 12_500],
    ].map(([month, type, quantity, purchasePrice, marketValue]) => ({
      _creationTime: Date.parse(`${month}-15T12:00:00Z`),
      type: type as ItemType,
      quantity: Number(quantity),
      purchasePrice: Number(purchasePrice),
      marketValue: Number(marketValue),
    })),
    { currency: "NOK", spotPrices: null },
  ),
  metals: {
    gold: { fineWeight: 62.2, value: 512_000 },
    silver: { fineWeight: 311, value: 98_000 },
  },
};

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function Section({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  const id = `design-${slug(title)}`;
  return (
    <section className="flex flex-col gap-3" aria-labelledby={id}>
      <h2 id={id} className="text-xs font-medium text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PropertyRow({
  label,
  children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid h-7 grid-cols-[96px_1fr] items-center gap-2">
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 justify-self-start">{children}</div>
    </div>
  );
}

const titleInput =
  "w-full bg-transparent px-0 text-base font-medium placeholder:text-muted-foreground focus:outline-none";
const notesInput =
  "w-full resize-none bg-transparent px-0 text-sm placeholder:text-muted-foreground focus:outline-none";

function NewItemDialog() {
  const mod = useModifierKey();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ItemType>("coin");
  const [album, setAlbum] = useState<string>();
  const [grade, setGrade] = useState<string>();
  const add = () => {
    setOpen(false);
    toast.success("Item added to your Collection");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">New Item dialog</Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[600px]"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") add();
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
            <Coins className="size-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Collection</span>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <DialogTitle className="text-foreground">New Item</DialogTitle>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon-xs" aria-label="Close">
              <X />
            </Button>
          </DialogClose>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Record an Item in your Collection.
        </DialogDescription>
        <div className="flex flex-col gap-2 px-4 pb-3 pt-1">
          <input
            aria-label="Title"
            className={titleInput}
            placeholder="Title"
          />
          <textarea
            aria-label="Notes"
            rows={2}
            className={notesInput}
            placeholder="Add notes…"
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            <PropertyPicker
              icon={Coins}
              label="Item type"
              value={type}
              options={typeOptions}
              onChange={setType}
              noResults="No matches"
            />
            <PropertyPicker
              icon={Folder}
              label="Album"
              placeholder="Add to Album"
              value={album}
              options={albumOptions}
              onChange={setAlbum}
              noResults="No matches"
            />
            <PropertyPicker
              icon={Award}
              label="Grade"
              placeholder="Set Grade"
              value={grade}
              options={gradeOptions}
              onChange={setGrade}
              noResults="No matches"
            />
          </div>
        </div>
        <DialogFooter>
          <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Switch /> Create more
          </label>
          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={add}>
              Add Item
              {mod && (
                <Kbd className="ml-1 border-primary-foreground/40 bg-transparent text-primary-foreground">
                  {mod}↵
                </Kbd>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAlbumDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Confirm dialog</Button>
      </DialogTrigger>
      <DialogContent className="gap-3 p-4 sm:max-w-[400px]">
        <DialogTitle>Delete “Morgans”?</DialogTitle>
        <DialogDescription>
          The 4 Items in it stay in your Collection, without an Album.
        </DialogDescription>
        <div className="flex justify-end gap-2 pt-1">
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="destructive">Delete Album</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ItemMenu() {
  const mod = useModifierKey();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label="Item actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem>
          <Pencil strokeWidth={1.75} /> Edit
          <DropdownMenuShortcut>
            <Kbd>E</Kbd>
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Copy strokeWidth={1.75} /> Duplicate
          {mod && (
            <DropdownMenuShortcut>
              <Kbd>{mod}D</Kbd>
            </DropdownMenuShortcut>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive [&_svg]:text-destructive">
          <Trash2 strokeWidth={1.75} /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const coinPicture = (text: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="78" fill="#c9a227" stroke="#8a6d12" stroke-width="6"/><text x="100" y="111" font-family="sans-serif" font-size="30" text-anchor="middle" fill="#5c4708">${text}</text></svg>`,
  )}`;
const samplePhotos = [
  { src: coinPicture("1881"), caption: "Obverse" },
  { src: coinPicture("ONE $"), caption: "Reverse" },
];

function ItemPhotosSample() {
  const [index, setIndex] = useState<number | null>(null);
  return (
    <>
      <div className="grid max-w-sm grid-cols-2 gap-3">
        {samplePhotos.map((photo, at) => (
          <div key={photo.caption} className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setIndex(at)}
              aria-label={`${photo.caption}, view full screen`}
              className="aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              <img
                src={photo.src}
                alt=""
                className="size-full object-contain"
              />
            </button>
            <span className="flex h-7 items-center text-xs text-muted-foreground">
              {photo.caption}
            </span>
          </div>
        ))}
      </div>
      <PhotoViewer
        index={index}
        onIndexChange={setIndex}
        photos={samplePhotos}
        closeLabel="Close"
        previousLabel="Previous photo"
        nextLabel="Next photo"
      />
    </>
  );
}

export function DesignGallery() {
  const { money } = useFormatters();
  const [itemType, setItemType] = useState<ItemType>("coin");
  const [album, setAlbum] = useState<string | undefined>("travel");
  const [newAlbums, setNewAlbums] = useState<string[]>([]);
  const [grade, setGrade] = useState<string>();
  const [currency, setCurrency] = useState("NOK");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const totals = [
    { label: "Purchase price", value: money(436650, "EUR") },
    { label: "Market value", value: money(512000, "EUR") },
    {
      label: "Gain/loss",
      value: `+${money(75350, "EUR")}`,
      tone: "text-success",
    },
    { label: "Metal value", value: money(499118, "EUR") },
  ];

  return (
    <AppShell
      sidebarFooter={
        <div className="flex flex-col gap-2 rounded-xl bg-card p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Free plan</span>
            <span className="font-medium">18 / 50 Items</span>
          </div>
          <Progress value={18} max={50} label="Items used on the Free plan" />
        </div>
      }
    >
      {/* The samples are English only, whatever the interface language. */}
      <div lang="en" className="contents">
        <HeaderBar
          title="Design system"
          actions={
            <>
              {/* Icon-only buttons: label in the tooltip, with the shortcut. */}
              <IconButton label="Filter" shortcut="F">
                <ListFilter strokeWidth={1.75} />
              </IconButton>
              <Button
                size="xs"
                onClick={() => toast.success("Item added to your Collection")}
              >
                <Plus /> Add Item
              </Button>
            </>
          }
        />

        <div className="flex flex-col gap-8 p-4">
          <Section title="Value summary">
            <Card className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
              {totals.map(({ label, value, tone }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className={cn("text-xl font-semibold", tone)}>
                    {value}
                  </span>
                </div>
              ))}
            </Card>
          </Section>

          <Section title="Colour tokens">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {tokens.map((token) => (
                <div
                  key={token}
                  className="flex h-9 items-center gap-2 rounded-md border bg-card px-2 text-[13px]"
                >
                  <span
                    className="size-5 rounded border"
                    style={{ background: `hsl(var(--${token}))` }}
                    aria-hidden="true"
                  />
                  {token}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Buttons">
            <div className="flex flex-wrap items-center gap-2">
              <Button>Save Item</Button>
              <Button variant="subtle">Duplicate</Button>
              <Button variant="outline">Export</Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="destructive">Delete</Button>
              <Button variant="link">View Collection</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="xs" variant="subtle">
                <Plus /> Toolbar button
              </Button>
              <Button size="xs" variant="ghost">
                <ListFilter strokeWidth={1.75} /> Filter
              </Button>
              <ItemMenu />
            </div>
          </Section>

          <Section title="Property pills">
            <div className="flex flex-wrap gap-1.5">
              <PropertyPicker
                icon={Coins}
                label="Item type"
                value={itemType}
                options={typeOptions}
                onChange={setItemType}
                noResults="No matches"
              />
              <PropertyPicker
                icon={Folder}
                label="Album"
                placeholder="Add to Album"
                value={album}
                options={albumOptions}
                onChange={setAlbum}
                noResults="No matches"
              />
              <PropertyPicker
                icon={Award}
                label="Grade"
                placeholder="Set Grade"
                value={grade}
                options={gradeOptions}
                onChange={setGrade}
                noResults="No matches"
              />
            </div>
            <Card className="flex w-full max-w-[280px] flex-col gap-1 p-4">
              <h3 className="mb-1 text-xs font-medium text-muted-foreground">
                Properties
              </h3>
              <PropertyRow label="Album">
                <PropertyPicker
                  icon={Folder}
                  label="Album"
                  placeholder="Add to Album"
                  value={album}
                  options={[
                    ...albumOptions,
                    ...newAlbums.map((name) => ({
                      value: name,
                      label: name,
                      icon: albumDot("#64748b"),
                      count: 0,
                    })),
                  ]}
                  onChange={setAlbum}
                  onClear={() => setAlbum(undefined)}
                  clearLabel="No Album"
                  createLabel={(name) => `Create Album “${name}”`}
                  onCreate={(name) => {
                    setNewAlbums((names) => [...names, name]);
                    setAlbum(name);
                  }}
                  noResults="No matches"
                />
              </PropertyRow>
              <PropertyRow label="Grade">
                <PropertyPicker
                  icon={Award}
                  label="Grade"
                  placeholder="Set Grade"
                  value={grade}
                  options={gradeOptions}
                  onChange={setGrade}
                  noResults="No matches"
                />
              </PropertyRow>
              <PropertyRow label="Metal value">
                <span className="text-[13px]">{money(249559, "EUR")}</span>
              </PropertyRow>
            </Card>
          </Section>

          <Section title="Badges and shortcuts">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>MS-63</Badge>
              <Badge variant="outline">Strike: Proof</Badge>
              <Badge variant="success">+12.4%</Badge>
              <Badge variant="destructive">Over limit</Badge>
              <Kbd>C</Kbd>
              <Kbd>/</Kbd>
            </div>
          </Section>

          <Section title="Full form">
            <Card className="flex max-w-2xl flex-col gap-4 p-4">
              <SegmentedControl
                label="Item type"
                value={itemType}
                onChange={setItemType}
                options={typeOptions.map(({ value, label }) => ({
                  value,
                  label,
                }))}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label
                    htmlFor="design-title"
                    className="text-xs text-muted-foreground"
                  >
                    Title
                  </Label>
                  <Input
                    id="design-title"
                    defaultValue="Morgan dollar 1881-S"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="design-price"
                    className="text-xs text-muted-foreground"
                  >
                    Purchase price
                  </Label>
                  <div className="relative">
                    <Input
                      id="design-price"
                      inputMode="decimal"
                      defaultValue="75,00"
                      className="pr-12 text-right"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      EUR
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="design-quantity"
                    className="text-xs text-muted-foreground"
                  >
                    Quantity
                  </Label>
                  <Input
                    id="design-quantity"
                    type="number"
                    defaultValue={1}
                    min={1}
                    aria-invalid="true"
                    aria-describedby="design-quantity-error"
                  />
                  <p
                    id="design-quantity-error"
                    className="text-xs text-destructive"
                  >
                    Use a whole number of 1 or more.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="design-currency"
                    className="text-xs text-muted-foreground"
                  >
                    Home currency
                  </Label>
                  <PropertyPicker
                    id="design-currency"
                    icon={Wallet}
                    label="Home currency"
                    value={currency}
                    options={currencyOptions}
                    onChange={setCurrency}
                    noResults="No matches"
                  />
                </div>
                <div className="flex items-center gap-2 self-end">
                  <Switch id="design-bullion" />
                  <Label htmlFor="design-bullion">Bullion</Label>
                </div>
                <Field
                  id="design-email"
                  label="Email"
                  hint="We send a code to check it's yours."
                  error="Enter an email address, like name@example.com."
                  className="sm:col-span-2"
                >
                  {(control) => (
                    <Input {...control} type="email" defaultValue="ada@" />
                  )}
                </Field>
                <CheckboxField
                  id="design-terms"
                  className="sm:col-span-2"
                  checked={acceptedTerms}
                  onCheckedChange={setAcceptedTerms}
                  label="I accept the privacy policy and the terms of use"
                  error={
                    acceptedTerms
                      ? undefined
                      : "Accept the privacy policy and terms of use to continue."
                  }
                />
              </div>
            </Card>
          </Section>

          <Section title="Collection list">
            <div className="rounded-xl bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Market value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.title}>
                      <TableCell className="py-1.5">
                        <div className="flex items-center gap-2.5">
                          <ItemTypeIcon type={item.type} />
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-medium">
                              {item.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {item.detail}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.grade}
                      </TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
                      <TableCell className="text-right">
                        {money(item.market * item.qty, "EUR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Section>

          <Section title="Dialogs and empty state">
            <div className="flex flex-wrap gap-2">
              <NewItemDialog />
              <DeleteAlbumDialog />
            </div>
            <EmptyState
              icon={
                <Coins
                  className="size-4"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              }
              title="Your Collection is empty"
              description="Add your first coin, banknote or stamp to see it here."
              action={<Button>Add Item</Button>}
            />
          </Section>

          <Section title="Item photos and viewer">
            <ItemPhotosSample />
          </Section>

          <Section title="Filters">
            <FiltersSample />
          </Section>

          <Section title="Settings rows">
            <SettingsGroup title="Preferences">
              <SettingsRow
                label="Show Market value"
                description="Adds the column to the Collection list."
              >
                <Switch aria-label="Show Market value" defaultChecked />
              </SettingsRow>
              <SettingsRow
                label="Appearance"
                description="Light, dark, or the same as your device."
              >
                <AppearancePicker />
              </SettingsRow>
            </SettingsGroup>
          </Section>

          <Section title="Unseen marker">
            <div className="flex w-[220px] flex-col rounded-lg border bg-popover p-1">
              <div className="flex h-7 items-center gap-2 rounded-md px-2 text-[13px]">
                <Sparkles
                  className="size-4 text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                Updates
                <UnseenMarker className="ml-auto" />
                <span className="sr-only">New release</span>
              </div>
            </div>
          </Section>

          <Section title="Collection charts">
            <TotalsFigures totals={sampleTotals} />
            <div
              className={cn("grid gap-4 lg:grid-cols-2", seriesColorVariables)}
            >
              <ValueChart totals={sampleTotals} overTime={sampleOverTime()} />
              <ValueDistributionChart totals={sampleTotals} />
            </div>
          </Section>
        </div>
      </div>
    </AppShell>
  );
}

/** A list toolbar with a filter on, as the Collection shows it. */
function FiltersSample() {
  const [open, setOpen] = useState(false);
  const [grade, setGrade] = useState("XF");
  const grades = [
    { value: "UNC", count: 4 },
    { value: "XF", count: 12 },
    { value: "VF", count: 7 },
  ];
  return (
    <div className="rounded-xl bg-card">
      <div className="flex h-10 items-center justify-between gap-2 border-b px-4">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <Button variant="ghost" size="xs">
            <ListFilter strokeWidth={1.75} aria-hidden="true" />
            Filter
            <span className="rounded-md bg-accent px-1 text-xs text-accent-foreground">
              1
            </span>
          </Button>
          <Input
            aria-label="Search the Collection"
            placeholder="Search title, denomination, country"
            className="h-7 w-[220px] text-[13px]"
          />
        </div>
        <Button variant="ghost" size="xs">
          <SlidersHorizontal strokeWidth={1.75} aria-hidden="true" />
          Display
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 px-4 py-2">
        <FilterChip
          icon={Award}
          label="Grade"
          value={grade}
          removeLabel="Remove filter: Grade"
          onRemove={() => toast("Filter removed")}
          open={open}
          onOpenChange={setOpen}
        >
          <Command>
            <CommandInput placeholder="Grade" />
            <CommandList>
              <CommandGroup>
                {grades.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      setGrade(option.value);
                      setOpen(false);
                    }}
                  >
                    <span className="flex size-4 items-center justify-center">
                      {option.value === grade && (
                        <Check className="text-link" aria-hidden="true" />
                      )}
                    </span>
                    {option.value}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {option.count}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </FilterChip>
        <Button variant="ghost" size="xs">
          Clear
        </Button>
      </div>
    </div>
  );
}
