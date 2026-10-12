/**
 * What a TanStack form field's errors say, to show under it: undefined when
 * there's nothing to say. A zod rule gives an issue per problem, each with a
 * message; a rule written as a function gives the message itself. Several
 * problems read as a list.
 */
export function errorText(errors: readonly unknown[]) {
  const messages = errors.map((error) =>
    typeof error === "string"
      ? error
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
        ? error.message
        : "",
  );
  return messages.filter(Boolean).join(", ") || undefined;
}
