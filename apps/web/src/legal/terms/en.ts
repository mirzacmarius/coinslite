import type { LegalText } from "../types";

export default {
  title: "Terms of use",
  description:
    "The agreement between you and CoinsLite: the plans, payment and cancellation, your content, the Catalog, values and our responsibilities.",
  sections: [
    {
      id: "agreement",
      heading: "The agreement",
      blocks: [
        "These terms are an agreement between you and {operator}, {address} (“we”), which runs CoinsLite. By creating an account you accept them, together with the privacy policy. You must be at least 16.",
      ],
    },
    {
      id: "service",
      heading: "The service and its plans",
      blocks: [
        "CoinsLite lets you record the coins, banknotes and stamps you own, organise them and keep track of what you paid and what they are worth.",
        [
          "Free plan: up to {limit} Items, counted as Items whatever their Quantity.",
          "Premium: no limit on Items, plus the Insurance report and the PDF and CSV exports. It is sold by the month or by the year, at the prices shown on our website and in the app when you upgrade.",
        ],
        "Premium is sold through Polar, which acts as merchant of record: Polar is the seller you pay, handles the payment and tax, and its own terms apply to the purchase.",
      ],
    },
    {
      id: "billing",
      heading: "Renewal and cancellation",
      blocks: [
        [
          "Premium renews automatically at the end of each month or year until you cancel it.",
          "You can cancel at any time from your Account screen. Premium then stays active until the end of the period you have paid for, and doesn’t renew.",
          "Refunds and your right of withdrawal are handled by Polar as the seller, under its terms and the consumer law that applies to you.",
          "If we change Premium’s price, we tell you before the new price applies to your subscription, so you can cancel first.",
          "When Premium ends, you return to the Free plan. Nothing is lost: every Item stays visible and editable, even above {limit} Items. You just can’t add new Items while you have more than {limit}.",
        ],
      ],
    },
    {
      id: "use",
      heading: "Acceptable use",
      blocks: [
        "Use CoinsLite lawfully and for your own Collection. Don’t:",
        [
          "upload content you have no right to use, or that is illegal or offensive;",
          "try to reach other people’s data, or get around limits, plans or security;",
          "overload the service, or copy the Catalog in bulk by automated means;",
          "resell or share access to the service.",
        ],
        "If an account breaks these rules, we may suspend or close it. Unless the law or an urgent risk stands in the way, we tell you first and give you a chance to respond.",
      ],
    },
    {
      id: "content",
      heading: "Your content",
      blocks: [
        "What you enter and the photos you add remain yours. You allow us to store, process and show them to you only as needed to run CoinsLite, for example to work out your totals, make the reports you ask for, and, when you use the scanner, have your photos analysed. We don’t publish your content or use it for anything else.",
        "If you share an Album or a Set by link, you choose to show that part of your Collection to whoever has the link, as the privacy policy describes, and you are responsible for what you share and whom you give the link to. You can stop sharing at any time.",
      ],
    },
    {
      id: "catalog",
      heading: "The Catalog",
      blocks: [
        "The Catalog is built by CoinsLite from sources whose licences allow it, such as public-domain data and official lists, plus our own editing. Each source, author and licence is credited where the licence requires it. You may use the Catalog to record your own Collection; its texts and images stay with us and their credited owners. Catalog facts can contain mistakes: tell us when you find one.",
      ],
    },
    {
      id: "values",
      heading: "Values and reports",
      blocks: [
        [
          "Purchase prices and Market values are your own figures. We don’t check them.",
          "Spot prices come from a third-party provider, are updated regularly and are indicative only. They may be delayed or wrong, and Metal value is just a calculation from them: weight × purity × Spot price × Quantity.",
          "The Insurance report and the exports list the values you have chosen. They are not an appraisal or a valuation, and they are not financial advice. Your insurer decides what it accepts.",
        ],
      ],
    },
    {
      id: "scanner",
      heading: "The coin scanner",
      blocks: [
        "The scanner, a Premium beta, suggests which coin your photos show. Suggestions can be wrong, so they are always shown for you to review and correct before anything is saved.",
      ],
    },
    {
      id: "availability",
      heading: "Availability",
      blocks: [
        "We work to keep CoinsLite available and your data safe, but we can’t promise that it will always be available or free of errors. We may change, add or remove features. If we ever close the service, we tell you at least 30 days before, so you can ask for a copy of your data.",
      ],
    },
    {
      id: "liability",
      heading: "Liability",
      blocks: [
        "We are responsible for damage we cause intentionally or through gross negligence, and for anything else the law doesn’t allow us to exclude. Otherwise, we are not liable for indirect loss, and our total liability is limited to what you paid us in the 12 months before the claim. Nothing in these terms limits your rights as a consumer.",
      ],
    },
    {
      id: "ending",
      heading: "Ending the agreement",
      blocks: [
        "You can stop at any time by deleting your account on the Account screen. That ends any subscription that would renew and deletes your data, as the privacy policy describes.",
      ],
    },
    {
      id: "changes",
      heading: "Changes to these terms",
      blocks: [
        "We may update these terms. We tell you about important changes by email or in the app before they apply. If you don’t agree, you can delete your account before then.",
      ],
    },
    {
      id: "law",
      heading: "Governing law",
      blocks: [
        "These terms are governed by the law of {law}. If you are a consumer, you keep the protection of the mandatory rules of the country where you live, and you may bring a claim there.",
      ],
    },
    {
      id: "contact",
      heading: "Contact",
      blocks: ["{operator}, {address}. Email: {email}."],
    },
  ],
} satisfies LegalText;
