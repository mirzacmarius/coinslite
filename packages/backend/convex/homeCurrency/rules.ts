/** Changing the Home currency. Pure, so the Account screen shares it with the backend. */

export const homeCurrencyErrors = {
  /** The new Home currency is the current one. */
  sameCurrency: "SAME_CURRENCY",
  /** There are amounts to convert but no stored exchange rate yet. */
  rateUnavailable: "RATE_UNAVAILABLE",
  /** The stored rate isn't the one the person confirmed: it was refreshed meanwhile. */
  rateChanged: "RATE_CHANGED",
  /** More Items than one change can convert at once (`homeCurrencyLimits.items`). */
  collectionTooLarge: "COLLECTION_TOO_LARGE",
  /** A converted amount would go past the largest amount an Item may hold. */
  amountTooLarge: "AMOUNT_TOO_LARGE",
} as const;

export const homeCurrencyLimits = {
  /**
   * The most Items one change converts. Every amount is converted in one
   * transaction, so no one ever sees a Collection half in the old currency;
   * this keeps that transaction well inside the database's per-transaction
   * read and write limits.
   */
  items: 5000,
  /** The most Market value history points one change converts, likewise. */
  historyPoints: 5000,
} as const;
