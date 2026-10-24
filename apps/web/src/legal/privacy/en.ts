import type { LegalText } from "../types";

export default {
  title: "Privacy policy",
  description:
    "What CoinsLite stores about you and your Collection, why, who processes it, how long it’s kept, and your rights.",
  sections: [
    {
      id: "who",
      heading: "Who we are",
      blocks: [
        "CoinsLite is a web app for recording the coins, banknotes and stamps you own. It is run by {operator}, {address} (“we”). We are the controller of the personal data described here. For anything about this policy or your data, write to {email}.",
      ],
    },
    {
      id: "data",
      heading: "What we store",
      blocks: [
        [
          "Your account: your email address, your display name, the language and Home currency you choose, when you accepted these terms, when you last signed in, which release notes you’ve seen, and, if you add them for the Insurance report, your full name, address, postal code, city, country and phone number.",
          "Your Collection: your Items with everything you enter about them (descriptive facts, Grade, Quantity, Purchase price, Market value, purchase date and source, notes), your Albums and the photos you add.",
          "Shared pages: if you share an Album or a Set by link, the share itself (what is shared, the link’s secret and whether Market values show) and, for whoever opens the link, what the page shows: the Album’s or Set’s name and description, your display name, and for each Item its title, year, country, denomination, series, material, Grade, Quantity and photo, plus the Market values if you turn them on. Purchase prices, places kept, notes, certificate and serial numbers are never shown. Stop sharing and the link stops working.",
          "Sign-in data: a hash of your password if you use one, your sign-in sessions, short-lived codes and links we email you, and a count of failed sign-in attempts. If you sign in with Google, we receive your email address, whether Google has verified it, your name and the address of your profile picture.",
          "Your plan: whether you are on the Free plan or Premium, and for Premium the subscription’s interval, price, currency and end of the current period, as reported by Polar.",
          "Feedback: the messages you send us from the Account screen, with your email address and account id.",
          "Technical data: your IP address and browser details reach our hosting providers with every request and may appear in their logs.",
          "Usage statistics: which pages of the app and this website are opened, the site that linked to them, your browser, operating system and kind of device, and your approximate location (country, region and city), worked out from your IP address. They are counted without cookies and without your account, and the page addresses leave out the ids of your Items and Albums, search terms and sign-in codes.",
        ],
        "We don’t ask for and don’t want sensitive data such as health or religion. Please keep notes about your Items to the Items.",
      ],
    },
    {
      id: "purposes",
      heading: "Why we use it, and on what legal basis",
      blocks: [
        [
          "To provide CoinsLite under our agreement with you (performance of a contract): your account, your Collection and its totals, the reports and exports you ask for, the emails that sign you in or confirm a change, and Premium if you buy it.",
          "To keep CoinsLite safe and working (our legitimate interest): limiting failed sign-ins and how fast uploads and messages can be sent, finding and fixing errors, and preventing abuse.",
          "To learn which parts of CoinsLite are used, so we can improve them (our legitimate interest): usage statistics, counted through OpenPanel without cookies and without us knowing who you are. A content blocker in your browser stops them.",
          "To answer you (our legitimate interest): replying to feedback and requests.",
          "To meet legal duties (legal obligation): for example keeping records we are required to keep.",
        ],
        "We don’t sell your data, don’t show ads and don’t use your data for profiling or marketing. Our usage statistics don’t identify you, and nothing follows you to other websites.",
      ],
    },
    {
      id: "processors",
      heading: "Who processes it for us",
      blocks: [
        "We use these providers. Each receives only what it needs for its task:",
        [
          "Convex: hosts our backend, database and stored files, including your photos. It holds all the data listed above.",
          "Vercel: hosts the app and this website. It handles every page request, with your IP address and browser details.",
          "Resend: sends our emails. It receives your email address and the message, such as a sign-in code or a confirmation link.",
          "Google: only if you choose to sign in with Google, under Google’s own privacy policy.",
          "Polar: sells Premium as merchant of record. When you upgrade, it receives your email address, your account id and your IP address (to choose the currency and tax), and it collects your payment details directly. Polar acts as an independent controller for the payment, under its own privacy policy.",
          "Anthropic: only when you use the scanner (a Premium beta), it receives the two photos you take and the possible Catalog entries, to suggest which coin or banknote it is and its Grade. Nothing that names you is sent.",
          "Sentry: records errors in the app, and how long a sample of pages takes to load, so we can find and fix problems. With each report it receives the page’s address (without its query string), your browser and device details and your approximate location. It doesn’t store your IP address, reports never name you, and it keeps the data in Germany.",
          "OpenPanel: counts how the app and this website are used. With each page view it receives the page’s title and address (without the ids of your Items and Albums, search terms or sign-in codes), the site that linked to it, your browser and device details and your IP address. It works out your approximate location and a visitor identifier that changes every day, then discards the IP address. It sets no cookies and keeps the data in Germany.",
          "MetalpriceAPI: supplies Spot prices and exchange rates. Our requests contain no personal data.",
          "European Central Bank: supplies the exchange rates of past days, when you record a purchase in another currency. Our requests contain only the day and the currencies, no personal data.",
        ],
      ],
    },
    {
      id: "transfers",
      heading: "International transfers",
      blocks: [
        "Some of these providers are based in, or store data in, the United States or other countries outside the European Economic Area. Where data leaves the EEA, the transfer is covered by safeguards the GDPR accepts, such as an adequacy decision or the European Commission’s standard contractual clauses. Write to {email} for a copy.",
      ],
    },
    {
      id: "cookies",
      heading: "Cookies and local storage",
      blocks: [
        "CoinsLite stores only what it needs to work. Nothing is used for ads or tracking, and our usage statistics set no cookies, so we don’t ask for consent to cookies.",
        [
          "Sign-in: the cookies __convexAuthJWT and __convexAuthRefreshToken keep you signed in, and __convexAuthOAuthVerifier lasts while you sign in with Google. Matching entries starting with __convexAuth are kept in your browser’s local storage.",
          "coinslite-signed-in (cookie, one year): tells this website you are signed in, so it opens the app instead of the home page.",
          "coinslite-language (cookie, one year): the language you picked, in the app and on this website.",
          "Next-Locale (cookie, until you close the browser): the language of the page being shown.",
          "theme (local storage): light, dark or your system’s appearance.",
          "collection.display (local storage): list or grid, and how many Items a page shows.",
          "coinslite:catalog-recent (local storage): the last Catalog entries you picked, up to six per Item type.",
          "coinslite-email-change (local storage): an email change waiting for you to confirm it; removed once it’s done.",
        ],
        "Local storage stays on your device. You can clear it and the cookies in your browser at any time; you will then be signed out and your preferences reset.",
      ],
    },
    {
      id: "retention",
      heading: "How long we keep it",
      blocks: [
        "We keep your data for as long as you have an account.",
        [
          "Deleting your account (Account, then Delete account) removes for good your profile, sign-in methods and sessions, your Items, Albums and photos, and the link to your subscription. Most of it goes at once; what’s left of a large Collection follows shortly after in the background. A subscription that would renew is ended first.",
          "What stays is a record that an account id was deleted, which names no one, so a late message from Polar about it ends the subscription it reports.",
          "An account on the Free plan that nobody signs in to gets an email after 6, 8 and 12 months and is deleted 14 days after the last one, which gives the date. Signing in starts the count again.",
          "If you start creating an account or ask for a sign-in link, but never confirm your email address, what we stored for it is deleted after 7 days.",
          "Photos you upload but never save, for example from a scan you don’t keep, are deleted within a few hours.",
          "Deleted data can remain in our backend’s backups for up to {backupDays} days, and in our hosting providers’ logs for up to {logDays} days, after which it’s gone.",
          "Feedback emails stay in our inbox until we delete them. Polar keeps payment records for as long as the law requires it to.",
        ],
      ],
    },
    {
      id: "rights",
      heading: "Your rights",
      blocks: [
        "Under the GDPR and similar laws you have these rights. Most you can use yourself in the app; for the rest, write to {email} and we’ll answer within one month.",
        [
          "Access: see what we hold about you. Your Account screen and Collection show it, and we’ll send a full copy on request.",
          "Correction: change your details on the Account screen and your Items in the app.",
          "Deletion: delete your account and everything in it from the Account screen.",
          "Portability: ask for a copy of your data in a machine-readable format. It’s free on every plan, and on every plan you can also export your Collection as CSV yourself.",
          "Objection: object to what we do on the basis of our legitimate interests.",
          "Withdrawing consent: where we rely on your consent, withdraw it at any time, without affecting what was done before.",
          "Complaint: complain to the supervisory authority, {authority}, or to the one where you live or work.",
        ],
      ],
    },
    {
      id: "security",
      heading: "Security",
      blocks: [
        "Data travels encrypted. Passwords are stored only as hashes. Your photos are private: they are shown only to you, through links that stop working within a day. Only a small number of administrators can see account details such as names, email addresses, plans and how many Items an account holds, and only to run the service.",
      ],
    },
    {
      id: "children",
      heading: "Children",
      blocks: [
        "CoinsLite is not meant for children. You must be at least 16 to create an account. If you believe a child has given us data, write to {email} and we’ll delete it.",
      ],
    },
    {
      id: "changes",
      heading: "Changes to this policy",
      blocks: [
        "When we change this policy, we update the date at the top. If a change matters to how we use your data, we tell you by email or in the app before it applies.",
      ],
    },
  ],
} satisfies LegalText;
