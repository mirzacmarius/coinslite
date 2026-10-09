import type { Locale } from "@coinslite/i18n";
import type { ItemType } from "../items/grades";
import type { ReportColumn } from "./rules";

/** The Insurance report PDF's text, in each launch language. */
export type ReportMessages = {
  title: string;
  /** The downloaded file's name, before the date: ASCII, lower case. */
  fileName: string;
  generated: (time: string) => string;
  report: string;
  scope: string;
  wholeCollection: string;
  albums: (names: string) => string;
  withoutAlbum: string;
  items: string;
  pieces: string;
  currency: string;
  owner: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  spotPrices: string;
  gold: string;
  silver: string;
  /** Two lines: per gram, then per troy ounce. */
  spotPrice: (perGram: string, perOunce: string) => string;
  quotedAt: string;
  noSpotPrices: string;
  stale: string;
  summary: string;
  type: string;
  itemTitle: string;
  year: string;
  denomination: string;
  grade: string;
  quantity: string;
  columns: Record<ReportColumn, string>;
  itemTypes: Record<ItemType, string>;
  stampGrades: Record<"mnh" | "mh" | "used", string>;
  total: string;
  page: (page: number, pages: number) => string;
  aboutValues: string;
  notes: {
    perItem: (currency: string) => string;
    ownerStated: string;
    metalValue: string;
    insuredValue: string;
  };
};

export const reportMessages: Record<Locale, ReportMessages> = {
  en: {
    title: "Insurance report",
    fileName: "insurance-report",
    generated: (time) => `Generated ${time}`,
    report: "Report",
    scope: "Scope",
    wholeCollection: "Whole Collection",
    albums: (names) => `Albums: ${names}`,
    withoutAlbum: "Items without an Album",
    items: "Items",
    pieces: "Pieces",
    currency: "Currency",
    owner: "Owner",
    name: "Name",
    email: "Email",
    phone: "Phone",
    address: "Address",
    spotPrices: "Spot prices",
    gold: "Gold",
    silver: "Silver",
    spotPrice: (perGram, perOunce) =>
      `${perGram} per gram\n${perOunce} per troy ounce`,
    quotedAt: "As of",
    noSpotPrices: "No Spot prices yet, so no Item has a Metal value.",
    stale: "Not updated for over an hour; may be out of date.",
    summary: "Summary",
    type: "Type",
    itemTitle: "Title",
    year: "Year",
    denomination: "Denomination",
    grade: "Grade",
    quantity: "Quantity",
    columns: {
      purchasePrice: "Purchase price",
      marketValue: "Market value",
      metalValue: "Metal value",
      insuredValue: "Insured value",
    },
    itemTypes: { coin: "Coin", banknote: "Banknote", stamp: "Stamp" },
    stampGrades: {
      mnh: "Mint never hinged",
      mh: "Mint hinged",
      used: "Used",
    },
    total: "Total",
    page: (page, pages) => `Page ${page} of ${pages}`,
    aboutValues: "About these values",
    notes: {
      perItem: (currency) =>
        `Amounts are in ${currency} and cover all of an Item's pieces: the amount per piece × Quantity.`,
      ownerStated:
        "Purchase prices and Market values are stated by the owner, not appraised.",
      metalValue:
        "Metal value is weight × purity × Spot price × Quantity, at the Spot prices above, for gold and silver Items with a weight and purity.",
      insuredValue:
        "Insured value is the highest of the chosen values for each Item.",
    },
  },
  nb: {
    title: "Forsikringsrapport",
    fileName: "forsikringsrapport",
    generated: (time) => `Laget ${time}`,
    report: "Rapport",
    scope: "Omfang",
    wholeCollection: "Hele samlingen",
    albums: (names) => `Album: ${names}`,
    withoutAlbum: "Objekter uten album",
    items: "Objekter",
    pieces: "Stykker",
    currency: "Valuta",
    owner: "Eier",
    name: "Navn",
    email: "E-post",
    phone: "Telefon",
    address: "Adresse",
    spotPrices: "Spotpriser",
    gold: "Gull",
    silver: "Sølv",
    spotPrice: (perGram, perOunce) =>
      `${perGram} per gram\n${perOunce} per troy unse`,
    quotedAt: "Per",
    noSpotPrices: "Ingen spotpriser ennå, så ingen objekter har metallverdi.",
    stale: "Ikke oppdatert på over en time; kan være utdaterte.",
    summary: "Sammendrag",
    type: "Type",
    itemTitle: "Tittel",
    year: "År",
    denomination: "Pålydende",
    grade: "Kvalitet",
    quantity: "Antall",
    columns: {
      purchasePrice: "Innkjøpspris",
      marketValue: "Markedsverdi",
      metalValue: "Metallverdi",
      insuredValue: "Forsikringsverdi",
    },
    itemTypes: { coin: "Mynt", banknote: "Seddel", stamp: "Frimerke" },
    stampGrades: {
      mnh: "Postfrisk",
      mh: "Ubrukt med hengsel",
      used: "Stemplet",
    },
    total: "Totalt",
    page: (page, pages) => `Side ${page} av ${pages}`,
    aboutValues: "Om verdiene",
    notes: {
      perItem: (currency) =>
        `Beløpene er i ${currency} og gjelder alle stykkene i et objekt: beløpet per stykk × antall.`,
      ownerStated:
        "Innkjøpspriser og markedsverdier er oppgitt av eieren, ikke taksert.",
      metalValue:
        "Metallverdi er vekt × finhet × spotpris × antall, etter spotprisene ovenfor, for gull- og sølvobjekter med vekt og finhet.",
      insuredValue:
        "Forsikringsverdi er den høyeste av de valgte verdiene for hvert objekt.",
    },
  },
  de: {
    title: "Versicherungsbericht",
    fileName: "versicherungsbericht",
    generated: (time) => `Erstellt am ${time}`,
    report: "Bericht",
    scope: "Umfang",
    wholeCollection: "Gesamte Sammlung",
    albums: (names) => `Alben: ${names}`,
    withoutAlbum: "Objekte ohne Album",
    items: "Objekte",
    pieces: "Stück",
    currency: "Währung",
    owner: "Eigentümer",
    name: "Name",
    email: "E-Mail",
    phone: "Telefon",
    address: "Adresse",
    spotPrices: "Spotpreise",
    gold: "Gold",
    silver: "Silber",
    spotPrice: (perGram, perOunce) =>
      `${perGram} pro Gramm\n${perOunce} pro Feinunze`,
    quotedAt: "Stand",
    noSpotPrices:
      "Noch keine Spotpreise, daher hat kein Objekt einen Metallwert.",
    stale:
      "Seit über einer Stunde nicht aktualisiert; möglicherweise veraltet.",
    summary: "Zusammenfassung",
    type: "Art",
    itemTitle: "Titel",
    year: "Jahr",
    denomination: "Nennwert",
    grade: "Erhaltung",
    quantity: "Anzahl",
    columns: {
      purchasePrice: "Kaufpreis",
      marketValue: "Marktwert",
      metalValue: "Metallwert",
      insuredValue: "Versicherungswert",
    },
    itemTypes: { coin: "Münze", banknote: "Banknote", stamp: "Briefmarke" },
    stampGrades: {
      mnh: "Postfrisch",
      mh: "Ungebraucht mit Falz",
      used: "Gestempelt",
    },
    total: "Summe",
    page: (page, pages) => `Seite ${page} von ${pages}`,
    aboutValues: "Zu diesen Werten",
    notes: {
      perItem: (currency) =>
        `Beträge in ${currency}; sie gelten für alle Stücke eines Objekts: Betrag pro Stück × Anzahl.`,
      ownerStated:
        "Kaufpreise und Marktwerte sind Angaben des Eigentümers, keine Schätzung.",
      metalValue:
        "Der Metallwert ist Gewicht × Feinheit × Spotpreis × Anzahl, zu den oben genannten Spotpreisen, für Gold- und Silberobjekte mit Gewicht und Feinheit.",
      insuredValue:
        "Der Versicherungswert ist der höchste der gewählten Werte je Objekt.",
    },
  },
  fr: {
    title: "Rapport d’assurance",
    fileName: "rapport-assurance",
    generated: (time) => `Établi le ${time}`,
    report: "Rapport",
    scope: "Périmètre",
    wholeCollection: "Toute la collection",
    albums: (names) => `Albums : ${names}`,
    withoutAlbum: "Objets sans album",
    items: "Objets",
    pieces: "Exemplaires",
    currency: "Devise",
    owner: "Propriétaire",
    name: "Nom",
    email: "E-mail",
    phone: "Téléphone",
    address: "Adresse",
    spotPrices: "Cours spot",
    gold: "Or",
    silver: "Argent",
    spotPrice: (perGram, perOunce) =>
      `${perGram} le gramme\n${perOunce} l’once troy`,
    quotedAt: "Au",
    noSpotPrices:
      "Pas encore de cours spot : aucun objet n’a donc de valeur du métal.",
    stale: "Non mis à jour depuis plus d’une heure ; peut-être dépassé.",
    summary: "Synthèse",
    type: "Type",
    itemTitle: "Titre",
    year: "Année",
    denomination: "Valeur faciale",
    grade: "État",
    quantity: "Quantité",
    columns: {
      purchasePrice: "Prix d’achat",
      marketValue: "Valeur de marché",
      metalValue: "Valeur du métal",
      insuredValue: "Valeur assurée",
    },
    itemTypes: { coin: "Pièce", banknote: "Billet", stamp: "Timbre" },
    stampGrades: {
      mnh: "Neuf sans charnière",
      mh: "Neuf avec charnière",
      used: "Oblitéré",
    },
    total: "Total",
    page: (page, pages) => `Page ${page} sur ${pages}`,
    aboutValues: "À propos de ces valeurs",
    notes: {
      perItem: (currency) =>
        `Montants en ${currency}, pour tous les exemplaires d’un objet : montant par exemplaire × quantité.`,
      ownerStated:
        "Les prix d’achat et les valeurs de marché sont déclarés par le propriétaire, sans expertise.",
      metalValue:
        "La valeur du métal est poids × pureté × cours spot × quantité, aux cours spot ci-dessus, pour les objets en or et en argent dont le poids et la pureté sont connus.",
      insuredValue:
        "La valeur assurée est la plus élevée des valeurs choisies pour chaque objet.",
    },
  },
  ro: {
    title: "Raport de asigurare",
    fileName: "raport-asigurare",
    generated: (time) => `Generat la ${time}`,
    report: "Raport",
    scope: "Acoperire",
    wholeCollection: "Toată colecția",
    albums: (names) => `Albume: ${names}`,
    withoutAlbum: "Obiecte fără album",
    items: "Obiecte",
    pieces: "Bucăți",
    currency: "Monedă",
    owner: "Proprietar",
    name: "Nume",
    email: "E-mail",
    phone: "Telefon",
    address: "Adresă",
    spotPrices: "Prețuri spot",
    gold: "Aur",
    silver: "Argint",
    spotPrice: (perGram, perOunce) =>
      `${perGram} pe gram\n${perOunce} pe uncie troy`,
    quotedAt: "La data de",
    noSpotPrices:
      "Încă nu există prețuri spot, așa că niciun obiect nu are valoarea metalului.",
    stale: "Neactualizate de peste o oră; pot fi depășite.",
    summary: "Rezumat",
    type: "Tip",
    itemTitle: "Titlu",
    year: "An",
    denomination: "Valoare nominală",
    grade: "Stare",
    quantity: "Cantitate",
    columns: {
      purchasePrice: "Preț de achiziție",
      marketValue: "Valoare de piață",
      metalValue: "Valoarea metalului",
      insuredValue: "Valoare asigurată",
    },
    itemTypes: { coin: "Monedă", banknote: "Bancnotă", stamp: "Timbru" },
    stampGrades: {
      mnh: "Nestampilat, fără sarnieră",
      mh: "Nestampilat, cu sarnieră",
      used: "Stampilat",
    },
    total: "Total",
    page: (page, pages) => `Pagina ${page} din ${pages}`,
    aboutValues: "Despre aceste valori",
    notes: {
      perItem: (currency) =>
        `Sumele sunt în ${currency} și acoperă toate bucățile unui obiect: suma pe bucată × cantitate.`,
      ownerStated:
        "Prețurile de achiziție și valorile de piață sunt declarate de proprietar, nu evaluate.",
      metalValue:
        "Valoarea metalului este greutate × puritate × preț spot × cantitate, la prețurile spot de mai sus, pentru obiectele din aur și argint cu greutate și puritate.",
      insuredValue:
        "Valoarea asigurată este cea mai mare dintre valorile alese pentru fiecare obiect.",
    },
  },
};
