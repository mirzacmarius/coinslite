import { type Infer, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";

/**
 * When an account may be deleted (account/deletion.ts). Pure, so it's tested
 * without the backend.
 */

/**
 * Why an account is deleted without the person there: deactivated and its
 * time up (account/closing.ts), or unused (account/inactivity.ts). Each
 * stage checks it still holds, so reactivating or signing in meanwhile
 * keeps the account.
 */
export const closingReason = v.union(
  v.literal("deactivated"),
  v.literal("unused"),
);
export type ClosingReason = Infer<typeof closingReason>;

/**
 * Whether the account is still due to go for `reason`, or, without one, at
 * the person's own request: either way only while it's deactivated, unless
 * it's going for being unused.
 */
export function stillDue(
  user: Pick<Doc<"users">, "deactivatedAt" | "inactivityNotice" | "plan">,
  reason: ClosingReason | undefined,
) {
  if (reason === "unused")
    return (
      user.inactivityNotice === 12 &&
      user.plan === undefined &&
      user.deactivatedAt === undefined
    );
  return user.deactivatedAt !== undefined;
}
