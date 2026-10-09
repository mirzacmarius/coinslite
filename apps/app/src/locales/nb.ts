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
  auth: {
    signIn: {
      pageTitle: "Logg inn",
      title: "Logg inn på samlingen din",
      submit: "Logg inn",
      forgotPassword: "Glemt passordet?",
      noAccount: "Ny i CoinsLite?",
      createAccount: "Opprett en konto",
      failed:
        "E-postadressen og passordet stemmer ikke. Sjekk dem, eller tilbakestill passordet.",
      verifyToContinue: "Bekreft e-postadressen for å fullføre innloggingen.",
    },
    signUp: {
      pageTitle: "Opprett konto",
      title: "Opprett kontoen din",
      description: "Registrer myntene, sedlene og frimerkene du eier.",
      submit: "Opprett konto",
      homeCurrencyHint: "Verdiene i samlingen vises i denne valutaen.",
      acceptTerms: "Jeg godtar {privacy} og {terms}",
      privacyPolicy: "personvernerklæringen",
      termsOfUse: "vilkårene for bruk",
      termsRequired:
        "Godta personvernerklæringen og vilkårene for bruk for å fortsette.",
      haveAccount: "Har du allerede en konto?",
      failed:
        "Vi kunne ikke opprette kontoen. Har du allerede en, kan du logge inn eller tilbakestille passordet.",
    },
    fields: {
      email: "E-post",
      password: "Passord",
      newPassword: "Nytt passord",
      homeCurrency: "Hjemmevaluta",
      passwordHint: "Minst 8 tegn.",
      code: "Kode",
      emailInvalid:
        "Skriv inn en e-postadresse, for eksempel navn@eksempel.no.",
      passwordTooShort: "Bruk minst 8 tegn.",
      passwordRequired: "Skriv inn passordet ditt.",
      codeInvalid: "Skriv inn de 8 sifrene fra e-posten.",
    },
    code: {
      title: "Sjekk e-posten din",
      description:
        "Vi har sendt en kode på 8 sifre til {email}. Den utløper om 15 minutter.",
      submit: "Bekreft e-post",
      resend: "Send en ny kode",
      resent: "Vi har sendt en ny kode til {email}.",
      differentEmail: "Bruk en annen e-postadresse",
      failed: "Koden fungerte ikke. Sjekk den, eller send en ny.",
    },
    verify: {
      pageTitle: "Bekreft e-post",
      title: "Bekrefter e-postadressen din",
      working: "Et øyeblikk …",
      failed:
        "Lenken er utløpt eller allerede brukt. Logg inn for å få en ny kode.",
      noLink:
        "Åpne lenken i bekreftelses-e-posten, eller logg inn for å få en ny kode.",
    },
    reset: {
      pageTitle: "Tilbakestill passord",
      title: "Tilbakestill passordet",
      description:
        "Vi sender deg en kode på e-post, så du kan velge et nytt passord.",
      sendCode: "Send kode",
      codeSent:
        "Hvis {email} har en CoinsLite-konto, har vi sendt en kode dit. Den utløper om 15 minutter.",
      newPasswordTitle: "Velg et nytt passord",
      submit: "Lagre passordet",
      failed: "Koden fungerte ikke eller er utløpt. Be om en ny.",
    },
    backToSignIn: "Tilbake til innlogging",
    noMatches: "Ingen treff",
    failedGeneric: "Noe gikk galt. Prøv igjen.",
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
