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
  items: {
    add: "Objekt hinzufügen",
    new: "Neues Objekt",
    title: "Titel",
    titlePlaceholder: "Titel, z. B. 5 Mark 1951",
    notesPlaceholder: "Notizen hinzufügen…",
    type: "Objektart",
    types: {
      coin: "Münze",
      banknote: "Banknote",
      stamp: "Briefmarke",
    },
    country: "Land",
    setCountry: "Land wählen",
    year: "Jahr",
    denomination: "Nennwert",
    quantity: "Anzahl",
    purchasePrice: "Kaufpreis",
    marketValue: "Marktwert",
    perPiece: "pro Stück",
    purchaseDate: "Kaufdatum",
    source: "Bezugsquelle",
    sourcePlaceholder: "Wo du es bekommen hast",
    notes: "Notizen",
    moreDetails: "Weitere Angaben",
    createMore: "Weitere hinzufügen",
    cancel: "Abbrechen",
    close: "Schließen",
    added: "Objekt zur Sammlung hinzugefügt",
    emptyTitle: "Deine Sammlung ist leer",
    emptyDescription:
      "Füge deine erste Münze, Banknote oder Briefmarke hinzu, um sie hier zu sehen.",
    showMore: "Mehr anzeigen",
    notFoundTitle: "Objekt nicht gefunden",
    notFound:
      "Dieses Objekt gibt es nicht, oder es gehört nicht zu deiner Sammlung.",
    backToCollection: "Zurück zur Sammlung",
    details: "Angaben",
    purchase: "Kauf",
    noMatches: "Keine Treffer",
    errors: {
      titleRequired: "Gib dem Objekt einen Titel.",
      quantity: "Verwende eine ganze Zahl ab 1.",
      year: "Gib ein Jahr wie 1881 ein.",
      amount: "Gib einen Betrag wie 75,50 ein.",
      date: "Wähle ein Datum, das nicht in der Zukunft liegt.",
      failed:
        "Das Objekt konnte nicht hinzugefügt werden. Versuche es noch einmal.",
    },
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
        "Wir konnten das Konto nicht erstellen. Wenn du schon eines hast, melde dich an: mit Passwort, Anmeldelink oder Google.",
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
      title: "Bestätige deine E-Mail-Adresse",
      description:
        "Bestätige, dass {email} dir gehört, um die Registrierung abzuschließen.",
      confirm: "E-Mail-Adresse bestätigen",
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
    methods: {
      or: "oder",
      google: "Weiter mit Google",
      link: "Anmeldelink per E-Mail senden",
    },
    link: {
      pageTitle: "Mit Link anmelden",
      title: "Mit Link anmelden",
      description:
        "Wir senden dir einen Link per E-Mail, der dich anmeldet. Neu bei CoinsLite? Derselbe Link erstellt dein Konto.",
      submit: "Link senden",
      sentTitle: "Prüfe dein Postfach",
      sent: "Wir haben einen Anmeldelink an {email} gesendet. Er funktioniert einmal und läuft in 15 Minuten ab.",
      usePassword: "Stattdessen mit Passwort anmelden",
      failed:
        "Dieser Anmeldelink ist abgelaufen oder wurde schon verwendet. Fordere einen neuen an.",
      confirmTitle: "Bei CoinsLite anmelden",
      confirmDescription: "Weiter als {email}.",
      confirm: "Anmelden",
    },
    welcome: {
      pageTitle: "Einrichtung abschließen",
      title: "Schließe die Einrichtung deines Kontos ab",
      description:
        "Angemeldet als {email}. Wähle deine Heimatwährung und akzeptiere die Bedingungen, um loszulegen.",
      submit: "CoinsLite verwenden",
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
  account: {
    pageTitle: "Konto",
    freePlan: "Gratis-Tarif",
    contact: {
      title: "Kontakt und Adresse",
      description: "Erscheint in deinem Versicherungsbericht.",
      displayName: "Anzeigename",
      fullName: "Vollständiger Name",
      streetAddress: "Adresse",
      postalCode: "Postleitzahl",
      city: "Ort",
      country: "Land",
      setCountry: "Land wählen",
      phone: "Telefon",
      save: "Speichern",
      saved: "Gespeichert",
      displayNameRequired: "Gib einen Anzeigenamen ein.",
      invalidPhone: "Gib eine Telefonnummer wie +49 30 1234567 ein.",
      failed: "Speichern fehlgeschlagen. Versuche es noch einmal.",
    },
    preferences: {
      title: "Einstellungen",
      language: "Sprache",
      homeCurrency: "Heimatwährung",
      homeCurrencyNote:
        "Bald kannst du sie ändern, und alle Beträge werden umgerechnet.",
    },
    email: {
      title: "E-Mail",
      current: "Du meldest dich mit {email} an.",
      newEmail: "Neue E-Mail-Adresse",
      send: "Bestätigungslink senden",
      sent: "Wir haben einen Link an {email} gesendet. Öffne ihn dort, um die Änderung abzuschließen.",
      invalid: "Gib eine E-Mail-Adresse ein, z. B. name@beispiel.de.",
      same: "Das ist bereits deine E-Mail-Adresse.",
      inUse: "Diese E-Mail-Adresse gehört zu einem anderen Konto.",
      tooMany: "Zu viele Anfragen. Versuche es in einer Stunde noch einmal.",
      failed: "Der Link konnte nicht gesendet werden. Versuche es noch einmal.",
    },
    danger: {
      title: "Abmelden oder löschen",
      signOut: "Abmelden",
      delete: "Konto löschen",
      deleteConfirm: "Zum Löschen von allem erneut klicken",
      deleteWarning:
        "Beim Löschen deines Kontos wird es mit allem darin entfernt. Das lässt sich nicht rückgängig machen.",
    },
    confirmEmail: {
      pageTitle: "E-Mail bestätigen",
      title: "Bestätige deine neue E-Mail-Adresse",
      description:
        "Ab jetzt meldest du dich bei CoinsLite mit der Adresse an, an die dieser Link ging.",
      confirm: "Neue E-Mail-Adresse bestätigen",
      done: "Deine E-Mail-Adresse ist jetzt {email}.",
      toAccount: "Zu deinem Konto",
      failed:
        "Dieser Link ist abgelaufen oder wurde schon verwendet. Fordere in deinem Konto einen neuen an.",
      inUse: "Diese E-Mail-Adresse gehört inzwischen zu einem anderen Konto.",
      noLink: "Öffne den Link aus der E-Mail an deine neue Adresse.",
    },
  },
} as const satisfies Dictionary;
