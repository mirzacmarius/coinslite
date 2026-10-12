import type { Locale } from "@coinslite/i18n";

/**
 * The words of the screen shown when the app itself fails
 * (app/global-error.tsx), in every language. They can't come from the
 * dictionaries: that screen replaces the root layout that provides them,
 * loading one could fail for the same reason the app did, and bundling all
 * five would weigh down every page. A language missing here fails typecheck.
 */
export const globalErrorTexts: Record<
  Locale,
  { title: string; description: string; reload: string }
> = {
  en: {
    title: "Something went wrong",
    description: "CoinsLite couldn't be shown. Reload the page to try again.",
    reload: "Reload page",
  },
  nb: {
    title: "Noe gikk galt",
    description:
      "CoinsLite kunne ikke vises. Last inn siden på nytt for å prøve igjen.",
    reload: "Last inn siden på nytt",
  },
  de: {
    title: "Etwas ist schiefgelaufen",
    description:
      "CoinsLite konnte nicht angezeigt werden. Lade die Seite neu, um es noch einmal zu versuchen.",
    reload: "Seite neu laden",
  },
  fr: {
    title: "Une erreur s’est produite",
    description:
      "CoinsLite n’a pas pu s’afficher. Rechargez la page pour réessayer.",
    reload: "Recharger la page",
  },
  ro: {
    title: "Ceva nu a mers",
    description:
      "CoinsLite nu a putut fi afișat. Reîncarcă pagina pentru a încerca din nou.",
    reload: "Reîncarcă pagina",
  },
};
