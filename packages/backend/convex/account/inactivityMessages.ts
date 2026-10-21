import type { Locale } from "@coinslite/i18n";
import type { ClosingMessage } from "./closingMessages";

/**
 * The emails to a Free plan's account nobody signs in to (account/inactivity.ts),
 * after 6, 8 and 12 months, in each launch language. The 12-month one's `date`
 * is the day the account is deleted.
 */
export const inactivityMessages: Record<
  Locale,
  Record<6 | 8 | 12, ClosingMessage>
> = {
  en: {
    6: {
      subject: "We miss you at CoinsLite",
      body: () =>
        "You haven't signed in to your free CoinsLite account for 6 months. Your Collection is still there whenever you want it.",
      linkLabel: "Open CoinsLite",
    },
    8: {
      subject: "Your CoinsLite account hasn't been used for 8 months",
      body: () =>
        "You haven't signed in to your free CoinsLite account for 8 months. Free accounts that aren't used for 12 months are deleted. Sign in to keep yours.",
      linkLabel: "Keep my account",
    },
    12: {
      subject: "Your CoinsLite account will be deleted",
      body: (date) =>
        `You haven't signed in to your free CoinsLite account for 12 months, so it will be deleted on ${date}, with everything in it. Sign in before then to keep it.`,
      linkLabel: "Keep my account",
    },
  },
  nb: {
    6: {
      subject: "Vi savner deg på CoinsLite",
      body: () =>
        "Du har ikke logget inn på den gratis CoinsLite-kontoen din på 6 måneder. Samlingen din ligger der når du vil.",
      linkLabel: "Åpne CoinsLite",
    },
    8: {
      subject: "CoinsLite-kontoen din har ikke vært brukt på 8 måneder",
      body: () =>
        "Du har ikke logget inn på den gratis CoinsLite-kontoen din på 8 måneder. Gratiskontoer som ikke brukes på 12 måneder, slettes. Logg inn for å beholde din.",
      linkLabel: "Behold kontoen min",
    },
    12: {
      subject: "CoinsLite-kontoen din blir slettet",
      body: (date) =>
        `Du har ikke logget inn på den gratis CoinsLite-kontoen din på 12 måneder, så den slettes ${date}, med alt i den. Logg inn før det for å beholde den.`,
      linkLabel: "Behold kontoen min",
    },
  },
  de: {
    6: {
      subject: "Wir vermissen dich bei CoinsLite",
      body: () =>
        "Du hast dich seit 6 Monaten nicht bei deinem kostenlosen CoinsLite-Konto angemeldet. Deine Sammlung ist weiterhin für dich da.",
      linkLabel: "CoinsLite öffnen",
    },
    8: {
      subject: "Dein CoinsLite-Konto wurde seit 8 Monaten nicht genutzt",
      body: () =>
        "Du hast dich seit 8 Monaten nicht bei deinem kostenlosen CoinsLite-Konto angemeldet. Kostenlose Konten, die 12 Monate nicht genutzt werden, werden gelöscht. Melde dich an, um deines zu behalten.",
      linkLabel: "Mein Konto behalten",
    },
    12: {
      subject: "Dein CoinsLite-Konto wird gelöscht",
      body: (date) =>
        `Du hast dich seit 12 Monaten nicht bei deinem kostenlosen CoinsLite-Konto angemeldet, daher wird es am ${date} mit allem darin gelöscht. Melde dich vorher an, um es zu behalten.`,
      linkLabel: "Mein Konto behalten",
    },
  },
  fr: {
    6: {
      subject: "CoinsLite vous attend",
      body: () =>
        "Vous ne vous êtes pas connecté à votre compte CoinsLite gratuit depuis 6 mois. Votre collection vous attend toujours.",
      linkLabel: "Ouvrir CoinsLite",
    },
    8: {
      subject: "Votre compte CoinsLite n’a pas servi depuis 8 mois",
      body: () =>
        "Vous ne vous êtes pas connecté à votre compte CoinsLite gratuit depuis 8 mois. Les comptes gratuits inutilisés pendant 12 mois sont supprimés. Connectez-vous pour garder le vôtre.",
      linkLabel: "Garder mon compte",
    },
    12: {
      subject: "Votre compte CoinsLite va être supprimé",
      body: (date) =>
        `Vous ne vous êtes pas connecté à votre compte CoinsLite gratuit depuis 12 mois : il sera donc supprimé le ${date}, avec tout son contenu. Connectez-vous d’ici là pour le garder.`,
      linkLabel: "Garder mon compte",
    },
  },
  ro: {
    6: {
      subject: "Ne lipsești pe CoinsLite",
      body: () =>
        "Nu te-ai mai conectat la contul tău gratuit CoinsLite de 6 luni. Colecția ta te așteaptă oricând.",
      linkLabel: "Deschide CoinsLite",
    },
    8: {
      subject: "Contul tău CoinsLite nu a mai fost folosit de 8 luni",
      body: () =>
        "Nu te-ai mai conectat la contul tău gratuit CoinsLite de 8 luni. Conturile gratuite nefolosite timp de 12 luni sunt șterse. Conectează-te ca să-l păstrezi pe al tău.",
      linkLabel: "Păstrează-mi contul",
    },
    12: {
      subject: "Contul tău CoinsLite va fi șters",
      body: (date) =>
        `Nu te-ai mai conectat la contul tău gratuit CoinsLite de 12 luni, așa că va fi șters pe ${date}, cu tot ce conține. Conectează-te înainte ca să-l păstrezi.`,
      linkLabel: "Păstrează-mi contul",
    },
  },
};
