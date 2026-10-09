import { ConvexError } from "convex/values";

/** What a feedback message may hold. Pure, so the app's feedback form checks the same limit. */

export const feedbackErrors = {
  messageRequired: "MESSAGE_REQUIRED",
  tooLong: "TOO_LONG",
  tooManyRequests: "TOO_MANY_REQUESTS",
} as const;

export const feedbackLimits = {
  /** Characters in one message, after trimming. */
  message: 5000,
} as const;

/** The message as it's sent: trimmed, not empty, within the limit. */
export function checkMessage(message: string) {
  const trimmed = message.trim();
  if (!trimmed) throw new ConvexError(feedbackErrors.messageRequired);
  if (trimmed.length > feedbackLimits.message) {
    throw new ConvexError(feedbackErrors.tooLong);
  }
  return trimmed;
}
