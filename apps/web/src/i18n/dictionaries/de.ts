import type { Dictionary } from "../dictionary";

export default {
  meta: {
    title: "CoinsLite: jede Münze, Banknote und Briefmarke, sauber erfasst",
    description:
      "Erfasse deine Münzen, Banknoten und Briefmarken mit Erhaltung, Kaufpreis und heutigem Wert, in deiner eigenen Währung. Gratis für bis zu {limit} Objekte.",
    imageAlt:
      "CoinsLite: ein Münzschrank mit einer offenen Schublade und den Worten „Wisse genau, was du hast“",
  },
  header: {
    home: "Startseite von CoinsLite",
    skip: "Zum Inhalt springen",
    signIn: "Anmelden",
    start: "Gratis starten",
    startShort: "Starten",
    language: "Sprache",
    sections: "Abschnitte",
    menu: "Menü",
    close: "Schließen",
    nav: {
      record: "So funktioniert’s",
      sets: "Was fehlt",
      insurance: "Versicherung",
      plans: "Tarife",
      questions: "Fragen",
    },
  },
  hero: {
    kicker: "Für Sammler von Münzen, Banknoten und Briefmarken",
    title: "Wisse genau, was du hast.",
    lead: "CoinsLite führt Buch über jede Münze, Banknote und Briefmarke, die du besitzt: was sie ist, ihre Erhaltung, was du bezahlt hast und was sie heute wert ist, in deiner eigenen Währung.",
    primary: "Gratis starten",
    secondary: "Anmelden",
    note: "Deine ersten {limit} Objekte sind gratis. Keine Kreditkarte nötig.",
  },
  figure: {
    fig: "Abb. 1",
    title: "Münzschrank",
    hint: "Öffne eine Schublade und ergänze ihr Set",
    label:
      "Ein Münzschrank auf einer Werkbank, gezeichnet wie eine technische Illustration. Jede seiner vier Schubladen enthält ein Set: 2-Euro-Münzen, Peace-Dollars, Banknoten und Briefmarken. In jeder Mulde, die du besitzt, liegt eine Münze; die leeren Mulden sind das, was noch fehlt. Ein Karteikasten obenauf legt für jedes neue Stück eine neue Karteikarte ab.",
    caption:
      "Jede Schublade ist ein Set aus dem Katalog. Das Tableau mit den Peace-Dollars hat für jeden seiner 24 Jahrgänge und Prägestätten von 1921 bis 1935 eine Mulde.",
    open: "{name} · {held} von {total}",
    closed: "{held} von {total} im Schrank",
    names: {
      euro: "2 Euro",
      notes: "Banknoten",
      stamps: "Briefmarken",
    },
    drawers: "Schubladen",
    pause: "Anhalten",
    play: "Abspielen",
    add: {
      coin: "Münze hinzufügen",
      note: "Banknote hinzufügen",
      stamp: "Briefmarke hinzufügen",
    },
    status: {
      opened: "Schublade {name} offen: {held} von {total}.",
      added: "Zu {name} hinzugefügt: {held} von {total}.",
      closed: "Alle Schubladen zu: {held} von {total} im Schrank.",
    },
  },
  statement: {
    lead: "Die meisten Sammlungen leben an drei Orten zugleich: im Schrank, in einer Tabelle, die zuletzt 2019 geöffnet wurde, und im Gedächtnis des Sammlers.",
    turn: "Die Münzen sind sicher. Was du über sie weißt, nicht.",
    rest: "CoinsLite schreibt es auf, Objekt für Objekt, damit du, deine Versicherung und deine Familie es lesen können.",
  },
  record: {
    title: "Eine Münze, richtig erfasst",
    lead: "So viel hält CoinsLite für eine einzige Münze fest. Jedes Feld ist freiwillig, und die meisten füllen sich von selbst.",
    example: "Beispiel",
    chapters: {
      catalog: {
        title: "Aus dem Katalog wählen",
        text: "Suche nach „Morgan 1921“ und wähle den Eintrag. Land, Serie, Nominal, Metall, Gewicht und Feingehalt kommen mit. Nicht im Katalog? Trag sie selbst ein; Briefmarken immer.",
      },
      grade: {
        title: "Auf der richtigen Skala bewerten",
        text: "Sheldon 1 bis 70 für eine amerikanische Münze, 0 bis 3 für eine norwegische, UNC bis G für die meisten anderen, und eigene Skalen für Banknoten und Briefmarken. Die Prägung wird eigens erfasst, und die PCGS- oder NGC-Nummer eines Slabs gehört dazu.",
      },
      purchase: {
        title: "Festhalten, was du bezahlt hast, und wo",
        text: "Kaufpreis, Datum und Quelle, für jedes Stück. Ein ganzes Lot auf einmal gekauft? Trag den Kauf für alle Objekte in einem Schritt ein.",
      },
      photos: {
        title: "Beide Seiten fotografieren",
        text: "Vorder- und Rückseite, dazu sechs weitere. Fotos werden privat gespeichert und öffnen sich nur über Links, die nach höchstens einer Stunde ablaufen.",
      },
      value: {
        title: "Wissen, was sie heute wert ist",
        text: "Dein eigener Marktwert, eingeschätzt nach den Verkäufen, die du gesehen hast. Bei Gold und Silber folgt der Metallwert dem Spotpreis von selbst.",
      },
    },
    card: {
      fields: {
        catalog: "Katalog",
        grade: "Erhaltung",
        strike: "Prägung",
        purchase: "Kaufpreis",
        source: "Gekauft",
        photos: "Fotos",
        market: "Marktwert",
        metal: "Metallwert",
        gain: "Gewinn/Verlust",
      },
      values: {
        catalog: "Silber, 26,73 g, 0,900",
        grade: "MS-63 auf der Sheldon-Skala",
        strike: "Umlauf",
        source: "{date} · Münzbörse, Oslo",
        photos: "Vorder- und Rückseite",
        metal: "24,06 g Feinsilber × Spotpreis",
      },
    },
  },
  value: {
    title: "Was sie wert ist, in deiner eigenen Währung",
    text: "Summen für deine ganze Sammlung: was du bezahlt hast, was sie jetzt wert ist und der Gewinn oder Verlust dazwischen, alles in einer Heimatwährung. Diagramme zeigen, wie sich der Wert über die Zeit bewegt hat und worin er steckt.",
    facts: {
      spot: {
        value: "15",
        text: "Minuten zwischen zwei Spotpreisen für Gold und Silber, und jeder Metallwert zieht mit",
      },
      currencies: {
        value: "8",
        text: "Heimatwährungen: NOK, SEK, DKK, EUR, RON, GBP, USD und CHF",
      },
      presets: {
        value: "16",
        text: "Bullion-Vorlagen, die Gewicht und Feinheit eintragen, vom Krugerrand bis zum Panda",
      },
      scales: {
        value: "5",
        text: "Bewertungsskalen, von Sheldons 70 Punkten bis zu den Briefmarken, die Prägung getrennt",
      },
    },
  },
  sets: {
    title: "Sieh, was fehlt",
    text: "Jede Serie im Katalog lässt sich als Set öffnen: welche Jahrgänge du hast, welche nicht, und wie weit du bist. Markiere die Lücken als gesucht, oder füge alles, was du aus einem Set schon besitzt, in einem Schritt hinzu.",
    tray: {
      title: "{series}, 1921 bis 1935",
      count: "{held} von {total} · {percent} %",
      held: "Vorhanden",
      missing: "Fehlt",
      wanted: "Auf deiner Wunschliste",
    },
    note: "Als Beispiel: Der Peace-Dollar ist eines der Sets im Katalog, mit jedem Jahrgang und jeder Prägestätte.",
  },
  insurance: {
    title: "Wenn das Schlimmste passiert, gib die Liste weiter",
    text: "Der Versicherungsbericht ist ein PDF, mit dem deine Versicherung arbeiten kann: die Objekte deiner Wahl mit Kaufpreis, Marktwert und Metallwert, dem höchsten davon als Versicherungswert, deinen Kontaktdaten und den Summen.",
    premium: "Premium",
    sheet: {
      title: "Versicherungsbericht",
      owner: "Dein Name und deine Anschrift",
      example: "Beispiel",
      columns: {
        item: "Objekt",
        grade: "Erhaltung",
        quantity: "Anz.",
        market: "Marktwert",
        metal: "Metallwert",
        insured: "Versicherungswert",
      },
      total: "Summe",
      used: "gestempelt",
      note: "Die Werte stammen vom Eigentümer. Metallwert ist Gewicht × Feinheit × Spotpreis. Versicherungswert ist für jedes Objekt der höchste gewählte Wert.",
    },
  },
  also: {
    title: "Und alles andere",
    items: {
      albums: {
        title: "Alben",
        text: "Fasse Objekte nach Serie, nach Reise oder wie du magst zusammen.",
      },
      wantlist: {
        title: "Wunschliste",
        text: "Markiere, was du suchst. Kommt das Stück dazu, ist es abgehakt.",
      },
      certification: {
        title: "Zertifizierung",
        text: "PCGS, NGC, ANACS, ICG oder PMG, mit der Zertifikatsnummer.",
      },
      stamps: {
        title: "Briefmarkenkataloge",
        text: "Nummern aus Michel, Scott, Stanley Gibbons, Yvert et Tellier, AFA und Norgeskatalogen.",
      },
      import: {
        title: "Tabellenimport",
        text: "Bis zu 2.000 Zeilen aus einer CSV-Datei, geprüft, bevor etwas gespeichert wird.",
      },
      export: {
        title: "PDF- und CSV-Export",
        text: "Jede Ansicht deiner Sammlung, zum Drucken oder zum Aufbewahren. Premium.",
      },
      charts: {
        title: "Diagramme",
        text: "Der Wert über die Zeit, nach Erwerbsdatum und nach Objektart.",
      },
      sales: {
        title: "Verkaufte Objekte",
        text: "Halte fest, was du verkauft hast und zu welchem Preis. Es verlässt deine Summen und behält seine Geschichte.",
      },
      languages: {
        title: "Fünf Sprachen",
        text: "English, Norsk bokmål, Deutsch, Français und Română, mit Zahlen und Daten so geschrieben, wie du es gewohnt bist.",
      },
      phone: {
        title: "Auf dem Handy",
        text: "Läuft im Browser auf Handy, Tablet und Computer und lässt sich auf den Startbildschirm legen.",
      },
    },
  },
  privacy: {
    title: "Niemand sonst sieht, was du besitzt.",
    points: [
      "Deine Fotos sind nur für dich: Ein Link zu einem Foto funktioniert höchstens eine Stunde lang, auch wenn er weitergegeben wird.",
      "Keine Werbung, in keinem Tarif, und keine Tracking-Cookies. Seitenaufrufe werden gezählt, ohne dass wir wissen, wer du bist.",
      "Lösch dein Konto, und deine Objekte, Fotos und Alben gehen mit.",
    ],
  },
  plans: {
    title: "Gratis für deine ersten {limit} Objekte",
    lead: "Premium ist da, wenn deine Sammlung über den Gratis-Tarif hinauswächst oder wenn du die Berichte willst.",
    free: {
      name: "Gratis-Tarif",
      price: "Gratis",
      summary: "Bis zu {limit} Objekte, unabhängig von ihrer Anzahl.",
      features: [
        "Der Katalog, Sets und die Wunschliste",
        "Erhaltung, Prägung, Fotos und Alben",
        "Summen, Diagramme und Spotpreise",
        "Tabellenimport",
      ],
      cta: "Gratis starten",
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
      cta: "Gratis starten, später umsteigen",
    },
  },
  questions: {
    title: "Was Sammler fragen",
    items: [
      {
        question: "Müssen meine Münzen im Katalog sein?",
        answer:
          "Nein. Alles lässt sich von Hand eintragen, Briefmarken sowieso. Wo der Katalog die Ausgabe hat, spart er dir das Tippen und öffnet ihr Set.",
      },
      {
        question: "Kann ich meine Tabelle mitbringen?",
        answer:
          "Ja. Importiere eine CSV-Datei mit bis zu 2.000 Zeilen, mit Spaltenköpfen in jeder der fünf Sprachen. Du siehst, welche Zeilen hinzukommen und warum andere nicht, bevor etwas gespeichert wird. Die {limit} Objekte des Gratis-Tarifs gelten trotzdem.",
      },
      {
        question: "Was passiert, wenn ich Premium nicht mehr bezahle?",
        answer:
          "Jedes Objekt bleibt erhalten und bearbeitbar. Du kannst nur keine weiteren hinzufügen, solange du mehr als {limit} hast.",
      },
      {
        question: "Wer kann meine Sammlung sehen?",
        answer:
          "Nur du. Deine Fotos werden privat gespeichert, und diese Website zählt Seitenaufrufe ohne Cookies und ohne zu wissen, wer du bist.",
      },
      {
        question: "Welche Währungen kann ich verwenden?",
        answer:
          "Deine Heimatwährung kann NOK, SEK, DKK, EUR, RON, GBP, USD oder CHF sein. Wechselst du sie später, wird jeder Betrag einmal umgerechnet, zu einem Kurs, den du bestätigst. Premium wird in NOK, RON, USD oder EUR abgerechnet, je nachdem, wo du bist.",
      },
      {
        question: "Funktioniert es auf meinem Handy?",
        answer:
          "Ja. Es läuft in jedem aktuellen Browser auf Handy, Tablet oder Computer, und du kannst es auf deinen Startbildschirm legen.",
      },
    ],
  },
  closing: {
    title: "Fang mit der Münze auf deinem Schreibtisch an.",
    text: "Ein Konto ist in einer Minute erstellt, und deine ersten {limit} Objekte sind gratis.",
    cta: "Gratis starten",
  },
  footer: {
    product: "Produkt",
    account: "Konto",
    legal: "Rechtliches",
    privacy: "Datenschutzerklärung",
    terms: "Nutzungsbedingungen",
    tagline:
      "Ein Schrank für alles, was du sammelst, mit den Angaben hinter jedem Stück.",
    colophon:
      "Gesetzt in Familjen Grotesk und Schibsted Grotesk. Jede Münze auf dieser Seite ist gezeichnet, nicht fotografiert.",
  },
  notFound: {
    title: "Unter dieser Adresse liegt nichts",
    description:
      "Vielleicht wurde die Seite verschoben, oder der Link ist falsch.",
    home: "Zur Startseite",
    or: "Oder öffne eine Schublade",
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
