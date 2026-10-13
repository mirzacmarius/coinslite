import type { Dictionary } from "../dictionary";

export default {
  meta: {
    title: "CoinsLite: oversikten over hver mynt, seddel og frimerke du eier",
    description:
      "Registrer myntene, sedlene og frimerkene du eier, med kvalitet, hva du betalte og hva de er verdt i dag, i din egen valuta. Gratis for opptil {limit} objekter.",
    imageAlt:
      "CoinsLite: et myntskap med én skuff åpen, og ordene «Vit nøyaktig hva du har»",
  },
  header: {
    home: "CoinsLites forside",
    skip: "Gå til innholdet",
    signIn: "Logg inn",
    start: "Kom i gang gratis",
    startShort: "Kom i gang",
    language: "Språk",
    sections: "Seksjoner",
    menu: "Meny",
    close: "Lukk",
    nav: {
      record: "Slik virker det",
      sets: "Sett",
      insurance: "Forsikring",
      plans: "Planer",
      questions: "Spørsmål",
    },
  },
  hero: {
    kicker: "For samlere av mynter, sedler og frimerker",
    title: "Vit nøyaktig hva du har.",
    lead: "CoinsLite fører oversikten bak hver mynt, seddel og frimerke du eier: hva det er, kvaliteten, hva du betalte og hva det er verdt i dag, i din egen valuta.",
    primary: "Kom i gang gratis",
    secondary: "Logg inn",
    note: "De første {limit} objektene er gratis. Du trenger ikke kort.",
  },
  figure: {
    fig: "Figur 1",
    title: "Myntskap",
    hint: "Åpne en skuff og fyll på settet",
    label:
      "Et myntskap på en arbeidsbenk, tegnet som en teknisk illustrasjon. Hver av de fire skuffene rommer ett sett: 2-euromynter, Peace-dollar, sedler og frimerker. En mynt ligger i hver fordypning du har, de tomme fordypningene er det som mangler, og en kortkasse på toppen arkiverer et nytt kort for hvert objekt du legger til.",
    caption:
      "Hver skuff er et sett fra katalogen. Brettet med Peace-dollar har en fordypning for hver av sine 24 årganger og myntsteder, fra 1921 til 1935.",
    open: "{name} · {held} av {total}",
    closed: "{held} av {total} i skapet",
    names: {
      euro: "2-euromynter",
      notes: "Sedler",
      stamps: "Frimerker",
    },
    drawers: "Skuffer",
    pause: "Sett på pause",
    play: "Spill av",
    add: {
      coin: "Legg til en mynt",
      note: "Legg til en seddel",
      stamp: "Legg til et frimerke",
    },
    status: {
      opened: "Skuffen {name} er åpen: {held} av {total}.",
      added: "Lagt til i {name}: {held} av {total}.",
      closed: "Alle skuffer er lukket: {held} av {total} i skapet.",
    },
  },
  statement: {
    lead: "De fleste samlinger finnes tre steder samtidig: i skapet, i et regneark som sist ble åpnet i 2019, og i samlerens hukommelse.",
    turn: "Myntene er trygge. Det du vet om dem, er ikke det.",
    rest: "CoinsLite skriver det ned, ett objekt om gangen, så du, forsikringsselskapet ditt og familien din kan lese det.",
  },
  record: {
    title: "Én mynt, ordentlig registrert",
    lead: "Dette er det CoinsLite tar vare på for én enkelt mynt. Alle feltene er valgfrie, og de fleste fyller seg ut selv.",
    example: "Eksempel",
    chapters: {
      catalog: {
        title: "Velg den i katalogen",
        text: "Søk etter «Morgan 1921» og velg oppføringen. Land, serie, pålydende, metall, vekt og finhet følger med. Ikke i katalogen? Skriv den inn selv; frimerker skrives alltid inn.",
      },
      grade: {
        title: "Sett kvalitet på riktig skala",
        text: "Sheldon 1 til 70 for en amerikansk mynt, 0 til 3 for en norsk, UNC til G for de fleste andre, og egne skalaer for sedler og frimerker. Preging holdes for seg, og PCGS- eller NGC-nummeret på en slab følger med.",
      },
      purchase: {
        title: "Noter hva du betalte, og hvor",
        text: "Innkjøpspris, dato og kilde, for hvert stykke. Kjøpt et helt parti på én gang? Sett innkjøpet på alle objektene i én operasjon.",
      },
      photos: {
        title: "Fotografer begge sider",
        text: "Forside og bakside, pluss seks til. Bildene lagres privat og åpnes bare via lenker som utløper innen en time.",
      },
      value: {
        title: "Vit hva den er verdt i dag",
        text: "Din egen markedsverdi, vurdert ut fra salg du har sett. For gull og sølv følger metallverdien spotprisen av seg selv.",
      },
    },
    card: {
      fields: {
        catalog: "Katalog",
        grade: "Kvalitet",
        strike: "Preging",
        purchase: "Innkjøpspris",
        source: "Kjøpt",
        photos: "Bilder",
        market: "Markedsverdi",
        metal: "Metallverdi",
        gain: "Gevinst/tap",
      },
      values: {
        catalog: "Sølv, 26,73 g, 0,900",
        grade: "MS-63 på Sheldon-skalaen",
        strike: "Omløp",
        source: "{date} · Myntmesse, Oslo",
        photos: "Forside og bakside",
        metal: "24,06 g finsølv × spotpris",
      },
    },
  },
  value: {
    title: "Hva den er verdt, i din egen valuta",
    text: "Totaler for hele samlingen: hva du betalte, hva den er verdt nå og gevinsten eller tapet mellom dem, alt i én hjemmevaluta. Diagrammer viser hvordan verdien har beveget seg over tid, og hvor den ligger.",
    facts: {
      spot: {
        value: "15",
        text: "minutter mellom hver oppdatering av spotprisen på gull og sølv, og hver metallverdi følger med",
      },
      currencies: {
        value: "8",
        text: "hjemmevalutaer: NOK, SEK, DKK, EUR, RON, GBP, USD og CHF",
      },
      presets: {
        value: "16",
        text: "forhåndsvalg for bullion som fyller inn vekt og finhet, fra Krugerrand til Panda",
      },
      scales: {
        value: "5",
        text: "kvalitetsskalaer, fra Sheldons 70 poeng til frimerker, med preging holdt for seg",
      },
    },
  },
  sets: {
    title: "Se hva som mangler",
    text: "Enhver serie i katalogen kan åpnes som et sett: hvilke årganger du har, hvilke du mangler, og hvor langt du har kommet. Merk hullene som ønsket, eller legg til alt du allerede eier fra et sett på én gang.",
    tray: {
      title: "{series}, 1921 til 1935",
      count: "{held} av {total} · {percent} %",
      held: "Har",
      missing: "Mangler",
      wanted: "På ønskelisten",
    },
    note: "Vist som eksempel: Peace-dollaren er et av settene i katalogen, med hver årgang og hvert myntsted.",
  },
  insurance: {
    title: "Hvis det verste skjer, gi dem listen",
    text: "Forsikringsrapporten er en PDF forsikringsselskapet kan bruke: objektene du velger med innkjøpspris, markedsverdi og metallverdi, den høyeste av dem som forsikringsverdi, kontaktopplysningene dine og totalene.",
    premium: "Premium",
    sheet: {
      title: "Forsikringsrapport",
      owner: "Navn og adresse",
      example: "Eksempel",
      columns: {
        item: "Objekt",
        grade: "Kvalitet",
        quantity: "Ant.",
        market: "Markedsverdi",
        metal: "Metallverdi",
        insured: "Forsikringsverdi",
      },
      total: "Sum",
      used: "stemplet",
      note: "Verdiene er oppgitt av eieren. Metallverdi er vekt × finhet × spotpris. Forsikringsverdien er den høyeste valgte verdien for hvert objekt.",
    },
  },
  also: {
    title: "Og alt det andre",
    items: {
      albums: {
        title: "Album",
        text: "Grupper objekter etter serie, etter reise eller etter hva du vil.",
      },
      wantlist: {
        title: "Ønskeliste",
        text: "Merk det du er på jakt etter. Når objektet kommer inn, krysses det av.",
      },
      certification: {
        title: "Sertifisering",
        text: "PCGS, NGC, ANACS, ICG eller PMG, med sertifikatnummeret.",
      },
      stamps: {
        title: "Frimerkekataloger",
        text: "Numre fra Michel, Scott, Stanley Gibbons, Yvert et Tellier, AFA og Norgeskatalogen.",
      },
      import: {
        title: "Import fra regneark",
        text: "Opptil 2 000 rader fra en CSV-fil, sjekket før noe lagres.",
      },
      export: {
        title: "PDF- og CSV-eksport",
        text: "Enhver visning av samlingen, til utskrift eller arkiv. Premium.",
      },
      charts: {
        title: "Diagrammer",
        text: "Verdi over tid, etter anskaffelsesdato og etter objekttype.",
      },
      sales: {
        title: "Solgte objekter",
        text: "Registrer hva du solgte og for hvor mye. Det forsvinner fra totalene og beholder historikken sin.",
      },
      languages: {
        title: "Fem språk",
        text: "English, Norsk bokmål, Deutsch, Français og Română, med tall og datoer skrevet slik du er vant til.",
      },
      phone: {
        title: "På mobilen",
        text: "Kjører i nettleseren på mobil, nettbrett og datamaskin, og kan legges på hjemskjermen.",
      },
    },
  },
  privacy: {
    title: "Ingen andre ser hva du eier.",
    points: [
      "Bildene dine er bare for deg: en lenke til et bilde slutter å virke innen en time, selv om den blir delt.",
      "Ingen reklame i noen plan, og ingen sporende informasjonskapsler. Sidevisninger telles uten at vi vet hvem du er.",
      "Slett kontoen, så forsvinner objektene, bildene og albumene dine med den.",
    ],
  },
  plans: {
    title: "Gratis for de første {limit} objektene",
    lead: "Premium er der når samlingen vokser ut av gratisplanen, eller når du vil ha rapportene.",
    free: {
      name: "Gratisplan",
      price: "Gratis",
      summary: "Opptil {limit} objekter, uansett antall.",
      features: [
        "Katalogen, sett og ønskelisten",
        "Kvalitet, preging, bilder og album",
        "Totaler, diagrammer og spotpriser",
        "Import fra regneark",
      ],
      cta: "Kom i gang gratis",
    },
    premium: {
      name: "Premium",
      monthly: "{price} i måneden",
      yearly: "eller {price} i året",
      summary: "Ubegrenset antall objekter, pluss rapportene.",
      features: [
        "Ubegrenset antall objekter",
        "Forsikringsrapporten",
        "PDF- og CSV-eksport",
        "Alt i gratisplanen",
      ],
      cta: "Start gratis, oppgrader senere",
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
  questions: {
    title: "Det samlere spør om",
    items: [
      {
        question: "Må myntene mine finnes i katalogen?",
        answer:
          "Nei. Alt kan skrives inn for hånd, og frimerker blir det alltid. Der katalogen har utgaven, slipper du å skrive, og settet åpnes.",
      },
      {
        question: "Kan jeg ta med regnearket mitt?",
        answer:
          "Ja. Importer en CSV-fil med opptil 2 000 rader, med kolonneoverskrifter på hvilket som helst av de fem språkene. Du ser hvilke rader som legges til, og hvorfor andre ikke gjør det, før noe lagres. Gratisplanens {limit} objekter gjelder fortsatt.",
      },
      {
        question: "Hva skjer hvis jeg slutter å betale for Premium?",
        answer:
          "Alle objektene blir værende og kan fortsatt redigeres. Du kan bare ikke legge til flere så lenge du har over {limit}.",
      },
      {
        question: "Hvem kan se samlingen min?",
        answer:
          "Bare du. Bildene lagres privat, og dette nettstedet teller sidevisninger uten informasjonskapsler og uten å vite hvem du er.",
      },
      {
        question: "Hvilke valutaer kan jeg bruke?",
        answer:
          "Hjemmevalutaen kan være NOK, SEK, DKK, EUR, RON, GBP, USD eller CHF. Bytter du senere, regnes hvert beløp om én gang, til en kurs du bekrefter. Premium faktureres i NOK, RON, USD eller EUR, avhengig av hvor du er.",
      },
      {
        question: "Virker det på mobilen?",
        answer:
          "Ja. Det kjører i alle moderne nettlesere på mobil, nettbrett eller datamaskin, og du kan legge det på hjemskjermen.",
      },
    ],
  },
  closing: {
    title: "Begynn med mynten på skrivebordet ditt.",
    text: "Det tar et minutt å lage en konto, og de første {limit} objektene er gratis.",
    cta: "Kom i gang gratis",
  },
  footer: {
    product: "Produkt",
    account: "Konto",
    legal: "Juridisk",
    privacy: "Personvernerklæring",
    terms: "Vilkår for bruk",
    tagline:
      "Et skap for alt du samler på, med opplysningene bak hvert objekt.",
    colophon:
      "Satt i Familjen Grotesk og Schibsted Grotesk. Hver mynt på dette nettstedet er tegnet, ikke fotografert.",
  },
  notFound: {
    title: "Ingenting er arkivert på denne adressen",
    description: "Siden kan ha blitt flyttet, eller lenken kan være feil.",
    home: "Gå til forsiden",
    or: "Eller åpne en skuff",
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
