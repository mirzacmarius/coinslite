import type { Dictionary } from "../dictionary";

export default {
  meta: {
    title: "CoinsLite: full oversikt over myntene, sedlene og frimerkene dine",
    description:
      "Registrer myntene, sedlene og frimerkene du eier, ta vare på kvalitet og bilder, og se hva samlingen din er verdt i din egen valuta. Gratis for opptil {limit} objekter.",
    imageAlt: "CoinsLite, for samlere av mynter, sedler og frimerker",
  },
  header: {
    home: "CoinsLites forside",
    signIn: "Logg inn",
    createAccount: "Opprett konto",
    language: "Språk",
    features: "Funksjoner",
    plans: "Abonnement",
  },
  hero: {
    eyebrow: "For samlere av mynter, sedler og frimerker",
    titleLead: "Samlingen din,",
    titleRest: "ordentlig registrert og verdsatt i din valuta",
    lead: "CoinsLite gir deg full oversikt over det du eier: hva hvert objekt er, kvaliteten, hva du betalte og hva det er verdt i dag. Velg objekter fra katalogen med noen få klikk, eller legg dem inn selv.",
    primary: "Opprett en gratis konto",
    secondary: "Logg inn",
    note: "Gratis for opptil {limit} objekter. Du trenger ikke betalingskort.",
  },
  preview: {
    label: "Et eksempel på en samling",
    title: "Samling",
    items: "{count} objekter",
    marketValue: "Markedsverdi",
    gainLoss: "Gevinst/tap",
    types: { coin: "Mynt", banknote: "Seddel", stamp: "Frimerke" },
  },
  features: {
    title: "Dette gjør CoinsLite",
    lead: "Alt nedenfor finnes i appen i dag, på alle språk.",
    catalog: {
      title: "Fra katalogen eller for hånd",
      text: "Velg en katalogoppføring, så fylles fakta inn: land, årstall, valør, serie og metall. Eller legg inn objektet selv; frimerker legges alltid inn for hånd.",
    },
    grades: {
      title: "Kvalitet, med preging for seg",
      text: "Angi kvaliteten på skalaen som passer objektet: Sheldon 1–70, den norske 0–3-skalaen, europeiske og internasjonale kvaliteter eller frimerkekvaliteter. Preging (omløp, BU eller proof) registreres for seg.",
    },
    albums: {
      title: "Album",
      text: "Samle objekter i album, for eksempel en serie du følger eller en reise. Hvert objekt ligger i høyst ett album.",
    },
    photos: {
      title: "Bilder av begge sider",
      text: "Legg til et bilde av forsiden og baksiden. Bildene lagres privat, og bare du kan se dem.",
    },
    totals: {
      title: "Summer i hjemmevalutaen din",
      text: "Innkjøpspris, markedsverdi og gevinst/tap for hele samlingen, alt i den ene valutaen du velger.",
    },
    spot: {
      title: "Spotpriser på gull og sølv",
      text: "Spotprisene oppdateres jevnlig, med tidspunktet for hver oppdatering, og metallverdien av myntene dine følger dem.",
    },
    sets: {
      title: "Sett og fullføring",
      text: "Se en serie i katalogen som et sett: hvor mye av den du har, og hvilke oppføringer du fortsatt mangler.",
    },
    insurance: {
      title: "Forsikringsrapport",
      text: "En PDF til forsikringsselskapet med objektene du velger, verdiene deres og kontaktopplysningene dine. Premium.",
    },
    exports: {
      title: "Eksport til PDF og CSV",
      text: "Samlingen din, eller en filtrert del av den, som PDF for utskrift eller CSV for et regneark. Premium.",
    },
    languages: {
      title: "Fem språk",
      text: "Engelsk, norsk bokmål, tysk, fransk og rumensk, med tall og datoer skrevet slik språket ditt skriver dem.",
    },
    noAds: {
      title: "Ingen reklame",
      text: "Ingen reklame i noe abonnement, og ingen analyse- eller sporingsskript.",
    },
  },
  plans: {
    title: "Abonnement",
    lead: "Begynn gratis. Oppgrader når samlingen vokser fra det.",
    free: {
      name: "Gratisplan",
      price: "Gratis",
      summary: "Opptil {limit} objekter, uansett antall.",
      features: [
        "Katalogen, album og bilder",
        "Kvalitet, preging og sett",
        "Summer og spotpriser",
      ],
      cta: "Opprett en gratis konto",
    },
    premium: {
      name: "Premium",
      monthly: "{price} i måneden",
      yearly: "eller {price} i året",
      summary: "Ubegrenset antall objekter, pluss rapportene.",
      features: [
        "Ubegrenset antall objekter",
        "Forsikringsrapporten",
        "Eksport til PDF og CSV",
        "Alt i gratisplanen",
      ],
      cta: "Begynn med en gratis konto",
    },
    pricesTitle: "Priser for Premium",
    currency: "Valuta",
    month: "Månedlig",
    year: "Årlig",
    pricesNote:
      "Du betaler i din lokale valuta når Premium har en pris i den, ellers i euro. Betalingen håndteres av Polar.",
    cancelNote:
      "Si opp når du vil: Premium varer til slutten av perioden du har betalt for. Tilbake på gratisplanen beholder du alle objektene og kan fortsatt redigere dem; du kan bare ikke legge til flere så lenge du har over {limit}.",
  },
  closing: {
    title: "Begynn på samlingen din i dag",
    text: "Det tar et minutt å opprette en konto, og de første {limit} objektene er gratis.",
  },
  footer: {
    product: "Produkt",
    account: "Konto",
    legal: "Juridisk",
    privacy: "Personvernerklæring",
    terms: "Vilkår for bruk",
  },
  notFound: {
    title: "Fant ikke siden",
    description:
      "Det finnes ingenting på denne adressen. Den kan ha blitt flyttet, eller lenken kan være feil.",
    home: "Gå til forsiden",
  },
  legal: {
    updated: "Sist oppdatert {date}",
    draft:
      "Utkast: noen opplysninger skal fylles inn før CoinsLite lanseres. De er markert i teksten.",
    governs:
      "Dette er en oversettelse. Hvis den avviker fra den {english}, gjelder den engelske versjonen.",
    englishVersion: "engelske versjonen",
    contents: "Innhold",
    placeholders: {
      operator: "operatørens juridiske navn",
      address: "operatørens adresse",
      email: "e-post for kontakt",
      law: "gjeldende lov",
      authority: "tilsynsmyndighet",
      days: "antall",
    },
  },
} satisfies Dictionary;
