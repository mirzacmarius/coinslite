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
  auth: {
    signIn: {
      pageTitle: "Anmelden",
      title: "Melde dich an, um deine Sammlung zu sehen",
      submit: "Anmelden",
      forgotPassword: "Passwort vergessen?",
      noAccount: "Neu bei CoinsLite?",
      createAccount: "Konto erstellen",
      failed:
        "E-Mail-Adresse und Passwort passen nicht zusammen. Prüfe sie oder setze dein Passwort zurück.",
      verifyToContinue:
        "Bestätige deine E-Mail-Adresse, um die Anmeldung abzuschließen.",
    },
    signUp: {
      pageTitle: "Konto erstellen",
      title: "Erstelle dein Konto",
      description:
        "Erfasse die Münzen, Banknoten und Briefmarken, die du besitzt.",
      submit: "Konto erstellen",
      homeCurrencyHint:
        "Die Werte deiner Sammlung werden in dieser Währung angezeigt.",
      acceptTerms: "Ich akzeptiere die {privacy} und die {terms}",
      privacyPolicy: "Datenschutzerklärung",
      termsOfUse: "Nutzungsbedingungen",
      termsRequired:
        "Akzeptiere die Datenschutzerklärung und die Nutzungsbedingungen, um fortzufahren.",
      haveAccount: "Du hast schon ein Konto?",
      failed:
        "Wir konnten das Konto nicht erstellen. Wenn du schon eines hast, melde dich an oder setze dein Passwort zurück.",
    },
    fields: {
      email: "E-Mail",
      password: "Passwort",
      newPassword: "Neues Passwort",
      homeCurrency: "Heimatwährung",
      passwordHint: "Mindestens 8 Zeichen.",
      code: "Code",
      emailInvalid: "Gib eine E-Mail-Adresse ein, z. B. name@beispiel.de.",
      passwordTooShort: "Verwende mindestens 8 Zeichen.",
      passwordRequired: "Gib dein Passwort ein.",
      codeInvalid: "Gib die 8 Ziffern aus der E-Mail ein.",
    },
    code: {
      title: "Prüfe dein Postfach",
      description:
        "Wir haben einen 8-stelligen Code an {email} gesendet. Er läuft in 15 Minuten ab.",
      submit: "E-Mail bestätigen",
      resend: "Neuen Code senden",
      resent: "Wir haben einen neuen Code an {email} gesendet.",
      differentEmail: "Andere E-Mail-Adresse verwenden",
      failed:
        "Der Code hat nicht funktioniert. Prüfe ihn oder fordere einen neuen an.",
    },
    verify: {
      pageTitle: "E-Mail bestätigen",
      title: "Deine E-Mail-Adresse wird bestätigt",
      working: "Einen Moment …",
      failed:
        "Dieser Link ist abgelaufen oder wurde schon verwendet. Melde dich an, um einen neuen Code zu erhalten.",
      noLink:
        "Öffne den Link aus der Bestätigungs-E-Mail oder melde dich an, um einen neuen Code zu erhalten.",
    },
    reset: {
      pageTitle: "Passwort zurücksetzen",
      title: "Setze dein Passwort zurück",
      description:
        "Wir senden dir einen Code per E-Mail, mit dem du ein neues Passwort wählst.",
      sendCode: "Code senden",
      codeSent:
        "Falls {email} ein CoinsLite-Konto hat, haben wir einen Code dorthin gesendet. Er läuft in 15 Minuten ab.",
      newPasswordTitle: "Wähle ein neues Passwort",
      submit: "Passwort speichern",
      failed:
        "Der Code hat nicht funktioniert oder ist abgelaufen. Fordere einen neuen an.",
    },
    backToSignIn: "Zurück zur Anmeldung",
    noMatches: "Keine Treffer",
    failedGeneric: "Etwas ist schiefgelaufen. Versuche es noch einmal.",
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
