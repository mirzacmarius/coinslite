"use client";

import { AppShell } from "@/components/shell/app-shell";
import { useFormatters } from "@/locales/use-formatters";
import { Badge } from "@coinslite/ui/badge";
import { Button } from "@coinslite/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@coinslite/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@coinslite/ui/dialog";
import { EmptyState } from "@coinslite/ui/empty-state";
import { Input } from "@coinslite/ui/input";
import { ItemTypeIcon } from "@coinslite/ui/item-type-icon";
import { Label } from "@coinslite/ui/label";
import { PageHeader } from "@coinslite/ui/page-header";
import { Progress } from "@coinslite/ui/progress";
import { SegmentedControl } from "@coinslite/ui/segmented-control";
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
import { Coins, Plus } from "lucide-react";
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
  "background",
  "card",
  "muted",
  "accent",
  "primary",
  "success",
  "destructive",
  "border",
] as const;

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function Section({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  const id = `design-${slug(title)}`;
  return (
    <section className="flex flex-col gap-3" aria-labelledby={id}>
      <h2 id={id} className="text-sm font-semibold text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function DesignGallery() {
  const { money } = useFormatters();
  const [itemType, setItemType] = useState<"coin" | "banknote" | "stamp">(
    "coin",
  );
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
        <Card className="flex flex-col gap-2 p-3 shadow-none">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Free plan</span>
            <span className="font-semibold">18 / 50 Items</span>
          </div>
          <Progress value={18} max={50} label="Items used on the Free plan" />
        </Card>
      }
    >
      {/* The samples are English only, whatever the interface language. */}
      <div lang="en" className="contents">
        <PageHeader
          title="Design system"
          description="Ledger: tokens and components used across CoinsLite."
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
              >
                Export
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => toast.success("Item added to your Collection")}
              >
                <Plus className="size-4" aria-hidden="true" />
                Add
              </Button>
            </>
          }
        />

        <Section title="Value summary">
          <Card className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4 sm:p-5">
            {totals.map(({ label, value, tone }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className={cn("text-lg font-semibold sm:text-xl", tone)}>
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
                className="flex items-center gap-2 rounded-md border bg-card p-2 text-sm"
              >
                <span
                  className="size-6 rounded border"
                  style={{ background: `hsl(var(--${token}))` }}
                  aria-hidden="true"
                />
                {token}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Buttons and badges">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Save item</Button>
            <Button variant="secondary">Duplicate</Button>
            <Button variant="outline">Cancel</Button>
            <Button variant="ghost">More details</Button>
            <Button variant="destructive">Delete</Button>
            <Button variant="link">View Collection</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>MS-63</Badge>
            <Badge variant="outline">Strike: Proof</Badge>
            <Badge variant="success">+12.4%</Badge>
            <Badge variant="destructive">Over limit</Badge>
          </div>
        </Section>

        <Section title="Item form">
          <Card>
            <CardHeader>
              <CardTitle>New item</CardTitle>
              <CardDescription>
                Pick the type, then fill in what you know.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <SegmentedControl
                label="Item type"
                value={itemType}
                onChange={setItemType}
                options={[
                  { value: "coin", label: "Coin" },
                  { value: "banknote", label: "Banknote" },
                  { value: "stamp", label: "Stamp" },
                ]}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="design-title">Title</Label>
                  <Input
                    id="design-title"
                    defaultValue="Morgan dollar 1881-S"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="design-quantity">Quantity</Label>
                  <Input
                    id="design-quantity"
                    type="number"
                    defaultValue={1}
                    min={1}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="design-bullion" />
                <Label htmlFor="design-bullion">Bullion</Label>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section title="Collection table">
          <Card className="p-1">
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
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <ItemTypeIcon type={item.type} />
                        <div className="flex flex-col">
                          <span className="font-medium">{item.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.detail}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge>{item.grade}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{item.qty}</TableCell>
                    <TableCell className="text-right">
                      {money(item.market * item.qty, "EUR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </Section>

        <Section title="Dialog and empty state">
          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Delete Album…</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete “Morgans”?</DialogTitle>
                  <DialogDescription>
                    Items you don’t tick stay in your Collection without an
                    Album.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="destructive">Delete Album</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <EmptyState
            icon={<Coins className="size-5" aria-hidden="true" />}
            title="Your Collection is empty"
            description="Add your first coin, banknote or stamp to see it here."
            action={<Button size="sm">Add an Item</Button>}
          />
        </Section>
      </div>
    </AppShell>
  );
}
