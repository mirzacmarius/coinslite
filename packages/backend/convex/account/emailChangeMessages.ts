import type { Locale } from "@coinslite/i18n";

type Message = { subject: string; body: (email: string) => string };

/** The email-change emails, in each launch language. The confirmation link expires after 60 minutes. */
export const emailChangeMessages: Record<
  Locale,
  { confirm: Message & { linkLabel: string }; notice: Message }
> = {
  en: {
    confirm: {
      subject: "Confirm your new CoinsLite email",
      body: (email) =>
        `Open the link below to sign in to CoinsLite with ${email} from now on. It expires in 60 minutes. If you didn't ask for this, you can ignore this email.`,
      linkLabel: "Confirm my new email",
    },
    notice: {
      subject: "Your CoinsLite email was changed",
      body: (email) =>
        `Your CoinsLite account now signs in with ${email}. If you didn't make this change, please let us know straight away.`,
    },
  },
  nb: {
    confirm: {
      subject: "Bekreft den nye e-postadressen din for CoinsLite",
      body: (email) =>
        `Åpne lenken nedenfor for å logge inn på CoinsLite med ${email} fra nå av. Den utløper om 60 minutter. Hvis du ikke ba om dette, kan du se bort fra e-posten.`,
      linkLabel: "Bekreft den nye e-postadressen",
    },
    notice: {
      subject: "E-postadressen din for CoinsLite er endret",
      body: (email) =>
        `CoinsLite-kontoen din bruker nå ${email} for innlogging. Hvis det ikke var du som gjorde endringen, gi oss beskjed med en gang.`,
    },
  },
  de: {
    confirm: {
      subject: "Bestätige deine neue E-Mail-Adresse für CoinsLite",
      body: (email) =>
        `Öffne den Link unten, um dich ab jetzt mit ${email} bei CoinsLite anzumelden. Er läuft in 60 Minuten ab. Wenn du das nicht angefordert hast, ignoriere diese E-Mail einfach.`,
      linkLabel: "Neue E-Mail-Adresse bestätigen",
    },
    notice: {
      subject: "Deine E-Mail-Adresse für CoinsLite wurde geändert",
      body: (email) =>
        `Dein CoinsLite-Konto verwendet zur Anmeldung jetzt ${email}. Wenn du das nicht warst, gib uns bitte sofort Bescheid.`,
    },
  },
  fr: {
    confirm: {
      subject: "Confirmez votre nouvelle adresse e-mail CoinsLite",
      body: (email) =>
        `Ouvrez le lien ci-dessous pour vous connecter désormais à CoinsLite avec ${email}. Il expire dans 60 minutes. Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.`,
      linkLabel: "Confirmer ma nouvelle adresse",
    },
    notice: {
      subject: "Votre adresse e-mail CoinsLite a été modifiée",
      body: (email) =>
        `Votre compte CoinsLite utilise désormais ${email} pour la connexion. Si vous n’êtes pas à l’origine de ce changement, prévenez-nous immédiatement.`,
    },
  },
  ro: {
    confirm: {
      subject: "Confirmă noua adresă de e-mail CoinsLite",
      body: (email) =>
        `Deschide linkul de mai jos ca să te conectezi la CoinsLite cu ${email} de acum înainte. Expiră în 60 de minute. Dacă nu ai cerut asta, ignoră acest e-mail.`,
      linkLabel: "Confirmă noua adresă",
    },
    notice: {
      subject: "Adresa ta de e-mail CoinsLite a fost schimbată",
      body: (email) =>
        `Contul tău CoinsLite folosește acum ${email} pentru conectare. Dacă nu ai făcut tu această schimbare, anunță-ne imediat.`,
    },
  },
};
