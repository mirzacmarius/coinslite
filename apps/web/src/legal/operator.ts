export type OperatorDetail =
  | "operator"
  | "address"
  | "email"
  | "law"
  | "authority"
  | "backupDays"
  | "logDays";

/**
 * Who runs CoinsLite and how long its providers keep copies, as the privacy
 * policy and terms state them. A human fills these in before launch (spec
 * §17); until every one is set, the texts show the missing ones as marked
 * placeholders under a visible draft notice. Never fill them with made-up values.
 */
export const operator: Record<OperatorDetail, string | null> = {
  /** The legal entity's registered name, with its registration number. */
  operator: null,
  /** Its postal address, on one line. */
  address: null,
  /** The email address for privacy requests and questions about the terms. */
  email: null,
  /** The country whose law governs the terms, as an ISO code such as "NO". */
  law: null,
  /** The data-protection authority complaints go to, by name. */
  authority: null,
  /** How many days deleted data can remain in the backend's backups, e.g. "30". */
  backupDays: null,
  /** How many days the hosting providers keep request and error logs, e.g. "30". */
  logDays: null,
};

/** Whether the texts are still drafts: some detail isn't filled in yet. */
export const isDraft = Object.values(operator).some((value) => value === null);
