import type { Dictionary } from "./types";

export default {
  common: {
    language: "Sprache",
    appDescription:
      "Erfasse die Münzen, Banknoten und Briefmarken, die du besitzt.",
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
