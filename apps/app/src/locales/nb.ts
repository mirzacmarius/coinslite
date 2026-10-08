import type { Dictionary } from "./types";

export default {
  common: {
    language: "Språk",
  },
  login: {
    tagline: "Logg inn i samlingen din",
    continueWithGoogle: "Fortsett med Google",
  },
  dashboard: {
    headerTitle: "Oversikt",
    headerDescription: "Samlingen din på et øyeblikk.",
    bodyTitle: "Velkommen til CoinsLite",
    bodyDescription: "Samlingen din vises her.",
  },
  settings: {
    title: "Innstillinger",
    headerTitle: "Innstillinger",
    headerDescription: "Administrer kontoinnstillingene dine.",
    avatar: {
      title: "Profilbildet ditt",
      description: "Dette er profilbildet ditt. Det vises på profilen din.",
      uploadHint: "Klikk på profilbildet for å laste opp ditt eget bilde.",
      resetButton: "Tilbakestill",
    },
    deleteAccount: {
      title: "Slett konto",
      description: "Slett CoinsLite-kontoen din og alt innholdet permanent.",
      warning: "Dette kan ikke angres. Vær forsiktig.",
      deleteButton: "Slett konto",
      confirmButton: "Er du sikker?",
    },
    sidebar: {
      general: "Generelt",
      billing: "Fakturering",
    },
  },
} as const satisfies Dictionary;
