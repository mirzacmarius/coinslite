import type { Dictionary } from "../dictionary";

export default {
  meta: {
    title:
      "CoinsLite: evidența fiecărei monede, bancnote și timbru pe care le ai",
    description:
      "Înregistrează monedele, bancnotele și timbrele tale, cu starea lor, cât ai plătit și cât valorează azi. Gratuit pentru până la {limit} de obiecte.",
    imageAlt:
      "CoinsLite: un dulap pentru monede cu un sertar deschis și cuvintele „Știi exact ce ai”",
  },
  header: {
    home: "Pagina principală CoinsLite",
    skip: "Sari la conținut",
    signIn: "Conectare",
    start: "Începe gratuit",
    startShort: "Începe",
    language: "Limbă",
    sections: "Secțiuni",
    menu: "Meniu",
    close: "Închide",
    nav: {
      record: "Cum funcționează",
      sets: "Seturi",
      insurance: "Asigurare",
      plans: "Planuri",
      questions: "Întrebări",
    },
  },
  hero: {
    kicker: "Pentru colecționarii de monede, bancnote și timbre",
    title: "Știi exact ce ai.",
    lead: "CoinsLite ține evidența fiecărei monede, bancnote și a fiecărui timbru pe care le ai: ce este, în ce stare e, cât ai plătit și cât valorează azi, în moneda ta de bază.",
    primary: "Începe gratuit",
    secondary: "Conectează-te",
  },
  figure: {
    label:
      "Un dulap pentru monede, desenat ca o ilustrație tehnică. Fiecare dintre cele patru sertare conține un set: monede de 2 euro, dolari Peace, bancnote și timbre. În fiecare locaș pe care îl ai stă o monedă, locașurile goale sunt ce lipsește încă, iar un fișier de pe dulap adaugă câte o fișă nouă pentru fiecare obiect adăugat.",
    names: {
      euro: "Monede de 2 euro",
      notes: "Bancnote",
      stamps: "Timbre",
    },
    status: {
      opened: "Sertarul {name} e deschis: {held} din {total}.",
      added: "Adăugat la {name}: {held} din {total}.",
      closed: "Toate sertarele sunt închise: {held} din {total} în dulap.",
    },
  },
  statement: {
    lead: "Cele mai multe colecții trăiesc în trei locuri deodată: în dulap, într-un tabel deschis ultima dată în 2019 și în memoria colecționarului.",
    turn: "Monedele sunt în siguranță. Ce știi despre ele, nu.",
    rest: "CoinsLite le notează, obiect cu obiect, ca să le poată citi și tu, și asigurătorul tău, și familia ta.",
  },
  record: {
    title: "O monedă, înregistrată cum trebuie",
    lead: "Iată ce păstrează CoinsLite pentru o singură monedă. Fiecare câmp e opțional, iar cele mai multe se completează singure.",
    example: "Exemplu",
    chapters: {
      catalog: {
        title: "Alege-o din catalog",
        text: "Caută „Morgan 1921” și alege intrarea. Țara, seria, valoarea nominală, metalul, greutatea și titlul vin odată cu ea. Nu e în catalog? Introdu-o singur; timbrele se introduc mereu așa.",
      },
      grade: {
        title: "Evalueaz-o pe scara potrivită",
        text: "Sheldon de la 1 la 70 pentru o monedă americană, de la 0 la 3 pentru una norvegiană, de la UNC la G pentru cele mai multe altele și scări proprii pentru bancnote și timbre. Baterea se notează separat, iar numărul PCGS sau NGC al unei capsule o însoțește.",
      },
      purchase: {
        title: "Notează cât ai plătit și unde",
        text: "Prețul de achiziție, data și sursa, pentru fiecare bucată. Ai cumpărat un lot întreg deodată? Setează achiziția pe toate obiectele dintr-o mișcare.",
      },
      photos: {
        title: "Fotografiază ambele fețe",
        text: "Aversul și reversul, plus încă șase. Fotografiile sunt păstrate privat și se deschid doar prin linkuri care expiră în cel mult o oră.",
      },
      value: {
        title: "Află cât valorează azi",
        text: "Propria ta valoare de piață, apreciată după vânzările pe care le-ai văzut. La aur și argint, valoarea metalului urmează singură prețul spot.",
      },
    },
    card: {
      fields: {
        catalog: "Catalog",
        grade: "Stare",
        strike: "Batere",
        purchase: "Preț de achiziție",
        source: "Cumpărată",
        photos: "Fotografii",
        market: "Valoare de piață",
        metal: "Valoarea metalului",
        gain: "Câștig/pierdere",
      },
      values: {
        catalog: "Argint, 26,73 g, 0,900",
        grade: "MS-63 pe scara Sheldon",
        strike: "Circulație",
        source: "{date} · Târg numismatic, Oslo",
        photos: "Avers și revers",
        metal: "24,06 g de argint fin × preț spot",
      },
    },
  },
  value: {
    title: "Cât valorează, în moneda ta de bază",
    text: "Totaluri pentru întreaga colecție: cât ai plătit, cât valorează acum și câștigul sau pierderea dintre ele, totul într-o singură monedă de bază. Graficele arată cum s-a mișcat valoarea în timp și unde se află.",
    facts: {
      spot: {
        value: "15",
        text: "minute între actualizările prețului spot pentru aur și argint, iar fiecare valoare a metalului urmează",
      },
      currencies: {
        value: "8",
        text: "monede de bază: NOK, SEK, DKK, EUR, RON, GBP, USD și CHF",
      },
      presets: {
        value: "16",
        text: "presetări pentru lingouri care completează greutatea și titlul, de la Krugerrand la Panda",
      },
      scales: {
        value: "5",
        text: "scări de evaluare, de la cele 70 de puncte Sheldon la timbre, cu baterea separat",
      },
    },
  },
  sets: {
    title: "Vezi ce lipsește",
    text: "Orice serie din catalog se deschide ca set: ce ani ai, ce nu ai și cât de departe ai ajuns. Marchează golurile ca dorite sau adaugă dintr-o mișcare tot ce ai deja dintr-un set.",
    tray: {
      title: "{series}, din 1921 până în 1935",
      count: "{held} din {total} · {percent}%",
      held: "Deținute",
      missing: "Lipsă",
      wanted: "Pe lista ta de dorințe",
    },
    note: "Ca exemplu: dolarul Peace este unul dintre seturile din catalog, cu fiecare an și fiecare monetărie.",
  },
  insurance: {
    title: "Dacă se întâmplă ce e mai rău, dă-le lista",
    text: "Raportul de asigurare este un PDF cu care asigurătorul tău poate lucra: obiectele alese, cu prețul de achiziție, valoarea de piață și valoarea metalului, cea mai mare dintre ele ca valoare asigurată, datele tale de contact și totalurile.",
    premium: "Premium",
    sheet: {
      title: "Raport de asigurare",
      owner: "Numele și adresa ta",
      example: "Exemplu",
      columns: {
        item: "Obiect",
        grade: "Stare",
        quantity: "Cant.",
        market: "Valoare de piață",
        metal: "Valoarea metalului",
        insured: "Valoare asigurată",
      },
      total: "Total",
      used: "ștampilat",
      note: "Valorile sunt declarate de proprietar. Valoarea metalului este greutate × titlu × preț spot. Valoarea asigurată este cea mai mare valoare aleasă pentru fiecare obiect.",
    },
  },
  also: {
    title: "Și tot restul",
    items: {
      albums: {
        title: "Albume",
        text: "Grupează obiectele pe serii, pe călătorii sau cum vrei tu.",
      },
      wantlist: {
        title: "Listă de dorințe",
        text: "Marchează ce cauți. Când adaugi piesa, e bifată.",
      },
      certification: {
        title: "Certificare",
        text: "PCGS, NGC, ANACS, ICG sau PMG, cu numărul certificatului.",
      },
      stamps: {
        title: "Cataloage de timbre",
        text: "Numere din Michel, Scott, Stanley Gibbons, Yvert et Tellier, AFA și Norgeskatalogen.",
      },
      import: {
        title: "Import din tabel",
        text: "Până la 2.000 de rânduri dintr-un fișier CSV salvat din Numista, OpenNumismat, CoinManage sau din propria foaie de calcul, verificate înainte să se salveze ceva.",
      },
      export: {
        title: "Export PDF și CSV",
        text: "Orice vizualizare a colecției în format CSV, de păstrat, în orice plan. Cu Premium, în format PDF de tipărit, și etichete pentru suporturi și slaburi.",
      },
      charts: {
        title: "Grafice",
        text: "Valoarea în timp, după data dobândirii și după tipul de obiect.",
      },
      sales: {
        title: "Obiecte vândute",
        text: "Notează ce ai vândut și cu cât. Iese din totaluri și își păstrează istoricul.",
      },
      languages: {
        title: "Cinci limbi",
        text: "English, Norsk bokmål, Deutsch, Français și Română, cu numerele și datele scrise cum ești obișnuit.",
      },
      phone: {
        title: "Pe telefon",
        text: "Rulează în browser pe telefon, tabletă și computer și se poate adăuga pe ecranul de pornire.",
      },
    },
  },
  privacy: {
    title: "Nimeni altcineva nu vede ce ai.",
    points: [
      "Fotografiile tale sunt doar pentru tine: un link către una dintre ele nu mai funcționează după cel mult o oră, chiar dacă e trimis mai departe.",
      "Fără reclame în niciun plan și fără cookie-uri de urmărire. Vizitele sunt numărate fără să știm cine ești.",
      "Șterge-ți contul, iar obiectele, fotografiile și albumele tale pleacă odată cu el.",
    ],
  },
  plans: {
    title: "Gratuit pentru primele {limit} de obiecte",
    lead: "Premium e acolo când colecția depășește planul gratuit sau când vrei rapoartele.",
    free: {
      name: "Plan gratuit",
      price: "Gratuit",
      summary: "Până la {limit} de obiecte, indiferent de cantitate.",
      features: [
        "Catalogul, seturile și lista de dorințe",
        "Stări, batere, fotografii și albume",
        "Totaluri, grafice și prețuri spot",
        "Import din tabel și export CSV",
      ],
      cta: "Începe gratuit",
    },
    premium: {
      name: "Premium",
      monthly: "{price} pe lună",
      yearly: "sau {price} pe an",
      summary: "Obiecte nelimitate, plus rapoartele.",
      features: [
        "Obiecte nelimitate",
        "Raportul de asigurare",
        "Export PDF",
        "Etichete pentru suporturi și slaburi",
        "Tot ce are planul gratuit",
      ],
      cta: "Începe gratuit, apoi Premium",
    },
  },
  questions: {
    title: "Ce întreabă colecționarii",
    items: [
      {
        question: "Trebuie ca monedele mele să fie în catalog?",
        answer:
          "Nu. Orice se poate introduce de mână, iar timbrele mereu așa se introduc. Acolo unde catalogul are emisiunea, te scutește de tastat și îi deschide setul.",
      },
      {
        question: "Îmi pot aduce tabelul?",
        answer:
          "Da. Importă un fișier CSV de până la 2.000 de rânduri: din propria foaie de calcul sau salvat din Numista, OpenNumismat ori CoinManage. CoinsLite ghicește ce conține fiecare coloană, în oricare dintre cele cinci limbi, iar tu verifici. Vezi ce rânduri vor fi adăugate și de ce altele nu, înainte să se salveze ceva. Limita de {limit} de obiecte a planului gratuit rămâne valabilă.",
      },
      {
        question: "Ce se întâmplă dacă nu mai plătesc Premium?",
        answer:
          "Fiecare obiect rămâne și poate fi editat în continuare. Doar că nu mai poți adăuga altele cât timp ai peste {limit}.",
      },
      {
        question: "Cine îmi poate vedea colecția?",
        answer:
          "Doar tu. Fotografiile sunt păstrate privat, iar acest site numără vizitele fără cookie-uri și fără să știe cine ești.",
      },
      {
        question: "Ce monede de bază pot folosi?",
        answer:
          "Moneda ta de bază poate fi NOK, SEK, DKK, EUR, RON, GBP, USD sau CHF. Dacă o schimbi mai târziu, fiecare sumă se convertește o singură dată, la un curs pe care îl confirmi. Premium se facturează în NOK, RON, USD sau EUR, în funcție de unde te afli.",
      },
      {
        question: "Merge pe telefon?",
        answer:
          "Da. Rulează în orice browser modern, pe telefon, tabletă sau computer, și îl poți adăuga pe ecranul de pornire.",
      },
    ],
  },
  closing: {
    title: "Începe cu moneda de pe biroul tău.",
    text: "Îți faci cont într-un minut, iar primele {limit} de obiecte sunt gratuite.",
    cta: "Începe gratuit",
  },
  footer: {
    product: "Produs",
    account: "Cont",
    legal: "Juridic",
    privacy: "Politica de confidențialitate",
    terms: "Termeni de utilizare",
    tagline:
      "Un dulap pentru tot ce colecționezi, cu evidența din spatele fiecărei piese.",
    colophon:
      "Cules cu Familjen Grotesk și Schibsted Grotesk. Fiecare monedă de pe acest site este desenată, nu fotografiată.",
  },
  notFound: {
    title: "Nimic nu e arhivat la această adresă",
    description: "Poate că pagina a fost mutată sau linkul este greșit.",
    home: "Mergi la pagina principală",
    or: "Sau deschide un sertar",
  },
  legal: {
    updated: "Ultima actualizare: {date}",
    draft:
      "Ciornă: unele detalii vor fi completate înainte de lansarea CoinsLite. Sunt marcate în text.",
    governs:
      "Aceasta este o traducere. Dacă diferă de {english}, se aplică versiunea în engleză.",
    englishVersion: "versiunea în engleză",
    contents: "Cuprins",
    placeholders: {
      operator: "denumirea legală a operatorului",
      address: "adresa operatorului",
      email: "e-mail de contact",
      law: "legea aplicabilă",
      authority: "autoritatea de supraveghere",
      days: "număr",
    },
  },
} satisfies Dictionary;
