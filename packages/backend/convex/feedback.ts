import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import { env, mutation } from "./_generated/server";
import { checkMessage, feedbackErrors } from "./feedback/rules";
import { requireSetUpUser } from "./utils/auth";

/** Five messages an hour per person; one more becomes available every 12 minutes. */
const rateLimiter = new RateLimiter(components.rateLimiter, {
  feedback: { kind: "token bucket", rate: 5, period: HOUR, capacity: 5 },
});

/**
 * Sends a free-text message from the Account screen to the CoinsLite team's
 * inbox (FEEDBACK_EMAIL), saying who sent it; replying answers the sender.
 */
export const send = mutation({
  args: { message: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireSetUpUser(ctx);
    const message = checkMessage(args.message);
    const { ok } = await rateLimiter.limit(ctx, "feedback", { key: user._id });
    if (!ok) throw new ConvexError(feedbackErrors.tooManyRequests);
    const email = {
      subject: `CoinsLite feedback from ${user.email ?? "an account without email"}`,
      body: [
        message,
        "",
        "---",
        `Account id: ${user._id}`,
        `Email: ${user.email ?? "none"}`,
      ].join("\n"),
      replyTo: user.email,
    };
    if (!env.FEEDBACK_EMAIL) {
      // Not configured (yet): keep the message in the deployment log, so it isn't lost.
      console.warn(
        "FEEDBACK_EMAIL is not set, so this feedback wasn't emailed.",
        `${email.subject}\n\n${email.body}`,
      );
      return null;
    }
    await ctx.scheduler.runAfter(0, internal.accounts.emails.send, {
      to: env.FEEDBACK_EMAIL,
      ...email,
    });
    return null;
  },
});
