export default {
  meta: {
    title: "CoinsLite: a clear record of your coins, banknotes and stamps",
    description:
      "Record the coins, banknotes and stamps you own, keep their Grades and photos, and see what your Collection is worth in your own currency. Free up to {limit} Items.",
    imageAlt: "CoinsLite, for collectors of coins, banknotes and stamps",
  },
  header: {
    home: "CoinsLite home page",
    signIn: "Sign in",
    createAccount: "Create account",
    language: "Language",
    features: "Features",
    plans: "Plans",
  },
  hero: {
    eyebrow: "For collectors of coins, banknotes and stamps",
    title: "Your Collection, recorded properly and valued in your currency",
    lead: "CoinsLite keeps a clear record of what you own: what each Item is, its Grade, what you paid and what it’s worth today. Pick Items from the Catalog in a few clicks, or enter them yourself.",
    primary: "Create a free account",
    secondary: "Sign in",
    note: "Free up to {limit} Items. No card needed.",
  },
  preview: {
    label: "An example Collection",
    title: "Collection",
    items: "{count} Items",
    marketValue: "Market value",
    gainLoss: "Gain/loss",
    types: { coin: "Coin", banknote: "Banknote", stamp: "Stamp" },
  },
  features: {
    title: "What CoinsLite does",
    lead: "Everything below is in the app today, in every language.",
    catalog: {
      title: "From the Catalog or by hand",
      text: "Pick a Catalog entry and its facts fill in: country, years, denomination, series and metal. Or type an Item in yourself; stamps are always entered by hand.",
    },
    grades: {
      title: "Grades, with Strike kept apart",
      text: "Grade each Item on the scale that suits it: Sheldon 1–70, the Norwegian 0–3 scale, European and international grades, or stamp grades. Strike (circulation, BU or proof) is recorded on its own.",
    },
    albums: {
      title: "Albums",
      text: "Group Items into Albums, such as a series you follow or a trip. Each Item sits in one Album at most.",
    },
    photos: {
      title: "Photos of both sides",
      text: "Add a photo of the front and the back. Photos are stored privately and only you can see them.",
    },
    totals: {
      title: "Totals in your Home currency",
      text: "Purchase price, Market value and Gain/loss across your whole Collection, all in the one currency you choose.",
    },
    spot: {
      title: "Gold and silver Spot prices",
      text: "Spot prices are updated regularly, with the time of each update shown, and the Metal value of your coins follows them.",
    },
    sets: {
      title: "Sets and completion",
      text: "See a Catalog series as a Set: how much of it you hold, and which entries you’re still missing.",
    },
    insurance: {
      title: "Insurance report",
      text: "A PDF for your insurer with the Items you choose, their values and your contact details. Premium.",
    },
    exports: {
      title: "PDF and CSV export",
      text: "Your Collection, or any filtered part of it, as a PDF to print or a CSV for a spreadsheet. Premium.",
    },
    languages: {
      title: "Five languages",
      text: "English, Norwegian Bokmål, German, French and Romanian, with numbers and dates written the way your language writes them.",
    },
    noAds: {
      title: "No ads",
      text: "No ads on any plan, and no analytics or tracking scripts.",
    },
  },
  plans: {
    title: "Plans",
    lead: "Start free. Upgrade when your Collection outgrows it.",
    free: {
      name: "Free plan",
      price: "Free",
      summary: "Up to {limit} Items, whatever their Quantity.",
      features: [
        "The Catalog, Albums and photos",
        "Grades, Strike and Sets",
        "Totals and Spot prices",
      ],
      cta: "Create a free account",
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
      cta: "Start with a free account",
    },
    pricesTitle: "Premium prices",
    currency: "Currency",
    month: "Monthly",
    year: "Yearly",
    pricesNote:
      "You pay in your local currency when Premium has a price in it, otherwise in euros. Payments are handled by Polar.",
    cancelNote:
      "Cancel whenever you like: Premium lasts until the end of the period you paid for. Back on the Free plan, every Item stays and stays editable; you just can’t add more while you have over {limit}.",
  },
  closing: {
    title: "Start your Collection today",
    text: "It takes a minute to create an account, and your first {limit} Items are free.",
  },
  footer: {
    privacy: "Privacy policy",
    terms: "Terms of use",
  },
  notFound: {
    title: "Page not found",
    description:
      "There’s nothing at this address. It may have moved, or the link may be wrong.",
    home: "Go to the home page",
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
