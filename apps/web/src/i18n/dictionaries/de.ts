import type { Dictionary } from "../dictionary";

export default {
  meta: {
    title:
      "CoinsLite: der klare Überblick über deine Münzen, Banknoten und Briefmarken",
    description:
      "Erfasse die Münzen, Banknoten und Briefmarken, die du besitzt, halte Erhaltung und Fotos fest und sieh, was deine Sammlung in deiner eigenen Währung wert ist. Gratis für bis zu {limit} Objekte.",
    imageAlt: "CoinsLite, für Sammler von Münzen, Banknoten und Briefmarken",
  },
  header: {
    home: "Startseite von CoinsLite",
    signIn: "Anmelden",
    createAccount: "Konto erstellen",
    language: "Sprache",
    features: "Funktionen",
    plans: "Tarife",
  },
  hero: {
    eyebrow: "Für Sammler von Münzen, Banknoten und Briefmarken",
    title: "Deine Sammlung, sauber erfasst und in deiner Währung bewertet",
    lead: "CoinsLite hält klar fest, was du besitzt: was jedes Objekt ist, seine Erhaltung, was du bezahlt hast und was es heute wert ist. Wähle Objekte mit wenigen Klicks aus dem Katalog oder trage sie selbst ein.",
    primary: "Kostenloses Konto erstellen",
    secondary: "Anmelden",
    note: "Gratis für bis zu {limit} Objekte. Keine Kreditkarte nötig.",
  },
  preview: {
    label: "Eine Beispielsammlung",
    title: "Sammlung",
    items: "{count} Objekte",
    marketValue: "Marktwert",
    gainLoss: "Gewinn/Verlust",
    types: { coin: "Münze", banknote: "Banknote", stamp: "Briefmarke" },
  },
  features: {
    title: "Was CoinsLite kann",
    lead: "Alles hier ist heute schon in der App, in jeder Sprache.",
    catalog: {
      title: "Aus dem Katalog oder von Hand",
      text: "Wähle einen Katalogeintrag, und seine Angaben werden übernommen: Land, Jahre, Nominal, Serie und Metall. Oder trage ein Objekt selbst ein; Briefmarken werden immer von Hand erfasst.",
    },
    grades: {
      title: "Erhaltung, getrennt von der Prägung",
      text: "Bewerte jedes Objekt auf der passenden Skala: Sheldon 1–70, die norwegische Skala 0–3, europäische und internationale Erhaltungsgrade oder Briefmarkengrade. Die Prägung (Umlauf, Stempelglanz oder Polierte Platte) wird eigens erfasst.",
    },
    albums: {
      title: "Alben",
      text: "Fasse Objekte in Alben zusammen, etwa eine Serie, die du verfolgst, oder eine Reise. Jedes Objekt liegt in höchstens einem Album.",
    },
    photos: {
      title: "Fotos beider Seiten",
      text: "Füge ein Foto der Vorder- und der Rückseite hinzu. Fotos werden privat gespeichert, und nur du kannst sie sehen.",
    },
    totals: {
      title: "Summen in deiner Heimatwährung",
      text: "Kaufpreis, Marktwert und Gewinn/Verlust über deine ganze Sammlung, alles in der einen Währung, die du wählst.",
    },
    spot: {
      title: "Aktuelle Spotpreise",
      text: "Die Spotpreise für Gold und Silber werden alle 15 Minuten aktualisiert, damit der Metallwert deiner Münzen aktuell bleibt.",
    },
    sets: {
      title: "Sets und Vollständigkeit",
      text: "Sieh eine Katalogserie als Set: wie viel davon du hast und welche Einträge dir noch fehlen.",
    },
    insurance: {
      title: "Versicherungsbericht",
      text: "Ein PDF für deine Versicherung mit den Objekten deiner Wahl, ihren Werten und deinen Kontaktdaten. Premium.",
    },
    exports: {
      title: "PDF- und CSV-Export",
      text: "Deine Sammlung oder ein gefilterter Teil davon als PDF zum Drucken oder als CSV für eine Tabellenkalkulation. Premium.",
    },
    languages: {
      title: "Fünf Sprachen",
      text: "Englisch, Norwegisch (Bokmål), Deutsch, Französisch und Rumänisch, mit Zahlen und Daten so geschrieben, wie deine Sprache sie schreibt.",
    },
    noAds: {
      title: "Keine Werbung",
      text: "Keine Werbung in keinem Tarif, und keine Analyse- oder Tracking-Skripte.",
    },
  },
  plans: {
    title: "Tarife",
    lead: "Starte gratis. Steig um, wenn deine Sammlung darüber hinauswächst.",
    free: {
      name: "Gratis-Tarif",
      price: "Gratis",
      summary: "Bis zu {limit} Objekte, unabhängig von ihrer Anzahl.",
      features: [
        "Der Katalog, Alben und Fotos",
        "Erhaltung, Prägung und Sets",
        "Summen und aktuelle Spotpreise",
      ],
      cta: "Kostenloses Konto erstellen",
    },
    premium: {
      name: "Premium",
      monthly: "{price} im Monat",
      yearly: "oder {price} im Jahr",
      summary: "Unbegrenzt viele Objekte, dazu die Berichte.",
      features: [
        "Unbegrenzt viele Objekte",
        "Der Versicherungsbericht",
        "PDF- und CSV-Export",
        "Alles aus dem Gratis-Tarif",
      ],
      cta: "Mit einem kostenlosen Konto starten",
    },
    pricesTitle: "Preise für Premium",
    currency: "Währung",
    month: "Monatlich",
    year: "Jährlich",
    pricesNote:
      "Du zahlst in deiner Landeswährung, wenn Premium einen Preis darin hat, sonst in Euro. Die Zahlung wickelt Polar ab.",
    cancelNote:
      "Kündige, wann du willst: Premium läuft bis zum Ende des bezahlten Zeitraums. Zurück im Gratis-Tarif bleiben alle Objekte erhalten und bearbeitbar; du kannst nur keine weiteren hinzufügen, solange du mehr als {limit} hast.",
  },
  closing: {
    title: "Beginne heute mit deiner Sammlung",
    text: "Ein Konto ist in einer Minute erstellt, und deine ersten {limit} Objekte sind gratis.",
  },
  footer: {
    privacy: "Datenschutzerklärung",
    terms: "Nutzungsbedingungen",
  },
  notFound: {
    title: "Seite nicht gefunden",
    description:
      "Unter dieser Adresse gibt es nichts. Vielleicht wurde die Seite verschoben, oder der Link ist falsch.",
    home: "Zur Startseite",
  },
  legal: {
    updated: "Zuletzt aktualisiert am {date}",
    draft:
      "Entwurf: Einige Angaben werden vor dem Start von CoinsLite noch ergänzt. Sie sind im Text markiert.",
    governs:
      "Dies ist eine Übersetzung. Weicht sie von der {english} ab, gilt die englische Fassung.",
    englishVersion: "englischen Fassung",
    contents: "Inhalt",
    placeholders: {
      operator: "Name des Betreibers",
      address: "Anschrift des Betreibers",
      email: "Kontakt-E-Mail",
      law: "anwendbares Recht",
      authority: "Aufsichtsbehörde",
      days: "Anzahl",
    },
  },
} satisfies Dictionary;
