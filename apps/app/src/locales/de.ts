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
    series: "Serie",
    category: "Kategorie",
    ruler: "Herrscher",
    mintMark: "Münzzeichen",
    mintage: "Auflage",
    numistaNumber: "Numista-Nummer",
    material: "Material",
    setMaterial: "Material wählen",
    noMaterial: "Kein Material",
    materialNote: "Notiz zum Material",
    materialNotePlaceholder: "z. B. 900er Silber",
    diameter: "Durchmesser",
    thickness: "Dicke",
    millimetres: "mm",
    description: "Beschreibung",
    physical: "Beschaffenheit",
    edit: "Bearbeiten",
    editItem: "Objekt bearbeiten",
    save: "Speichern",
    saved: "Objekt gespeichert",
    duplicate: "Duplizieren",
    duplicated: "Kopie erstellt. Ändere, was abweicht.",
    materials: {
      gold: "Gold",
      silver: "Silber",
      platinum: "Platin",
      palladium: "Palladium",
      copper: "Kupfer",
      bronze: "Bronze",
      brass: "Messing",
      cupronickel: "Kupfernickel",
      nickelBrass: "Nickelmessing",
      nickel: "Nickel",
      iron: "Eisen",
      steel: "Stahl",
      aluminium: "Aluminium",
      aluminiumBronze: "Aluminiumbronze",
      zinc: "Zink",
      tin: "Zinn",
      bimetallic: "Bimetall",
      other: "Anderes",
    },
    grade: "Erhaltung",
    setGrade: "Erhaltung wählen",
    noGrade: "Keine Erhaltung",
    gradingScale: "Bewertungsskala",
    gradeNote: "Notiz zur Erhaltung",
    gradeNotePlaceholder: "z. B. leichte Patina, Randfehler",
    strike: "Prägung",
    setStrike: "Prägung wählen",
    noStrike: "Keine Prägung",
    errors: {
      number: "Gib eine Zahl ein, z. B. 38,1.",
      wholeNumber: "Gib eine ganze Zahl ein, z. B. 1200.",
      saveFailed:
        "Das Objekt konnte nicht gespeichert werden. Versuche es noch einmal.",
      duplicateFailed:
        "Das Objekt konnte nicht dupliziert werden. Versuche es noch einmal.",
      titleRequired: "Gib dem Objekt einen Titel.",
      quantity: "Verwende eine ganze Zahl ab 1.",
      year: "Gib ein Jahr wie 1881 ein.",
      amount: "Gib einen Betrag wie 75,50 ein.",
      date: "Wähle ein Datum, das nicht in der Zukunft liegt.",
      failed:
        "Das Objekt konnte nicht hinzugefügt werden. Versuche es noch einmal.",
    },
  },
  grades: {
    scales: {
      sheldon: "Sheldon (1–70)",
      norwegian: "Norwegisch (0–3)",
      european: "Europäisch (UNC–G)",
      international: "International (UNC–PR)",
      stamp: "Erhaltung (Briefmarken)",
    },
    strikes: {
      circulation: "Umlauf",
      bu: "Stempelglanz (BU)",
      proof: "Polierte Platte (PP)",
    },
    meanings: {
      mintState: "Stempelglanz",
      uncirculated: "Unzirkuliert",
      aboutUncirculated: "Fast unzirkuliert",
      extremelyFine: "Vorzüglich",
      veryFine: "Sehr schön",
      fine: "Schön",
      veryGood: "Sehr gut erhalten",
      good: "Gut erhalten",
      aboutGood: "Fast gut erhalten",
      fair: "Gering erhalten",
      poor: "Schlecht erhalten",
    },
    stamp: {
      mnh: "Postfrisch",
      mh: "Ungebraucht mit Falz",
      used: "Gestempelt",
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
      noCountry: "Kein Land",
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
      languageNotSaved:
        "Die Sprache konnte nicht in deinem Konto gespeichert werden und gilt nur auf diesem Gerät.",
    },
    email: {
      title: "E-Mail",
      current: "Du meldest dich mit {email} an.",
      newEmail: "Neue E-Mail-Adresse",
      send: "Bestätigungslink senden",
      sent: "Wir haben einen Link an {email} gesendet. Öffne ihn dort, um die Änderung abzuschließen.",
      invalid: "Gib eine E-Mail-Adresse ein, z. B. name@beispiel.de.",
      same: "Das ist bereits deine E-Mail-Adresse.",
      tooMany: "Zu viele Anfragen. Versuche es in einer Stunde noch einmal.",
      signInAgain:
        "Melde dich zu deiner Sicherheit erneut an, bevor du deine E-Mail-Adresse änderst.",
      signInAgainAction: "Erneut anmelden",
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
      signInFirst:
        "Melde dich zum Bestätigen mit dem Konto an, das diese Änderung angefordert hat.",
      signIn: "Zum Bestätigen anmelden",
      otherAccount:
        "Dieser Link gehört zu einem anderen Konto. Melde dich mit dem Konto an, das die Änderung angefordert hat.",
      switchAccount: "Mit einem anderen Konto anmelden",
      tryAgain:
        "Die Bestätigung hat gerade nicht geklappt. Versuche es noch einmal.",
    },
  },
  catalogAdmin: {
    menu: "Katalog importieren und exportieren",
    title: "Katalog importieren und exportieren",
    notAvailable: "Diese Seite ist nicht verfügbar",
    notAvailableDescription:
      "Nur Admins können den Katalog importieren und exportieren.",
    exportTitle: "Export",
    exportDescription:
      "Lade den ganzen Katalog als CSV-Datei herunter. Bearbeite sie in einer Tabellenkalkulation und importiere sie wieder.",
    exportAction: "CSV exportieren",
    exportFailed:
      "Der Katalog konnte nicht exportiert werden. Versuche es noch einmal.",
    importTitle: "Import",
    importDescription:
      "Zeilen, deren ID schon im Katalog steht, aktualisieren diesen Knoten, die übrigen werden hinzugefügt. Eine parent_id kann auf eine andere Zeile derselben Datei verweisen. Jede Gruppe von Fakten, Notizen und Bildern braucht ihre Quelle.",
    chooseFile: "CSV-Datei auswählen",
    chooseAnother: "Andere Datei auswählen",
    clearFile: "Datei entfernen",
    readFailed: "Die Datei konnte nicht gelesen werden. Wähle eine CSV-Datei.",
    checking: "Datei wird geprüft …",
    inserts: "Neu",
    updates: "Geändert",
    unchanged: "Unverändert",
    upToDate: "Der Katalog entspricht dieser Datei bereits.",
    problemsTitle: "Zu behebende Fehler",
    problemsDescription:
      "Es wird nichts importiert, bis alle Zeilen stimmen. Behebe diese Fehler und wähle die Datei erneut.",
    showingFirst: "Die ersten {shown} von {total}.",
    row: "Zeile",
    column: "Spalte",
    problem: "Fehler",
    importAction: "Importieren",
    confirmTitle: "„{file}“ importieren?",
    confirmDescription:
      "Die Änderungen gelten sofort für den Katalog, den alle durchsuchen. Zeilen, die schon stimmen, bleiben, wie sie sind.",
    cancel: "Abbrechen",
    imported:
      "Katalog aktualisiert: {inserts} hinzugefügt, {updates} geändert.",
    importBlocked:
      "Der Katalog hat sich seit der Prüfung geändert, und die Datei hat jetzt Fehler. Es wurde nichts importiert.",
    importFailed:
      "Die Datei konnte nicht importiert werden. Versuche es noch einmal.",
    errors: {
      EMPTY_FILE: "Unter der Kopfzeile stehen keine Zeilen.",
      UNCLOSED_QUOTE:
        "Ein Anführungszeichen, das in dieser Zeile beginnt, wird nie geschlossen.",
      MISSING_COLUMN: "Die Datei braucht diese Spalte.",
      UNKNOWN_COLUMN: "Das ist keine Katalogspalte. Prüfe die Schreibweise.",
      DUPLICATE_COLUMN: "Diese Spalte kommt mehr als einmal vor.",
      TOO_MANY_ROWS:
        "Die Datei ist zu groß. Teile sie in Dateien mit höchstens 3.000 Zeilen auf.",
      ID_REQUIRED: "Gib der Zeile eine ID.",
      INVALID_ID:
        "Verwende bis zu 64 Kleinbuchstaben, Ziffern, Punkte, Bindestriche und Unterstriche.",
      DUPLICATE_ID: "Eine Zeile weiter oben hat schon diese ID.",
      TITLE_REQUIRED: "Gib der Zeile einen Titel.",
      TOO_LONG: "Dieser Wert ist zu lang.",
      INVALID_VALUE: "Dieser Wert ist in dieser Spalte nicht erlaubt.",
      INVALID_COUNTRY:
        "Verwende einen zweistelligen Ländercode wie US oder NO.",
      INVALID_NUMBER:
        "Gib eine Zahl im erlaubten Bereich dieser Spalte ein, mit Punkt als Dezimaltrennzeichen.",
      INVALID_YEAR:
        "Gib ein ganzes Jahr ein, Jahre v. Chr. als negative Zahlen.",
      INVALID_URL:
        "Gib eine vollständige Webadresse ein, die mit https:// beginnt.",
      NUMISTA_DATA:
        "Daten von Numista dürfen nicht gespeichert werden. Behalte nur die Numista-Nummer, in numista_id.",
      ITEM_TYPE_REQUIRED:
        "Ein Katalogeintrag braucht eine Objektart: Münze oder Banknote.",
      FIELD_NOT_FOR_TYPE: "Banknoten haben weder Metall noch Größe.",
      YEARS_REVERSED: "Das letzte Jahr liegt vor dem ersten.",
      SOURCE_REQUIRED:
        "Nenne die Quelle dieser Fakten, Notizen oder dieses Bildes.",
      ROOT_NOT_ADDABLE:
        "Ein Land oder Thema kann kein Katalogeintrag sein. Gib der Zeile eine parent_id.",
      PARENT_NOT_FOUND:
        "Keine Zeile der Datei und kein Knoten im Katalog hat diese ID.",
      PARENT_IS_ENTRY:
        "Dieses Elternelement ist ein Katalogeintrag, darunter kann nichts stehen.",
      PARENT_CYCLE: "Die Elternelemente führen zurück zu dieser Zeile.",
      TOO_DEEP: "Der Katalog hat höchstens 8 Ebenen.",
      ENTRY_HAS_CHILDREN:
        "Unter diesem Knoten stehen weitere, deshalb kann er kein Katalogeintrag werden.",
    },
  },
} as const satisfies Dictionary;
