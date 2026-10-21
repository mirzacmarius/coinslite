import type { Locale } from "@coinslite/i18n";

/** One email: its subject, its text and its link's label. */
export type ClosingMessage = {
  subject: string;
  body: (date: string) => string;
  linkLabel: string;
};

/**
 * The emails about closing an account (account/closing.ts), in each launch
 * language. `date` is the day the account is deleted, written out in the
 * person's language.
 */
export const closingMessages: Record<
  Locale,
  {
    /** On asking to delete the account: it's deactivated now. */
    deactivated: ClosingMessage;
    /** 14 days later: delete it now, or reactivate it. */
    lastNotice: ClosingMessage;
  }
> = {
  en: {
    deactivated: {
      subject: "Your CoinsLite account is deactivated",
      body: (date) =>
        `You asked to delete your CoinsLite account, so it's deactivated. In 14 days we'll email you once more, and on ${date} the account and everything in it is deleted for good. Changed your mind? Sign in and reactivate it any time before then.`,
      linkLabel: "Open CoinsLite",
    },
    lastNotice: {
      subject: "Delete your CoinsLite account, or keep it?",
      body: (date) =>
        `Your CoinsLite account has been deactivated for 14 days. Sign in to delete it now, or to reactivate it and choose a plan again. If you do neither, it stays deactivated and is deleted on ${date} without further warning.`,
      linkLabel: "Delete or reactivate",
    },
  },
  nb: {
    deactivated: {
      subject: "CoinsLite-kontoen din er deaktivert",
      body: (date) =>
        `Du ba om å slette CoinsLite-kontoen din, så den er deaktivert. Om 14 dager sender vi deg en e-post til, og ${date} slettes kontoen og alt i den for godt. Har du ombestemt deg? Logg inn og aktiver den igjen når som helst før det.`,
      linkLabel: "Åpne CoinsLite",
    },
    lastNotice: {
      subject: "Slette CoinsLite-kontoen din, eller beholde den?",
      body: (date) =>
        `CoinsLite-kontoen din har vært deaktivert i 14 dager. Logg inn for å slette den nå, eller for å aktivere den igjen og velge et abonnement på nytt. Gjør du ingen av delene, forblir den deaktivert og slettes ${date} uten flere varsler.`,
      linkLabel: "Slett eller aktiver igjen",
    },
  },
  de: {
    deactivated: {
      subject: "Dein CoinsLite-Konto ist deaktiviert",
      body: (date) =>
        `Du hast darum gebeten, dein CoinsLite-Konto zu löschen, daher ist es deaktiviert. In 14 Tagen schreiben wir dir noch einmal, und am ${date} werden das Konto und alles darin endgültig gelöscht. Hast du es dir anders überlegt? Melde dich an und reaktiviere es jederzeit vorher.`,
      linkLabel: "CoinsLite öffnen",
    },
    lastNotice: {
      subject: "Dein CoinsLite-Konto löschen oder behalten?",
      body: (date) =>
        `Dein CoinsLite-Konto ist seit 14 Tagen deaktiviert. Melde dich an, um es jetzt zu löschen oder um es zu reaktivieren und wieder einen Tarif zu wählen. Wenn du nichts davon tust, bleibt es deaktiviert und wird am ${date} ohne weitere Warnung gelöscht.`,
      linkLabel: "Löschen oder reaktivieren",
    },
  },
  fr: {
    deactivated: {
      subject: "Votre compte CoinsLite est désactivé",
      body: (date) =>
        `Vous avez demandé la suppression de votre compte CoinsLite, il est donc désactivé. Dans 14 jours, nous vous écrirons une dernière fois, et le ${date} le compte et tout son contenu seront supprimés définitivement. Vous avez changé d’avis ? Connectez-vous et réactivez-le à tout moment d’ici là.`,
      linkLabel: "Ouvrir CoinsLite",
    },
    lastNotice: {
      subject: "Supprimer votre compte CoinsLite, ou le garder ?",
      body: (date) =>
        `Votre compte CoinsLite est désactivé depuis 14 jours. Connectez-vous pour le supprimer maintenant, ou pour le réactiver et choisir à nouveau une offre. Sans action de votre part, il reste désactivé et sera supprimé le ${date} sans autre avertissement.`,
      linkLabel: "Supprimer ou réactiver",
    },
  },
  ro: {
    deactivated: {
      subject: "Contul tău CoinsLite este dezactivat",
      body: (date) =>
        `Ai cerut ștergerea contului tău CoinsLite, așa că este dezactivat. Peste 14 zile îți mai scriem o dată, iar pe ${date} contul și tot ce conține vor fi șterse definitiv. Te-ai răzgândit? Conectează-te și reactivează-l oricând până atunci.`,
      linkLabel: "Deschide CoinsLite",
    },
    lastNotice: {
      subject: "Ștergi contul CoinsLite sau îl păstrezi?",
      body: (date) =>
        `Contul tău CoinsLite este dezactivat de 14 zile. Conectează-te ca să-l ștergi acum sau ca să-l reactivezi și să alegi din nou un abonament. Dacă nu faci nimic, rămâne dezactivat și va fi șters pe ${date}, fără alte avertismente.`,
      linkLabel: "Șterge sau reactivează",
    },
  },
};
