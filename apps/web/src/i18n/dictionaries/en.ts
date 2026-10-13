export default {
  meta: {
    title: "CoinsLite: the record of every coin, banknote and stamp you own",
    description:
      "Record the coins, banknotes and stamps you own with their Grade, what you paid and what they’re worth today, in your own currency. Free up to {limit} Items.",
    imageAlt:
      "CoinsLite: a coin cabinet with one drawer open, and the words “Know exactly what you have”",
  },
  header: {
    home: "CoinsLite home page",
    skip: "Skip to content",
    signIn: "Sign in",
    start: "Start free",
    /** The bar's button on a phone, where the full label doesn't fit. */
    startShort: "Start free",
    language: "Language",
    sections: "Sections",
    menu: "Menu",
    close: "Close",
    nav: {
      record: "How it works",
      sets: "Sets",
      insurance: "Insurance",
      plans: "Plans",
      questions: "Questions",
    },
  },
  hero: {
    kicker: "For collectors of coins, banknotes and stamps",
    title: "Know exactly what you have.",
    lead: "CoinsLite keeps the record behind every coin, banknote and stamp you own: what it is, its Grade, what you paid and what it’s worth today, in your own currency.",
    primary: "Start free",
    secondary: "Sign in",
  },
  figure: {
    label:
      "A coin cabinet, drawn like a technical illustration. Each of its four drawers holds one Set: 2 euro coins, Peace dollars, banknotes and stamps. A coin sits in every recess you hold, the empty recesses are what’s still missing, and a card index on top files a new record card for every piece you add.",
    names: {
      euro: "2 euro",
      notes: "Banknotes",
      stamps: "Stamps",
    },
    status: {
      opened: "{name} drawer open: {held} of {total}.",
      added: "Added to {name}: {held} of {total}.",
      closed: "All drawers closed: {held} of {total} in the cabinet.",
    },
  },
  statement: {
    lead: "Most collections live in three places at once: the cabinet, a spreadsheet last opened in 2019, and the collector’s memory.",
    turn: "The coins are safe. What you know about them isn’t.",
    rest: "CoinsLite writes it down, one Item at a time, so that you, your insurer and your family can read it.",
  },
  record: {
    title: "One coin, recorded properly",
    lead: "This is what CoinsLite keeps for a single coin. Every field is optional, and most of them fill themselves in.",
    example: "Example record",
    chapters: {
      catalog: {
        title: "Pick it from the Catalog",
        text: "Search for “Morgan 1921” and choose the entry. Its country, series, denomination, metal, weight and fineness come with it. Not in the Catalog? Type it in yourself; stamps always are.",
      },
      grade: {
        title: "Grade it on the right scale",
        text: "Sheldon 1 to 70 for an American coin, 0 to 3 for a Norwegian one, UNC to G for most others, and scales of their own for banknotes and stamps. Strike is kept apart, and a slab’s PCGS or NGC number goes with it.",
      },
      purchase: {
        title: "Note what you paid, and where",
        text: "Purchase price, date and source, for each piece. Bought a whole lot at once? Set its purchase on every Item in one go.",
      },
      photos: {
        title: "Photograph both sides",
        text: "Front and back, plus six more. Photos are stored privately and open only through links that expire within the hour.",
      },
      value: {
        title: "Know what it’s worth today",
        text: "Your own Market value, judged from the sales you’ve seen. For gold and silver, the Metal value follows the Spot price by itself.",
      },
    },
    card: {
      fields: {
        catalog: "Catalog",
        grade: "Grade",
        strike: "Strike",
        purchase: "Purchase price",
        source: "Bought",
        photos: "Photos",
        market: "Market value",
        metal: "Metal value",
        gain: "Gain/loss",
      },
      values: {
        catalog: "Silver, 26.73 g, 0.900",
        grade: "MS-63 on the Sheldon scale",
        strike: "Circulation",
        source: "{date} · Coin fair, Oslo",
        photos: "Front and back",
        metal: "24.06 g of fine silver × Spot price",
      },
    },
  },
  value: {
    title: "What it’s worth, in your own currency",
    text: "Totals for your whole Collection: what you paid, what it’s worth now and the gain or loss between the two, all in one Home currency. Charts show how the value has moved over time and where it sits.",
    facts: {
      spot: {
        value: "15",
        text: "minutes between Spot price updates for gold and silver, and every Metal value follows",
      },
      currencies: {
        value: "8",
        text: "Home currencies: NOK, SEK, DKK, EUR, RON, GBP, USD and CHF",
      },
      presets: {
        value: "16",
        text: "bullion presets that fill in weight and purity, from a Krugerrand to a Panda",
      },
      scales: {
        value: "5",
        text: "Grading scales, from Sheldon’s 70 points to stamp grades, with Strike kept apart",
      },
    },
  },
  sets: {
    title: "See what’s missing",
    text: "Any series in the Catalog opens as a Set: which dates you hold, which you don’t, and how far along you are. Mark the gaps as wanted, or add every piece you already own from a Set in one go.",
    tray: {
      title: "{series}, 1921 to 1935",
      count: "{held} of {total} · {percent}%",
      held: "Held",
      missing: "Missing",
      wanted: "On your Wantlist",
    },
    note: "Shown as an example: the Peace dollar is one of the Sets in the Catalog, with every date and mint.",
  },
  insurance: {
    title: "If the worst happens, hand over the list",
    text: "The Insurance report is a PDF your insurer can work with: the Items you choose with their Purchase price, Market value and Metal value, the highest of those as the Insured value, your contact details and the totals.",
    premium: "Premium",
    sheet: {
      title: "Insurance report",
      owner: "Your name and address",
      example: "Example",
      columns: {
        item: "Item",
        grade: "Grade",
        quantity: "Qty",
        market: "Market value",
        metal: "Metal value",
        insured: "Insured value",
      },
      total: "Total",
      used: "Used",
      note: "Values are stated by the owner. Metal value is weight × purity × Spot price. Insured value is the highest value chosen for each Item.",
    },
  },
  also: {
    title: "And everything else",
    items: {
      albums: {
        title: "Albums",
        text: "Group Items by series, by trip or by anything you like.",
      },
      wantlist: {
        title: "Wantlist",
        text: "Mark what you’re after. Adding the piece crosses it off.",
      },
      certification: {
        title: "Certification",
        text: "PCGS, NGC, ANACS, ICG or PMG, with the certificate number.",
      },
      stamps: {
        title: "Stamp catalogue numbers",
        text: "Michel, Scott, Stanley Gibbons, Yvert et Tellier, AFA and Norgeskatalogen.",
      },
      import: {
        title: "Spreadsheet import",
        text: "Up to 2,000 rows from a CSV, checked before anything is saved.",
      },
      export: {
        title: "PDF and CSV export",
        text: "Any view of your Collection, to print or to keep. Premium.",
      },
      charts: {
        title: "Charts",
        text: "Value over time, by date acquired and by type of Item.",
      },
      sales: {
        title: "Sold Items",
        text: "Record what you sold and for how much. It leaves your totals and keeps its history.",
      },
      languages: {
        title: "Five languages",
        text: "English, Norsk bokmål, Deutsch, Français and Română, with numbers and dates written your way.",
      },
      phone: {
        title: "On your phone",
        text: "Runs in the browser on phone, tablet and computer, and goes on your home screen.",
      },
    },
  },
  privacy: {
    title: "Nobody else sees what you own.",
    points: [
      "Your photos are for your eyes only: a link to one stops working within the hour, even if it’s shared.",
      "No ads on any plan, and no tracking cookies. Page views are counted without knowing who you are.",
      "Delete your account, and your Items, photos and Albums go with it.",
    ],
  },
  plans: {
    title: "Free for your first {limit} Items",
    lead: "Premium is there when your Collection outgrows the Free plan, or when you want the reports.",
    free: {
      name: "Free plan",
      price: "Free",
      summary: "Up to {limit} Items, whatever their Quantity.",
      features: [
        "The Catalog, Sets and the Wantlist",
        "Grades, Strike, photos and Albums",
        "Totals, charts and Spot prices",
        "Spreadsheet import",
      ],
      cta: "Start free",
    },
    premium: {
      name: "Premium",
      monthly: "{price} a month",
      yearly: "or {price} a year",
      summary: "No limit on Items, plus the reports.",
      features: [
        "Unlimited Items",
        "The Insurance report",
        "PDF and CSV export",
        "Everything in the Free plan",
      ],
      cta: "Start free, upgrade later",
    },
  },
  questions: {
    title: "Questions collectors ask",
    items: [
      {
        question: "Do my coins have to be in the Catalog?",
        answer:
          "No. Anything can be entered by hand, and stamps always are. Where the Catalog has the issue, it saves you the typing and opens its Set.",
      },
      {
        question: "Can I bring my spreadsheet?",
        answer:
          "Yes. Import a CSV of up to 2,000 rows, with headings in any of the five languages. You see which rows will be added, and why any won’t, before anything is saved. The Free plan’s {limit} Items still apply.",
      },
      {
        question: "What happens if I stop paying for Premium?",
        answer:
          "Every Item stays, and stays editable. You just can’t add more while you have over {limit}.",
      },
      {
        question: "Who can see my Collection?",
        answer:
          "Only you. Your photos are stored privately, and this site counts page views without cookies and without knowing who you are.",
      },
      {
        question: "Which currencies can I use?",
        answer:
          "Your Home currency can be NOK, SEK, DKK, EUR, RON, GBP, USD or CHF. Change it later and every amount is converted once, at a rate you confirm. Premium is billed in NOK, RON, USD or EUR, depending on where you are.",
      },
      {
        question: "Does it work on my phone?",
        answer:
          "Yes. It runs in any modern browser on a phone, a tablet or a computer, and you can add it to your home screen.",
      },
    ],
  },
  closing: {
    title: "Start with the coin on your desk.",
    text: "It takes a minute to make an account, and your first {limit} Items are free.",
    cta: "Start free",
  },
  footer: {
    product: "Product",
    account: "Account",
    legal: "Legal",
    privacy: "Privacy policy",
    terms: "Terms of use",
    tagline:
      "A cabinet for everything you collect, with the record behind every piece.",
    colophon:
      "Set in Familjen Grotesk and Schibsted Grotesk. Every coin on this site is drawn, not photographed.",
  },
  notFound: {
    title: "Nothing is filed under this address",
    description: "The page may have moved, or the link may be wrong.",
    home: "Go to the home page",
    or: "Or open a drawer",
  },
  legal: {
    updated: "Last updated {date}",
    draft:
      "Draft: some details are still to be filled in before CoinsLite launches. They are marked in the text.",
    governs:
      "This is a translation. If it differs from the {english}, the English version applies.",
    englishVersion: "English version",
    contents: "Contents",
    placeholders: {
      operator: "operator’s legal name",
      address: "operator’s address",
      email: "contact email",
      law: "governing law",
      authority: "supervisory authority",
      days: "number",
    },
  },
} as const;
