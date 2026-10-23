import type { Locale } from "@coinslite/i18n";
import type { CollectionSort } from "./view";

/**
 * The Collection PDF's own text, in each launch language. Column headings and
 * the names of Item types and stamp Grades come from exportLabels.ts, shared
 * with the CSV; the filter and sort names follow the Collection page's. Pure.
 */
export type CollectionPdfMessages = {
  title: string;
  /** The downloaded file's name, before the date: ASCII, lower case. */
  fileName: string;
  generated: (time: string) => string;
  /** The heading over the scope, sort and currency. */
  view: string;
  scope: string;
  wholeCollection: string;
  /** One of the view's filters, as "Item type: Coin". */
  filter: (name: string, value: string) => string;
  /** Searched words, quoted. */
  quote: (words: string) => string;
  search: string;
  origin: string;
  album: string;
  bullionCoins: string;
  origins: { own: (country: string) => string; foreign: string };
  withoutAlbum: string;
  unknownAlbum: string;
  /** The Kept in filter's option for Items with no place recorded. */
  withoutStorage: string;
  /** A year range with one end open, as "from 1800" or "to 1899". */
  yearRange: { from: (year: string) => string; to: (year: string) => string };
  sortedBy: string;
  sorts: Record<CollectionSort, string>;
  currency: string;
  owner: string;
  name: string;
  email: string;
  totals: string;
  items: string;
  pieces: string;
  gainLoss: string;
  total: string;
  page: (page: number, pages: number) => string;
  aboutValues: string;
  notes: {
    perItem: (currency: string) => string;
    gainLoss: string;
    ownerStated: string;
  };
};

export const collectionPdfMessages: Record<Locale, CollectionPdfMessages> = {
  en: {
    title: "Collection",
    fileName: "coinslite-collection",
    generated: (time) => `Generated ${time}`,
    view: "View",
    scope: "Scope",
    wholeCollection: "Whole Collection",
    filter: (name, value) => `${name}: ${value}`,
    quote: (words) => `“${words}”`,
    search: "Search",
    origin: "Origin",
    album: "Album",
    bullionCoins: "Bullion coins",
    origins: {
      own: (country) => `Domestic (${country})`,
      foreign: "Foreign",
    },
    withoutAlbum: "Without an Album",
    unknownAlbum: "Unknown Album",
    withoutStorage: "No place recorded",
    yearRange: { from: (year) => `from ${year}`, to: (year) => `to ${year}` },
    sortedBy: "Sorted by",
    sorts: {
      year: "Year, oldest first",
      newest: "Newest added",
      oldest: "Oldest added",
      price: "Highest Purchase price",
      value: "Highest Market value",
      gain: "Biggest gain first",
      denomination: "Denomination",
      grade: "Grade, best first",
      title: "Title, A to Z",
    },
    currency: "Currency",
    owner: "Owner",
    name: "Name",
    email: "Email",
    totals: "Totals",
    items: "Items",
    pieces: "Pieces",
    gainLoss: "Gain/loss",
    total: "Total",
    page: (page, pages) => `Page ${page} of ${pages}`,
    aboutValues: "About these values",
    notes: {
      perItem: (currency) =>
        `Amounts are in ${currency} and cover all of an Item's pieces: the amount per piece × Quantity.`,
      gainLoss:
        "Gain/loss is Market value minus Purchase price, for Items that have both.",
      ownerStated:
        "Purchase prices and Market values are stated by the owner, not appraised.",
    },
  },
  nb: {
    title: "Samling",
    fileName: "coinslite-samling",
    generated: (time) => `Laget ${time}`,
    view: "Visning",
    scope: "Omfang",
    wholeCollection: "Hele samlingen",
    filter: (name, value) => `${name}: ${value}`,
    quote: (words) => `«${words}»`,
    search: "Søk",
    origin: "Opprinnelse",
    album: "Album",
    bullionCoins: "Investeringsmynter",
    origins: {
      own: (country) => `Innenlandske (${country})`,
      foreign: "Utenlandske",
    },
    withoutAlbum: "Uten album",
    unknownAlbum: "Ukjent album",
    withoutStorage: "Uten oppbevaringssted",
    yearRange: { from: (year) => `fra ${year}`, to: (year) => `til ${year}` },
    sortedBy: "Sortert etter",
    sorts: {
      year: "År, eldste først",
      newest: "Sist lagt til",
      oldest: "Først lagt til",
      price: "Høyeste innkjøpspris",
      value: "Høyeste markedsverdi",
      gain: "Størst gevinst først",
      denomination: "Pålydende",
      grade: "Kvalitet, beste først",
      title: "Tittel, A til Å",
    },
    currency: "Valuta",
    owner: "Eier",
    name: "Navn",
    email: "E-post",
    totals: "Summer",
    items: "Objekter",
    pieces: "Stykker",
    gainLoss: "Gevinst/tap",
    total: "Totalt",
    page: (page, pages) => `Side ${page} av ${pages}`,
    aboutValues: "Om verdiene",
    notes: {
      perItem: (currency) =>
        `Beløpene er i ${currency} og gjelder alle stykkene i et objekt: beløpet per stykk × antall.`,
      gainLoss:
        "Gevinst/tap er markedsverdi minus innkjøpspris, for objekter som har begge.",
      ownerStated:
        "Innkjøpspriser og markedsverdier er oppgitt av eieren, ikke taksert.",
    },
  },
  de: {
    title: "Sammlung",
    fileName: "coinslite-sammlung",
    generated: (time) => `Erstellt am ${time}`,
    view: "Ansicht",
    scope: "Umfang",
    wholeCollection: "Gesamte Sammlung",
    filter: (name, value) => `${name}: ${value}`,
    quote: (words) => `„${words}“`,
    search: "Suche",
    origin: "Herkunft",
    album: "Album",
    bullionCoins: "Anlagemünzen",
    origins: {
      own: (country) => `Inländisch (${country})`,
      foreign: "Ausländisch",
    },
    withoutAlbum: "Ohne Album",
    unknownAlbum: "Unbekanntes Album",
    withoutStorage: "Ohne Aufbewahrungsort",
    yearRange: { from: (year) => `ab ${year}`, to: (year) => `bis ${year}` },
    sortedBy: "Sortiert nach",
    sorts: {
      year: "Jahr, älteste zuerst",
      newest: "Zuletzt hinzugefügt",
      oldest: "Zuerst hinzugefügt",
      price: "Höchster Kaufpreis",
      value: "Höchster Marktwert",
      gain: "Größter Gewinn zuerst",
      denomination: "Nennwert",
      grade: "Erhaltung, beste zuerst",
      title: "Titel, A bis Z",
    },
    currency: "Währung",
    owner: "Eigentümer",
    name: "Name",
    email: "E-Mail",
    totals: "Summen",
    items: "Objekte",
    pieces: "Stück",
    gainLoss: "Gewinn/Verlust",
    total: "Summe",
    page: (page, pages) => `Seite ${page} von ${pages}`,
    aboutValues: "Zu diesen Werten",
    notes: {
      perItem: (currency) =>
        `Beträge in ${currency}; sie gelten für alle Stücke eines Objekts: Betrag pro Stück × Anzahl.`,
      gainLoss:
        "Gewinn/Verlust ist Marktwert minus Kaufpreis, für Objekte, die beides haben.",
      ownerStated:
        "Kaufpreise und Marktwerte sind Angaben des Eigentümers, keine Schätzung.",
    },
  },
  fr: {
    title: "Collection",
    fileName: "coinslite-collection",
    generated: (time) => `Établi le ${time}`,
    view: "Vue",
    scope: "Périmètre",
    wholeCollection: "Toute la collection",
    filter: (name, value) => `${name} : ${value}`,
    quote: (words) => `« ${words} »`,
    search: "Recherche",
    origin: "Origine",
    album: "Album",
    bullionCoins: "Pièces d’investissement",
    origins: {
      own: (country) => `Nationaux (${country})`,
      foreign: "Étrangers",
    },
    withoutAlbum: "Sans album",
    unknownAlbum: "Album inconnu",
    withoutStorage: "Sans lieu de conservation",
    yearRange: {
      from: (year) => `à partir de ${year}`,
      to: (year) => `jusqu’à ${year}`,
    },
    sortedBy: "Trié par",
    sorts: {
      year: "Année, la plus ancienne d’abord",
      newest: "Ajoutés récemment",
      oldest: "Ajoutés en premier",
      price: "Prix d’achat le plus élevé",
      value: "Valeur de marché la plus élevée",
      gain: "Plus forte plus-value d’abord",
      denomination: "Valeur faciale",
      grade: "État, le meilleur d’abord",
      title: "Titre, de A à Z",
    },
    currency: "Devise",
    owner: "Propriétaire",
    name: "Nom",
    email: "E-mail",
    totals: "Totaux",
    items: "Objets",
    pieces: "Exemplaires",
    gainLoss: "Gain/perte",
    total: "Total",
    page: (page, pages) => `Page ${page} sur ${pages}`,
    aboutValues: "À propos de ces valeurs",
    notes: {
      perItem: (currency) =>
        `Montants en ${currency}, pour tous les exemplaires d’un objet\u00a0: montant par exemplaire × quantité.`,
      gainLoss:
        "Le gain/perte est la valeur de marché moins le prix d’achat, pour les objets qui ont les deux.",
      ownerStated:
        "Les prix d’achat et les valeurs de marché sont déclarés par le propriétaire, sans expertise.",
    },
  },
  ro: {
    title: "Colecție",
    fileName: "coinslite-colectie",
    generated: (time) => `Generat la ${time}`,
    view: "Vizualizare",
    scope: "Acoperire",
    wholeCollection: "Toată colecția",
    filter: (name, value) => `${name}: ${value}`,
    quote: (words) => `„${words}”`,
    search: "Căutare",
    origin: "Proveniență",
    album: "Album",
    bullionCoins: "Monede de investiție",
    origins: {
      own: (country) => `Autohtone (${country})`,
      foreign: "Străine",
    },
    withoutAlbum: "Fără album",
    unknownAlbum: "Album necunoscut",
    withoutStorage: "Fără loc de păstrare",
    yearRange: {
      from: (year) => `din ${year}`,
      to: (year) => `până în ${year}`,
    },
    sortedBy: "Sortat după",
    sorts: {
      year: "An, cele mai vechi întâi",
      newest: "Adăugate recent",
      oldest: "Adăugate primele",
      price: "Cel mai mare preț de achiziție",
      value: "Cea mai mare valoare de piață",
      gain: "Cel mai mare câștig întâi",
      denomination: "Valoare nominală",
      grade: "Stare, cea mai bună întâi",
      title: "Titlu, de la A la Z",
    },
    currency: "Monedă",
    owner: "Proprietar",
    name: "Nume",
    email: "E-mail",
    totals: "Totaluri",
    items: "Obiecte",
    pieces: "Bucăți",
    gainLoss: "Câștig/pierdere",
    total: "Total",
    page: (page, pages) => `Pagina ${page} din ${pages}`,
    aboutValues: "Despre aceste valori",
    notes: {
      perItem: (currency) =>
        `Sumele sunt în ${currency} și acoperă toate bucățile unui obiect: suma pe bucată × cantitate.`,
      gainLoss:
        "Câștigul/pierderea este valoarea de piață minus prețul de achiziție, pentru obiectele care le au pe amândouă.",
      ownerStated:
        "Prețurile de achiziție și valorile de piață sunt declarate de proprietar, nu evaluate.",
    },
  },
};
