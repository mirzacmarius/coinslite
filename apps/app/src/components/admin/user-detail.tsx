"use client";

import { useHydrated } from "@/lib/use-hydrated";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { isPremiumCurrency } from "@coinslite/backend/convex/billing/rules";
import { localeNames } from "@coinslite/i18n";
import { Badge } from "@coinslite/ui/badge";
import { EmptyState } from "@coinslite/ui/empty-state";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { PropertyRow } from "@coinslite/ui/property-panel";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { SearchX } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useId } from "react";
import { NotAvailable } from "./users-page";

type Detail = NonNullable<FunctionReturnType<typeof api.admin.users.get>>;
type Subscription = NonNullable<Detail["subscription"]>;

/** Polar's subscription statuses the screen names; any other shows as Polar sends it. */
const knownStatuses = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
] as const;
type KnownStatus = (typeof knownStatuses)[number];
const isKnownStatus = (status: string): status is KnownStatus =>
  (knownStatuses as readonly string[]).includes(status);

/**
 * One user, for an admin supporting them: their profile, account dates, role,
 * plan and subscription, and what their Collection holds. Read-only. The user
 * comes from the URL, so this sits inside Suspense.
 */
export function UserDetail() {
  const t = useI18n();
  const { userId } = useParams<{ userId: string }>();
  const isAdminQuery = useQuery(api.admin.roles.isAdmin);
  // The workspace menu asks too; see useHydrated.
  const isAdmin = useHydrated() ? isAdminQuery : undefined;
  const user = useQuery(api.admin.users.get, isAdmin ? { userId } : "skip");
  const parent = (
    <Link href="/admin/users" className="hover:text-foreground">
      {t("adminUsers.title")}
    </Link>
  );

  if (isAdmin === false) {
    return (
      <>
        <HeaderBar parent={parent} title={t("adminUsers.notAvailable")} />
        <NotAvailable />
      </>
    );
  }
  if (user === undefined) {
    return (
      <>
        <HeaderBar parent={parent} title="" />
        <DetailSkeleton />
      </>
    );
  }
  if (user === null) {
    return (
      <>
        <HeaderBar parent={parent} title={t("adminUsers.notFoundTitle")} />
        <div className="p-4">
          <EmptyState
            icon={
              <SearchX
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            }
            title={t("adminUsers.notFoundTitle")}
            description={t("adminUsers.notFound")}
            action={
              <Link
                href="/admin/users"
                className="text-[13px] font-medium text-primary hover:underline"
              >
                {t("adminUsers.backToUsers")}
              </Link>
            }
          />
        </div>
      </>
    );
  }

  const title =
    user.profile.name ?? user.profile.email ?? t("adminUsers.noName");
  return (
    <>
      <HeaderBar parent={parent} title={title} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-medium">{title}</h2>
            {user.admin && (
              <Badge variant="outline">{t("adminUsers.admin")}</Badge>
            )}
            <Badge variant={user.plan === "premium" ? "outline" : "default"}>
              {t(`adminUsers.planNames.${user.plan}`)}
            </Badge>
          </div>
          {user.profile.email && user.profile.email !== title && (
            <p className="text-sm text-muted-foreground">
              {user.profile.email}
            </p>
          )}
        </div>
        <ProfileSection user={user} />
        <AccountSection user={user} />
        <PlanSection user={user} />
        <CollectionSection user={user} />
      </div>
    </>
  );
}

/** A titled card of label and value rows. */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="overflow-hidden rounded-lg border bg-card"
    >
      <h3 id={id} className="border-b px-4 py-2.5 text-[13px] font-medium">
        {title}
      </h3>
      <div className="flex flex-col px-4 py-2">{children}</div>
    </section>
  );
}

function ProfileSection({ user: { profile } }: { user: Detail }) {
  const t = useI18n();
  const { country } = useFormatters();
  const address = [
    profile.streetAddress,
    [profile.postalCode, profile.city].filter(Boolean).join(" "),
    profile.country && country(profile.country),
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <Section title={t("adminUsers.profile")}>
      <PropertyRow label={t("adminUsers.columns.name")}>
        {profile.name}
      </PropertyRow>
      <PropertyRow label={t("adminUsers.columns.email")}>
        {profile.email}
      </PropertyRow>
      <PropertyRow label={t("adminUsers.fullName")}>
        {profile.fullName}
      </PropertyRow>
      <PropertyRow label={t("adminUsers.phone")}>
        {profile.contactPhone}
      </PropertyRow>
      <PropertyRow label={t("adminUsers.address")} wrap>
        {address}
      </PropertyRow>
      <PropertyRow label={t("common.language")}>
        {profile.language && localeNames[profile.language]}
      </PropertyRow>
      <PropertyRow label={t("adminUsers.homeCurrency")}>
        {profile.homeCurrency}
      </PropertyRow>
    </Section>
  );
}

function AccountSection({ user }: { user: Detail }) {
  const t = useI18n();
  const { dateTime } = useFormatters();
  const { account } = user;
  return (
    <Section title={t("adminUsers.account")}>
      <PropertyRow label={t("adminUsers.role")}>
        {user.admin ? t("adminUsers.admin") : t("adminUsers.noRole")}
      </PropertyRow>
      <PropertyRow label={t("adminUsers.columns.created")}>
        {dateTime(account.createdAt)}
      </PropertyRow>
      <PropertyRow label={t("adminUsers.emailConfirmed")}>
        {account.emailVerifiedAt === null ? (
          <span className="text-muted-foreground">
            {t("adminUsers.notConfirmed")}
          </span>
        ) : (
          dateTime(account.emailVerifiedAt)
        )}
      </PropertyRow>
      <PropertyRow label={t("adminUsers.signedUp")}>
        {account.signedUpAt === null ? (
          <span className="text-muted-foreground">
            {t("adminUsers.notFinished")}
          </span>
        ) : (
          dateTime(account.signedUpAt)
        )}
      </PropertyRow>
      <PropertyRow label={t("adminUsers.columns.lastSignIn")}>
        {account.lastSignInAt !== null && dateTime(account.lastSignInAt)}
      </PropertyRow>
    </Section>
  );
}

function PlanSection({ user }: { user: Detail }) {
  const t = useI18n();
  const { subscription } = user;
  return (
    <Section title={t("adminUsers.planAndSubscription")}>
      <PropertyRow label={t("adminUsers.plan")}>
        {t(`adminUsers.planNames.${user.plan}`)}
      </PropertyRow>
      {subscription ? (
        <SubscriptionRows subscription={subscription} />
      ) : (
        <PropertyRow label={t("adminUsers.subscription")}>
          <span className="text-muted-foreground">
            {t("adminUsers.noSubscription")}
          </span>
        </PropertyRow>
      )}
    </Section>
  );
}

function SubscriptionRows({ subscription }: { subscription: Subscription }) {
  const t = useI18n();
  const { date, money, number } = useFormatters();
  const { status, interval, currency, amount, currentPeriodEnd, endedAt } =
    subscription;
  const monthly = interval === "month";
  const yearly = interval === "year";
  // Set to end, or ended: it won't renew.
  const ends =
    subscription.cancelAtPeriodEnd || status === "canceled" || endedAt !== null;
  return (
    <>
      <PropertyRow label={t("adminUsers.status")}>
        {isKnownStatus(status) ? t(`adminUsers.statuses.${status}`) : status}
      </PropertyRow>
      <PropertyRow label={t("billing.billingPeriod")}>
        {monthly
          ? t("billing.monthly")
          : yearly
            ? t("billing.yearly")
            : interval}
      </PropertyRow>
      <PropertyRow label={t("billing.price")}>
        {isPremiumCurrency(currency) && (monthly || yearly)
          ? t(monthly ? "billing.perMonth" : "billing.perYear", {
              price: money(amount, currency),
            })
          : `${number(amount / 100, { minimumFractionDigits: 2 })} ${currency}`}
      </PropertyRow>
      <PropertyRow label={t("adminUsers.started")}>
        {date(subscription.startedAt)}
      </PropertyRow>
      {endedAt !== null ? (
        <PropertyRow label={t("adminUsers.ended")}>{date(endedAt)}</PropertyRow>
      ) : (
        currentPeriodEnd !== null && (
          <PropertyRow label={t(ends ? "billing.ends" : "billing.renews")}>
            {date(currentPeriodEnd)}
          </PropertyRow>
        )
      )}
    </>
  );
}

function CollectionSection({ user: { collection } }: { user: Detail }) {
  const t = useI18n();
  const { number } = useFormatters();
  const rows = [
    ["items", collection.items],
    ["coins", collection.coins],
    ["banknotes", collection.banknotes],
    ["stamps", collection.stamps],
    ["albums", collection.albums],
  ] as const;
  return (
    <Section title={t("adminUsers.collection")}>
      {rows.map(([key, count]) => (
        <PropertyRow key={key} label={t(`adminStats.collection.${key}`)}>
          {number(count)}
        </PropertyRow>
      ))}
    </Section>
  );
}

/** The four sections and their rows, while the user loads. */
const skeleton = [
  ["profile", 7],
  ["account", 5],
  ["plan", 2],
  ["collection", 5],
] as const;

/** The cards' shape while the user loads. */
function DetailSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4"
      aria-hidden="true"
    >
      <span className="h-5 w-48 animate-pulse rounded bg-muted" />
      {skeleton.map(([section, rows]) => (
        <div
          key={section}
          className="overflow-hidden rounded-lg border bg-card"
        >
          <div className="border-b px-4 py-3">
            <span className="block h-3.5 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex flex-col gap-3 px-4 py-3">
            {Array.from({ length: rows }, (_, row) => row).map((row) => (
              <span
                key={row}
                className="h-3 w-64 max-w-full animate-pulse rounded bg-muted"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
