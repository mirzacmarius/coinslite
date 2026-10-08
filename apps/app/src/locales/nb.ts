import type { Dictionary } from "./types";

export default {
  common: {
    language: "Språk",
    appDescription: "Registrer myntene, sedlene og frimerkene du eier.",
  },
  nav: {
    overview: "Oversikt",
    collection: "Samling",
    catalog: "Katalog",
    albums: "Album",
    account: "Konto",
  },
  shell: {
    skipToContent: "Hopp til innhold",
    primaryNavigation: "Hovedmeny",
    signOut: "Logg ut",
    workspaceMenu: "Konto og innstillinger",
    plans: "Abonnement",
    appearance: "Utseende",
    appearanceLight: "Lyst",
    appearanceDark: "Mørkt",
    appearanceSystem: "System",
    more: "Mer",
  },
  placeholder: {
    title: "Ingenting her ennå",
    description: "Denne delen av CoinsLite kommer snart.",
  },
  login: {
    title: "Logg inn",
    tagline: "Logg inn på samlingen din",
    continueWithGoogle: "Fortsett med Google",
  },
  dashboard: {
    headerTitle: "Oversikt",
    headerDescription: "Oversikt over samlingen din.",
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
