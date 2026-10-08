import type { Dictionary } from "./types";

export default {
  common: {
    language: "Sprache",
    appDescription:
      "Erfasse die Münzen, Banknoten und Briefmarken, die du besitzt.",
  },
  nav: {
    overview: "Übersicht",
    collection: "Sammlung",
    catalog: "Katalog",
    albums: "Alben",
    account: "Konto",
  },
  shell: {
    skipToContent: "Zum Inhalt springen",
    primaryNavigation: "Hauptmenü",
    signOut: "Abmelden",
    workspaceMenu: "Konto und Einstellungen",
    plans: "Tarife",
    appearance: "Darstellung",
    appearanceLight: "Hell",
    appearanceDark: "Dunkel",
    appearanceSystem: "System",
    more: "Mehr",
  },
  placeholder: {
    title: "Noch nichts hier",
    description: "Dieser Teil von CoinsLite ist bald da.",
  },
  login: {
    title: "Anmelden",
    tagline: "Melde dich an, um deine Sammlung zu sehen",
    continueWithGoogle: "Weiter mit Google",
  },
  dashboard: {
    headerTitle: "Übersicht",
    headerDescription: "Deine Sammlung auf einen Blick.",
    bodyTitle: "Willkommen bei CoinsLite",
    bodyDescription: "Deine Sammlung wird hier angezeigt.",
  },
  settings: {
    title: "Einstellungen",
    headerTitle: "Einstellungen",
    headerDescription: "Verwalte deine Kontoeinstellungen.",
    avatar: {
      title: "Dein Avatar",
      description: "Das ist dein Avatar. Er wird in deinem Profil angezeigt.",
      uploadHint: "Klicke auf den Avatar, um ein eigenes Bild hochzuladen.",
      resetButton: "Zurücksetzen",
    },
    deleteAccount: {
      title: "Konto löschen",
      description: "Lösche dein CoinsLite-Konto mit allen Inhalten dauerhaft.",
      warning:
        "Das kann nicht rückgängig gemacht werden. Sei bitte vorsichtig.",
      deleteButton: "Konto löschen",
      confirmButton: "Bist du sicher?",
    },
    sidebar: {
      general: "Allgemein",
      billing: "Abrechnung",
    },
  },
} as const satisfies Dictionary;
