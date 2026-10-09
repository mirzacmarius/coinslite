import type { Locale } from "@coinslite/i18n";

/**
 * Updates: every CoinsLite release, newest first. Shipping a release means
 * adding an entry at the top of `releases`, with its notes in every launch
 * language. Each language lists the same notes in the same order.
 */

/** How a release's notes are grouped, in the order they're shown. */
export const releaseGroups = [
  "catalog",
  "features",
  "improvements",
  "fixes",
] as const;
export type ReleaseGroup = (typeof releaseGroups)[number];

export type ReleaseNotes = {
  /** The few lines people see once, the first time they open the app after the release. */
  highlights: string[];
} & {
  /** New Catalog content, features, improvements and fixes. Leave out a group with nothing in it. */
  [group in ReleaseGroup]?: string[];
};

export type Release = {
  /** Unique, e.g. "1.1". People who have seen a release are stored with its version. */
  version: string;
  /** "YYYY-MM-DD". */
  date: string;
  notes: Record<Locale, ReleaseNotes>;
};

export const releases: Release[] = [
  {
    version: "1.0",
    date: "2026-10-09",
    notes: {
      en: {
        highlights: [
          "Record the coins, banknotes and stamps you own, with their Grade, Strike, prices and the details you care about.",
          "Use CoinsLite in five languages, on your phone, tablet or computer.",
        ],
        features: [
          "Add coins, banknotes and stamps to your Collection as Items: title, country, year, denomination, Quantity, Purchase price, Market value and more. Press C anywhere to add one.",
          "Grade each Item on a scale that suits it: Sheldon (1–70) or European for coins, international for banknotes, Norwegian (0–3) for both, and a condition scale for stamps. The Strike (circulation, BU or proof) is recorded separately.",
          "Edit and duplicate Items, browse your Collection and open any Item to see all its details.",
          "Amounts are entered and shown in your Home currency: NOK, SEK, DKK, EUR, RON, GBP, USD or CHF.",
          "Gold and silver Spot prices on the Overview, in your Home currency per gram and per troy ounce, refreshed every 15 minutes.",
          "The Free plan holds up to 50 Items, whatever their Quantity, and shows how many you've used.",
          "Sign up with an email and password, a sign-in link or Google. Every way in leads to the same account.",
          "Your Account holds your contact and address details, your language and your email address, which you can change. You can also delete your account with everything in it.",
          "Send feedback to the CoinsLite team from your Account.",
          "English, Norwegian Bokmål, German, French and Romanian, light and dark appearance, and CoinsLite can be added to your home screen.",
          "Updates: what's new in each release, with a short summary the first time you open CoinsLite after one.",
        ],
      },
      nb: {
        highlights: [
          "Registrer myntene, sedlene og frimerkene du eier, med kvalitet, preging, priser og detaljene som betyr noe for deg.",
          "Bruk CoinsLite på fem språk, på mobil, nettbrett eller datamaskin.",
        ],
        features: [
          "Legg til mynter, sedler og frimerker i samlingen din som objekter: tittel, land, år, pålydende, antall, innkjøpspris, markedsverdi og mer. Trykk C hvor som helst for å legge til ett.",
          "Sett kvalitet på hvert objekt etter en skala som passer: Sheldon (1–70) eller europeisk for mynter, internasjonal for sedler, norsk (0–3) for begge, og en tilstandsskala for frimerker. Pregingen (omløp, BU eller proof) registreres for seg.",
          "Rediger og dupliser objekter, bla gjennom samlingen og åpne et objekt for å se alle detaljene.",
          "Beløp føres inn og vises i hjemmevalutaen din: NOK, SEK, DKK, EUR, RON, GBP, USD eller CHF.",
          "Spotpriser for gull og sølv i oversikten, i hjemmevalutaen din per gram og per troy unse, oppdatert hvert 15. minutt.",
          "Gratisplanen rommer opptil 50 objekter, uansett antall, og viser hvor mange du har brukt.",
          "Registrer deg med e-post og passord, en innloggingslenke eller Google. Alle veiene fører til samme konto.",
          "Kontoen din har kontakt- og adresseopplysningene dine, språket ditt og e-postadressen din, som du kan endre. Du kan også slette kontoen med alt innholdet.",
          "Send tilbakemelding til CoinsLite-teamet fra kontoen din.",
          "Engelsk, norsk bokmål, tysk, fransk og rumensk, lyst og mørkt utseende, og CoinsLite kan legges til på startskjermen.",
          "Nyheter: hva som er nytt i hver versjon, med et kort sammendrag første gang du åpner CoinsLite etter en ny versjon.",
        ],
      },
      de: {
        highlights: [
          "Erfasse die Münzen, Banknoten und Briefmarken, die du besitzt, mit Erhaltung, Prägung, Preisen und allen Angaben, die dir wichtig sind.",
          "Nutze CoinsLite in fünf Sprachen, auf Smartphone, Tablet oder Computer.",
        ],
        features: [
          "Füge Münzen, Banknoten und Briefmarken als Objekte zu deiner Sammlung hinzu: Titel, Land, Jahr, Nennwert, Anzahl, Kaufpreis, Marktwert und mehr. Drücke überall C, um eines hinzuzufügen.",
          "Bewerte die Erhaltung jedes Objekts auf einer passenden Skala: Sheldon (1–70) oder europäisch für Münzen, international für Banknoten, norwegisch (0–3) für beide und eine Erhaltungsskala für Briefmarken. Die Prägung (Umlauf, Stempelglanz oder Polierte Platte) wird getrennt erfasst.",
          "Bearbeite und dupliziere Objekte, blättere durch deine Sammlung und öffne ein Objekt, um alle Angaben zu sehen.",
          "Beträge werden in deiner Heimatwährung eingegeben und angezeigt: NOK, SEK, DKK, EUR, RON, GBP, USD oder CHF.",
          "Spotpreise für Gold und Silber in der Übersicht, in deiner Heimatwährung pro Gramm und pro Feinunze, alle 15 Minuten aktualisiert.",
          "Der Gratis-Tarif umfasst bis zu 50 Objekte, unabhängig von ihrer Anzahl, und zeigt, wie viele du schon nutzt.",
          "Registriere dich mit E-Mail und Passwort, einem Anmeldelink oder Google. Jeder Weg führt zum selben Konto.",
          "In deinem Konto stehen deine Kontakt- und Adressdaten, deine Sprache und deine E-Mail-Adresse, die du ändern kannst. Du kannst dein Konto auch samt Inhalt löschen.",
          "Sende dem CoinsLite-Team Feedback direkt aus deinem Konto.",
          "Englisch, Norwegisch (Bokmål), Deutsch, Französisch und Rumänisch, helle und dunkle Darstellung, und CoinsLite lässt sich zum Startbildschirm hinzufügen.",
          "Neuigkeiten: was jede Version Neues bringt, mit einer kurzen Zusammenfassung, wenn du CoinsLite danach zum ersten Mal öffnest.",
        ],
      },
      fr: {
        highlights: [
          "Enregistrez les pièces, billets et timbres que vous possédez, avec leur état, leur frappe, leurs prix et les détails qui comptent pour vous.",
          "Utilisez CoinsLite en cinq langues, sur téléphone, tablette ou ordinateur.",
        ],
        features: [
          "Ajoutez des pièces, billets et timbres à votre collection sous forme d’objets : titre, pays, année, valeur faciale, quantité, prix d’achat, valeur de marché et plus encore. Appuyez sur C n’importe où pour en ajouter un.",
          "Évaluez l’état de chaque objet sur l’échelle qui lui convient : Sheldon (1–70) ou européenne pour les pièces, internationale pour les billets, norvégienne (0–3) pour les deux, et une échelle d’état pour les timbres. La frappe (circulation, BU ou belle épreuve) est notée à part.",
          "Modifiez et dupliquez des objets, parcourez votre collection et ouvrez un objet pour en voir tous les détails.",
          "Les montants sont saisis et affichés dans votre devise de référence : NOK, SEK, DKK, EUR, RON, GBP, USD ou CHF.",
          "Les cours spot de l’or et de l’argent dans l’aperçu, dans votre devise de référence par gramme et par once troy, mis à jour toutes les 15 minutes.",
          "La formule gratuite contient jusqu’à 50 objets, quelle que soit leur quantité, et indique combien vous en utilisez.",
          "Inscrivez-vous avec une adresse e-mail et un mot de passe, un lien de connexion ou Google. Chaque méthode mène au même compte.",
          "Votre compte réunit vos coordonnées, votre langue et votre adresse e-mail, que vous pouvez changer. Vous pouvez aussi supprimer votre compte avec tout son contenu.",
          "Donnez votre avis à l’équipe CoinsLite depuis votre compte.",
          "Anglais, norvégien bokmål, allemand, français et roumain, apparence claire et sombre, et CoinsLite peut être ajouté à votre écran d’accueil.",
          "Nouveautés : ce qui change à chaque version, avec un court résumé la première fois que vous ouvrez CoinsLite après une nouvelle version.",
        ],
      },
      ro: {
        highlights: [
          "Înregistrează monedele, bancnotele și timbrele pe care le deții, cu starea, baterea, prețurile și detaliile care contează pentru tine.",
          "Folosește CoinsLite în cinci limbi, pe telefon, tabletă sau computer.",
        ],
        features: [
          "Adaugă monede, bancnote și timbre în colecția ta ca obiecte: titlu, țară, an, valoare nominală, cantitate, preț de achiziție, valoare de piață și altele. Apasă C oriunde pentru a adăuga unul.",
          "Evaluează starea fiecărui obiect pe scala potrivită: Sheldon (1–70) sau europeană pentru monede, internațională pentru bancnote, norvegiană (0–3) pentru ambele și o scală de stare pentru timbre. Baterea (circulație, BU sau proof) se înregistrează separat.",
          "Editează și duplică obiecte, răsfoiește colecția și deschide orice obiect pentru a-i vedea toate detaliile.",
          "Sumele se introduc și se afișează în moneda ta de bază: NOK, SEK, DKK, EUR, RON, GBP, USD sau CHF.",
          "Prețurile spot ale aurului și argintului în Prezentare, în moneda ta de bază pe gram și pe uncie troy, actualizate la fiecare 15 minute.",
          "Planul gratuit cuprinde până la 50 de obiecte, indiferent de cantitate, și îți arată câte ai folosit.",
          "Creează-ți contul cu e-mail și parolă, cu un link de conectare sau cu Google. Toate variantele duc la același cont.",
          "Contul tău păstrează datele de contact și adresa, limba și adresa de e-mail, pe care o poți schimba. Îți poți șterge oricând contul, cu tot conținutul lui.",
          "Trimite feedback echipei CoinsLite din contul tău.",
          "Engleză, norvegiană bokmål, germană, franceză și română, aspect luminos și întunecat, iar CoinsLite poate fi adăugat pe ecranul de pornire.",
          "Noutăți: ce aduce fiecare versiune, cu un scurt rezumat prima dată când deschizi CoinsLite după o versiune nouă.",
        ],
      },
    },
  },
];

/** The newest release: the one people are told about, and where new accounts start. */
export function latestRelease(): Release {
  const [latest] = releases;
  if (!latest) throw new Error("There is no release yet");
  return latest;
}
