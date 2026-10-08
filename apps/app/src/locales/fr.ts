import type { Dictionary } from "./types";

export default {
  common: {
    language: "Langue",
    appDescription:
      "Enregistrez les pièces, billets et timbres que vous possédez.",
  },
  nav: {
    overview: "Aperçu",
    collection: "Collection",
    catalog: "Catalogue",
    albums: "Albums",
    account: "Compte",
  },
  shell: {
    skipToContent: "Aller au contenu",
    primaryNavigation: "Menu principal",
    add: "Ajouter",
    signOut: "Se déconnecter",
    theme: "Thème",
    themeLight: "Clair",
    themeDark: "Sombre",
    themeSystem: "Système",
  },
  placeholder: {
    title: "Rien ici pour l’instant",
    description: "Cette partie de CoinsLite arrive bientôt.",
  },
  login: {
    title: "Connexion",
    tagline: "Connectez-vous à votre collection",
    continueWithGoogle: "Continuer avec Google",
  },
  dashboard: {
    headerTitle: "Aperçu",
    headerDescription: "Votre collection en un coup d’œil.",
    bodyTitle: "Bienvenue sur CoinsLite",
    bodyDescription: "Votre collection apparaîtra ici.",
  },
  settings: {
    title: "Paramètres",
    headerTitle: "Paramètres",
    headerDescription: "Gérez les paramètres de votre compte.",
    avatar: {
      title: "Votre avatar",
      description: "Voici votre avatar. Il s’affiche sur votre profil.",
      uploadHint: "Cliquez sur l’avatar pour importer votre propre image.",
      resetButton: "Réinitialiser",
    },
    deleteAccount: {
      title: "Supprimer le compte",
      description:
        "Supprimez définitivement votre compte CoinsLite et tout son contenu.",
      warning: "Cette action est irréversible. Procédez avec prudence.",
      deleteButton: "Supprimer le compte",
      confirmButton: "Êtes-vous sûr ?",
    },
    sidebar: {
      general: "Général",
      billing: "Facturation",
    },
  },
} as const satisfies Dictionary;
