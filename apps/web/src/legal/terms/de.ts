import type { LegalText } from "../types";

export default {
  title: "Nutzungsbedingungen",
  description:
    "Die Vereinbarung zwischen dir und CoinsLite: die Tarife, Zahlung und Kündigung, deine Inhalte, der Katalog, Werte und unsere Verantwortung.",
  sections: [
    {
      id: "agreement",
      heading: "Die Vereinbarung",
      blocks: [
        "Diese Bedingungen sind eine Vereinbarung zwischen dir und {operator}, {address} („wir“), dem Betreiber von CoinsLite. Mit dem Erstellen eines Kontos akzeptierst du sie zusammen mit der Datenschutzerklärung. Du musst mindestens 16 Jahre alt sein.",
      ],
    },
    {
      id: "service",
      heading: "Der Dienst und seine Tarife",
      blocks: [
        "Mit CoinsLite erfasst du die Münzen, Banknoten und Briefmarken, die du besitzt, ordnest sie und behältst im Blick, was du bezahlt hast und was sie wert sind.",
        [
          "Gratis-Tarif: bis zu {limit} Objekte, gezählt als Objekte, unabhängig von ihrer Anzahl, und der Export als CSV.",
          "Premium: unbegrenzt viele Objekte, dazu der Versicherungsbericht, der Export als PDF und Etiketten zum Drucken. Es wird monatlich oder jährlich verkauft, zu den Preisen, die auf unserer Website und beim Umstieg in der App angezeigt werden.",
        ],
        "Premium wird über Polar verkauft, das als Händler (Merchant of Record) auftritt: Polar ist der Verkäufer, an den du zahlst, wickelt Zahlung und Steuern ab, und für den Kauf gelten Polars eigene Bedingungen.",
      ],
    },
    {
      id: "billing",
      heading: "Verlängerung und Kündigung",
      blocks: [
        [
          "Premium verlängert sich am Ende jedes Monats oder Jahres automatisch, bis du kündigst.",
          "Du kannst jederzeit auf der Kontoseite kündigen. Premium bleibt dann bis zum Ende des bezahlten Zeitraums aktiv und verlängert sich nicht.",
          "Erstattungen und dein Widerrufsrecht regelt Polar als Verkäufer, nach seinen Bedingungen und dem für dich geltenden Verbraucherrecht.",
          "Ändern wir den Preis von Premium, informieren wir dich, bevor der neue Preis für dein Abonnement gilt, damit du vorher kündigen kannst.",
          "Endet Premium, kehrst du zum Gratis-Tarif zurück. Nichts geht verloren: Alle Objekte bleiben sichtbar und bearbeitbar, auch über {limit} Objekte hinaus. Du kannst nur keine neuen Objekte hinzufügen, solange du mehr als {limit} hast.",
        ],
      ],
    },
    {
      id: "use",
      heading: "Zulässige Nutzung",
      blocks: [
        "Nutze CoinsLite rechtmäßig und für deine eigene Sammlung. Du darfst nicht:",
        [
          "Inhalte hochladen, die du nicht verwenden darfst oder die rechtswidrig oder anstößig sind;",
          "versuchen, auf Daten anderer zuzugreifen oder Grenzen, Tarife oder Sicherheitsmaßnahmen zu umgehen;",
          "den Dienst überlasten oder den Katalog automatisiert in großem Umfang kopieren;",
          "den Zugang zum Dienst weiterverkaufen oder teilen.",
        ],
        "Verstößt ein Konto gegen diese Regeln, können wir es sperren oder schließen. Sofern weder Gesetz noch eine akute Gefahr entgegenstehen, informieren wir dich vorher und geben dir Gelegenheit zur Stellungnahme.",
      ],
    },
    {
      id: "content",
      heading: "Deine Inhalte",
      blocks: [
        "Was du einträgst und die Fotos, die du hinzufügst, bleiben deine. Du erlaubst uns, sie zu speichern, zu verarbeiten und dir anzuzeigen, nur soweit es für den Betrieb von CoinsLite nötig ist, etwa um deine Summen zu berechnen, die Berichte zu erstellen, die du anforderst, und, wenn du den Scanner nutzt, deine Fotos analysieren zu lassen. Wir veröffentlichen deine Inhalte nicht und nutzen sie für nichts anderes.",
        "Teilst du ein Album oder ein Set per Link, entscheidest du dich, diesen Teil deiner Sammlung allen zu zeigen, die den Link haben, wie die Datenschutzerklärung es beschreibt, und du bist dafür verantwortlich, was du teilst und wem du den Link gibst. Du kannst das Teilen jederzeit beenden.",
      ],
    },
    {
      id: "catalog",
      heading: "Der Katalog",
      blocks: [
        "Der Katalog wird von CoinsLite aus Quellen aufgebaut, deren Lizenzen das erlauben, etwa gemeinfreie Daten und amtliche Listen, ergänzt um unsere eigene Redaktion. Quelle, Urheber und Lizenz werden genannt, wo die Lizenz es verlangt. Du darfst den Katalog nutzen, um deine eigene Sammlung zu erfassen; seine Texte und Bilder verbleiben bei uns und den genannten Rechteinhabern. Angaben im Katalog können Fehler enthalten: Sag uns Bescheid, wenn du einen findest.",
      ],
    },
    {
      id: "values",
      heading: "Werte und Berichte",
      blocks: [
        [
          "Kaufpreise und Marktwerte sind deine eigenen Zahlen. Wir prüfen sie nicht.",
          "Spotpreise stammen von einem externen Anbieter, werden regelmäßig aktualisiert und sind nur Richtwerte. Sie können verzögert oder falsch sein, und der Metallwert ist nur eine Berechnung daraus: Gewicht × Feinheit × Spotpreis × Anzahl.",
          "Der Versicherungsbericht und die Exporte führen die Werte auf, die du gewählt hast. Sie sind kein Gutachten und keine Bewertung und keine Finanzberatung. Was deine Versicherung anerkennt, entscheidet sie.",
        ],
      ],
    },
    {
      id: "scanner",
      heading: "Der Scanner",
      blocks: [
        "Der Scanner, eine Beta in Premium, schlägt vor, welche Münze oder Banknote deine Fotos zeigen und welche Erhaltung sie hat. Vorschläge können falsch sein, deshalb werden sie dir immer zur Prüfung und Korrektur angezeigt, bevor etwas gespeichert wird.",
      ],
    },
    {
      id: "availability",
      heading: "Verfügbarkeit",
      blocks: [
        "Wir arbeiten daran, dass CoinsLite verfügbar ist und deine Daten sicher sind, können aber nicht versprechen, dass der Dienst immer verfügbar oder fehlerfrei ist. Wir können Funktionen ändern, hinzufügen oder entfernen. Sollten wir den Dienst je einstellen, informieren wir dich mindestens 30 Tage vorher, damit du eine Kopie deiner Daten anfordern kannst.",
      ],
    },
    {
      id: "liability",
      heading: "Haftung",
      blocks: [
        "Wir haften für Schäden, die wir vorsätzlich oder grob fahrlässig verursachen, und für alles, was das Gesetz uns nicht auszuschließen erlaubt. Im Übrigen haften wir nicht für mittelbare Schäden, und unsere Haftung ist insgesamt auf den Betrag begrenzt, den du uns in den 12 Monaten vor dem Anspruch gezahlt hast. Nichts in diesen Bedingungen schränkt deine Rechte als Verbraucher ein.",
      ],
    },
    {
      id: "ending",
      heading: "Ende der Vereinbarung",
      blocks: [
        "Du kannst jederzeit aufhören, indem du dein Konto auf der Kontoseite löschst. Damit endet ein Abonnement, das sich sonst verlängern würde, und deine Daten werden gelöscht, wie die Datenschutzerklärung es beschreibt.",
      ],
    },
    {
      id: "changes",
      heading: "Änderungen dieser Bedingungen",
      blocks: [
        "Wir können diese Bedingungen aktualisieren. Über wichtige Änderungen informieren wir dich vorher per E-Mail oder in der App. Bist du nicht einverstanden, kannst du dein Konto vorher löschen.",
      ],
    },
    {
      id: "law",
      heading: "Anwendbares Recht",
      blocks: [
        "Für diese Bedingungen gilt das Recht von {law}. Bist du Verbraucher, behältst du den Schutz der zwingenden Vorschriften des Landes, in dem du lebst, und kannst dort klagen.",
      ],
    },
    {
      id: "contact",
      heading: "Kontakt",
      blocks: ["{operator}, {address}. E-Mail: {email}."],
    },
  ],
} satisfies LegalText;
