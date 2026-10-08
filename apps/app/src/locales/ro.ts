import type { Dictionary } from "./types";

export default {
  common: {
    language: "Limbă",
    appDescription:
      "Înregistrează monedele, bancnotele și timbrele pe care le deții.",
  },
  login: {
    title: "Conectare",
    tagline: "Conectează-te la colecția ta",
    continueWithGoogle: "Continuă cu Google",
  },
  dashboard: {
    headerTitle: "Prezentare generală",
    headerDescription: "Colecția ta dintr-o privire.",
    bodyTitle: "Bun venit la CoinsLite",
    bodyDescription: "Colecția ta va apărea aici.",
  },
  settings: {
    title: "Setări",
    headerTitle: "Setări",
    headerDescription: "Gestionează setările contului tău.",
    avatar: {
      title: "Avatarul tău",
      description: "Acesta este avatarul tău. Apare în profilul tău.",
      uploadHint: "Apasă pe avatar pentru a încărca propria imagine.",
      resetButton: "Resetează",
    },
    deleteAccount: {
      title: "Șterge contul",
      description:
        "Șterge definitiv contul tău CoinsLite și tot conținutul lui.",
      warning: "Această acțiune nu poate fi anulată. Continuă cu atenție.",
      deleteButton: "Șterge contul",
      confirmButton: "Ești sigur?",
    },
    sidebar: {
      general: "General",
      billing: "Facturare",
    },
  },
} as const satisfies Dictionary;
