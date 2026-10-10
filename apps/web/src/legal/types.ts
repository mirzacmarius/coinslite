/** A paragraph, or a bulleted list. */
export type LegalBlock = string | readonly string[];

export type LegalSection = {
  /** The anchor, the same in every language: /de/privacy#rights. */
  id: string;
  heading: string;
  blocks: readonly LegalBlock[];
};

/**
 * A legal text in one language. Texts may name the operator's details as
 * {operator}, {address}, {email}, {law}, {authority}, {backupDays} and
 * {logDays}; operator.ts fills them in, or marks them as still missing.
 * {limit} is the Free plan's Item limit.
 */
export type LegalText = {
  title: string;
  description: string;
  sections: readonly LegalSection[];
};
