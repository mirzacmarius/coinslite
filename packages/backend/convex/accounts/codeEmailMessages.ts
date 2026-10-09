import type { Locale } from "@coinslite/i18n";

export type CodeEmailKind = "verify-email" | "reset-password";

type Message = {
  subject: string;
  body: (code: string) => string;
  linkLabel: string;
};

/** The one-time-code emails, in each launch language. Codes expire after 15 minutes; the link fills the code in. */
export const codeEmailMessages: Record<
  Locale,
  Record<CodeEmailKind, Message>
> = {
  en: {
    "verify-email": {
      subject: "Your CoinsLite verification code",
      body: (code) =>
        `Your CoinsLite verification code is ${code}. It expires in 15 minutes.`,
      linkLabel: "Verify my email",
    },
    "reset-password": {
      subject: "Reset your CoinsLite password",
      body: (code) =>
        `Use ${code} to reset your CoinsLite password. It expires in 15 minutes. If you didn't ask for this, you can ignore this email.`,
      linkLabel: "Choose a new password",
    },
  },
  nb: {
    "verify-email": {
      subject: "Bekreftelseskoden din for CoinsLite",
      body: (code) =>
        `Bekreftelseskoden din for CoinsLite er ${code}. Den utløper om 15 minutter.`,
      linkLabel: "Bekreft e-postadressen",
    },
    "reset-password": {
      subject: "Tilbakestill passordet ditt for CoinsLite",
      body: (code) =>
        `Bruk ${code} for å tilbakestille passordet ditt for CoinsLite. Koden utløper om 15 minutter. Hvis du ikke ba om dette, kan du se bort fra e-posten.`,
      linkLabel: "Velg et nytt passord",
    },
  },
  de: {
    "verify-email": {
      subject: "Dein Bestätigungscode für CoinsLite",
      body: (code) =>
        `Dein Bestätigungscode für CoinsLite lautet ${code}. Er läuft in 15 Minuten ab.`,
      linkLabel: "E-Mail-Adresse bestätigen",
    },
    "reset-password": {
      subject: "Setze dein CoinsLite-Passwort zurück",
      body: (code) =>
        `Mit ${code} setzt du dein CoinsLite-Passwort zurück. Der Code läuft in 15 Minuten ab. Wenn du das nicht angefordert hast, ignoriere diese E-Mail einfach.`,
      linkLabel: "Neues Passwort wählen",
    },
  },
  fr: {
    "verify-email": {
      subject: "Votre code de vérification CoinsLite",
      body: (code) =>
        `Votre code de vérification CoinsLite est ${code}. Il expire dans 15 minutes.`,
      linkLabel: "Vérifier mon adresse e-mail",
    },
    "reset-password": {
      subject: "Réinitialisez votre mot de passe CoinsLite",
      body: (code) =>
        `Utilisez ${code} pour réinitialiser votre mot de passe CoinsLite. Il expire dans 15 minutes. Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.`,
      linkLabel: "Choisir un nouveau mot de passe",
    },
  },
  ro: {
    "verify-email": {
      subject: "Codul tău de verificare CoinsLite",
      body: (code) =>
        `Codul tău de verificare CoinsLite este ${code}. Expiră în 15 minute.`,
      linkLabel: "Confirmă adresa de e-mail",
    },
    "reset-password": {
      subject: "Resetează-ți parola CoinsLite",
      body: (code) =>
        `Folosește ${code} pentru a-ți reseta parola CoinsLite. Codul expiră în 15 minute. Dacă nu ai cerut asta, ignoră acest e-mail.`,
      linkLabel: "Alege o parolă nouă",
    },
  },
};
