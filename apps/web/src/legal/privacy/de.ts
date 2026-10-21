import type { LegalText } from "../types";

export default {
  title: "Datenschutzerklärung",
  description:
    "Was CoinsLite über dich und deine Sammlung speichert, warum, wer es verarbeitet, wie lange es aufbewahrt wird und welche Rechte du hast.",
  sections: [
    {
      id: "who",
      heading: "Wer wir sind",
      blocks: [
        "CoinsLite ist eine Web-App, in der du die Münzen, Banknoten und Briefmarken erfasst, die du besitzt. Sie wird betrieben von {operator}, {address} („wir“). Wir sind Verantwortliche für die hier beschriebenen personenbezogenen Daten. Für alle Fragen zu dieser Erklärung oder zu deinen Daten schreib an {email}.",
      ],
    },
    {
      id: "data",
      heading: "Was wir speichern",
      blocks: [
        [
          "Dein Konto: deine E-Mail-Adresse, dein Anzeigename, die Sprache und Heimatwährung, die du wählst, wann du diese Bedingungen akzeptiert hast, wann du dich zuletzt angemeldet hast, welche Versionshinweise du gesehen hast und, falls du sie für den Versicherungsbericht einträgst, dein vollständiger Name, Anschrift, Postleitzahl, Ort, Land und Telefonnummer.",
          "Deine Sammlung: deine Objekte mit allem, was du dazu einträgst (beschreibende Angaben, Erhaltung, Anzahl, Kaufpreis, Marktwert, Kaufdatum und Bezugsquelle, Notizen), deine Alben und die Fotos, die du hinzufügst.",
          "Anmeldedaten: ein Hash deines Passworts, falls du eines verwendest, deine Anmeldesitzungen, kurzlebige Codes und Links, die wir dir per E-Mail senden, und ein Zähler fehlgeschlagener Anmeldeversuche. Meldest du dich mit Google an, erhalten wir deine E-Mail-Adresse, ob Google sie bestätigt hat, deinen Namen und die Adresse deines Profilbilds.",
          "Dein Tarif: ob du den Gratis-Tarif oder Premium hast, und bei Premium Laufzeit, Preis, Währung und Ende des aktuellen Zeitraums des Abonnements, wie Polar sie meldet.",
          "Feedback: die Nachrichten, die du uns von der Kontoseite aus sendest, mit deiner E-Mail-Adresse und Konto-ID.",
          "Technische Daten: deine IP-Adresse und Angaben zu deinem Browser erreichen unsere Hosting-Anbieter mit jeder Anfrage und können in deren Protokollen erscheinen.",
          "Nutzungsstatistik: welche Seiten der App und dieser Website aufgerufen werden, die Website, die dorthin verlinkt hat, dein Browser, Betriebssystem und Gerätetyp sowie dein ungefährer Standort (Land, Region und Stadt), ermittelt aus deiner IP-Adresse. Sie wird ohne Cookies und ohne dein Konto erfasst, und die Seitenadressen lassen die IDs deiner Objekte und Alben, Suchbegriffe und Anmeldecodes weg.",
        ],
        "Wir fragen nicht nach sensiblen Daten wie Gesundheit oder Religion und möchten sie auch nicht haben. Bitte beschränke deine Notizen zu Objekten auf die Objekte.",
      ],
    },
    {
      id: "purposes",
      heading: "Wozu wir sie nutzen und auf welcher Rechtsgrundlage",
      blocks: [
        [
          "Um CoinsLite nach unserer Vereinbarung mit dir bereitzustellen (Vertragserfüllung): dein Konto, deine Sammlung und ihre Summen, die Berichte und Exporte, die du anforderst, die E-Mails, die dich anmelden oder eine Änderung bestätigen, und Premium, wenn du es kaufst.",
          "Um CoinsLite sicher und funktionsfähig zu halten (unser berechtigtes Interesse): fehlgeschlagene Anmeldungen begrenzen und wie schnell Uploads und Nachrichten gesendet werden können, Fehler finden und beheben, Missbrauch verhindern.",
          "Um zu erfahren, welche Teile von CoinsLite genutzt werden, damit wir sie verbessern können (unser berechtigtes Interesse): Nutzungsstatistik, die wir über OpenPanel ohne Cookies erfassen, ohne dass wir wissen, wer du bist. Ein Inhaltsblocker in deinem Browser verhindert sie.",
          "Um dir zu antworten (unser berechtigtes Interesse): Antworten auf Feedback und Anfragen.",
          "Um rechtliche Pflichten zu erfüllen (rechtliche Verpflichtung): etwa Unterlagen aufzubewahren, die wir aufbewahren müssen.",
        ],
        "Wir verkaufen deine Daten nicht, zeigen keine Werbung und nutzen deine Daten weder für Profiling noch für Marketing. Unsere Nutzungsstatistik identifiziert dich nicht, und nichts verfolgt dich auf anderen Websites.",
      ],
    },
    {
      id: "processors",
      heading: "Wer sie für uns verarbeitet",
      blocks: [
        "Wir nutzen diese Anbieter. Jeder erhält nur, was er für seine Aufgabe braucht:",
        [
          "Convex: betreibt unser Backend, die Datenbank und die gespeicherten Dateien, auch deine Fotos. Dort liegen alle oben genannten Daten.",
          "Vercel: betreibt die App und diese Website. Es verarbeitet jede Seitenanfrage, mit deiner IP-Adresse und Angaben zu deinem Browser.",
          "Resend: versendet unsere E-Mails. Es erhält deine E-Mail-Adresse und die Nachricht, etwa einen Anmeldecode oder einen Bestätigungslink.",
          "Google: nur, wenn du dich mit Google anmeldest, nach Googles eigener Datenschutzerklärung.",
          "Polar: verkauft Premium als Händler (Merchant of Record). Wenn du auf Premium umsteigst, erhält Polar deine E-Mail-Adresse, deine Konto-ID und deine IP-Adresse (um Währung und Steuer zu bestimmen) und erhebt deine Zahlungsdaten direkt. Polar ist für die Zahlung selbst verantwortlich, nach seiner eigenen Datenschutzerklärung.",
          "Anthropic: nur, wenn du den Münzscanner nutzt (eine Beta in Premium), erhält Anthropic die beiden Fotos, die du aufnimmst, und die infrage kommenden Katalogeinträge, um vorzuschlagen, welche Münze es ist. Nichts, was dich identifiziert, wird übermittelt.",
          "Sentry: erfasst Fehler in der App und, für eine Stichprobe von Seiten, wie lange sie zum Laden brauchen, damit wir Probleme finden und beheben können. Mit jedem Bericht erhält es die Seitenadresse (ohne Abfrageparameter), Angaben zu deinem Browser und Gerät sowie deinen ungefähren Standort. Es speichert deine IP-Adresse nicht, die Berichte nennen dich nie, und die Daten liegen in Deutschland.",
          "OpenPanel: zählt, wie die App und diese Website genutzt werden. Bei jedem Seitenaufruf erhält es den Seitentitel und die Seitenadresse (ohne die IDs deiner Objekte und Alben, Suchbegriffe oder Anmeldecodes), die verweisende Website, Angaben zu deinem Browser und Gerät sowie deine IP-Adresse. Es ermittelt daraus deinen ungefähren Standort und eine Besucherkennung, die sich täglich ändert, und verwirft dann die IP-Adresse. Es setzt keine Cookies und speichert die Daten in Deutschland.",
          "MetalpriceAPI: liefert Spotpreise und Wechselkurse. Unsere Anfragen enthalten keine personenbezogenen Daten.",
        ],
      ],
    },
    {
      id: "transfers",
      heading: "Übermittlung in andere Länder",
      blocks: [
        "Einige dieser Anbieter haben ihren Sitz in den USA oder anderen Ländern außerhalb des Europäischen Wirtschaftsraums oder speichern Daten dort. Verlassen Daten den EWR, ist die Übermittlung durch Garantien abgesichert, die die DSGVO anerkennt, etwa einen Angemessenheitsbeschluss oder die Standardvertragsklauseln der Europäischen Kommission. Eine Kopie erhältst du über {email}.",
      ],
    },
    {
      id: "cookies",
      heading: "Cookies und lokaler Speicher",
      blocks: [
        "CoinsLite speichert nur, was es zum Funktionieren braucht. Nichts davon dient Werbung oder Tracking, und unsere Nutzungsstatistik setzt keine Cookies, daher fragen wir nicht nach einer Einwilligung zu Cookies.",
        [
          "Anmeldung: Die Cookies __convexAuthJWT und __convexAuthRefreshToken halten dich angemeldet, __convexAuthOAuthVerifier besteht, während du dich mit Google anmeldest. Passende Einträge, die mit __convexAuth beginnen, liegen im lokalen Speicher deines Browsers.",
          "coinslite-signed-in (Cookie, ein Jahr): teilt dieser Website mit, dass du angemeldet bist, damit sie die App statt der Startseite öffnet.",
          "coinslite-language (Cookie, ein Jahr): die Sprache, die du gewählt hast, in der App und auf dieser Website.",
          "Next-Locale (Cookie, bis du den Browser schließt): die Sprache der angezeigten Seite.",
          "theme (lokaler Speicher): hell, dunkel oder wie dein System.",
          "collection.display (lokaler Speicher): Liste oder Raster und wie viele Objekte eine Seite zeigt.",
          "coinslite:catalog-recent (lokaler Speicher): die zuletzt gewählten Katalogeinträge, bis zu sechs je Objektart.",
          "coinslite-email-change (lokaler Speicher): eine Änderung der E-Mail-Adresse, die auf deine Bestätigung wartet; wird danach entfernt.",
        ],
        "Der lokale Speicher bleibt auf deinem Gerät. Du kannst ihn und die Cookies jederzeit in deinem Browser löschen; danach bist du abgemeldet und deine Einstellungen sind zurückgesetzt.",
      ],
    },
    {
      id: "retention",
      heading: "Wie lange wir sie aufbewahren",
      blocks: [
        "Wir bewahren deine Daten auf, solange du ein Konto hast.",
        [
          "Löschst du dein Konto (Konto, dann Konto löschen), werden dein Profil, deine Anmeldemethoden und Sitzungen, deine Objekte, Alben und Fotos und die Verbindung zu deinem Abonnement endgültig entfernt. Das meiste verschwindet sofort; der Rest einer großen Sammlung folgt kurz darauf im Hintergrund.",
          "Was bleibt, ist ein Vermerk, dass eine Konto-ID gelöscht wurde, der niemanden nennt, damit eine verspätete Meldung von Polar dazu das betreffende Abonnement beendet.",
          "Fotos, die du hochlädst, aber nie speicherst, etwa aus einem Scan, den du verwirfst, werden innerhalb weniger Stunden gelöscht.",
          "Gelöschte Daten können bis zu {backupDays} Tage in den Sicherungen unseres Backends und bis zu {logDays} Tage in den Protokollen unserer Hosting-Anbieter verbleiben; danach sind sie fort.",
          "Feedback-E-Mails bleiben in unserem Postfach, bis wir sie löschen. Polar bewahrt Zahlungsunterlagen so lange auf, wie das Gesetz es verlangt.",
        ],
      ],
    },
    {
      id: "rights",
      heading: "Deine Rechte",
      blocks: [
        "Nach der DSGVO und ähnlichen Gesetzen hast du diese Rechte. Die meisten kannst du selbst in der App ausüben; für den Rest schreib an {email}, und wir antworten innerhalb eines Monats.",
        [
          "Auskunft: sehen, was wir über dich gespeichert haben. Deine Kontoseite und deine Sammlung zeigen es, und auf Anfrage senden wir dir eine vollständige Kopie.",
          "Berichtigung: ändere deine Angaben auf der Kontoseite und deine Objekte in der App.",
          "Löschung: lösche dein Konto und alles darin auf der Kontoseite.",
          "Datenübertragbarkeit: verlange eine Kopie deiner Daten in einem maschinenlesbaren Format. Das ist in jedem Tarif kostenlos. Mit Premium kannst du deine Sammlung außerdem selbst als CSV exportieren.",
          "Widerspruch: widersprich dem, was wir auf Grundlage unserer berechtigten Interessen tun.",
          "Widerruf der Einwilligung: wo wir uns auf deine Einwilligung stützen, kannst du sie jederzeit widerrufen, ohne dass das zuvor Geschehene berührt wird.",
          "Beschwerde: beschwere dich bei der Aufsichtsbehörde, {authority}, oder bei der Behörde an deinem Wohn- oder Arbeitsort.",
        ],
      ],
    },
    {
      id: "security",
      heading: "Sicherheit",
      blocks: [
        "Daten werden verschlüsselt übertragen. Passwörter werden nur als Hashes gespeichert. Deine Fotos sind privat: Sie werden nur dir gezeigt, über Links, die innerhalb eines Tages ungültig werden. Nur wenige Administratoren können Kontodaten wie Namen, E-Mail-Adressen, Tarife und die Zahl der Objekte eines Kontos sehen, und nur, um den Dienst zu betreiben.",
      ],
    },
    {
      id: "children",
      heading: "Kinder",
      blocks: [
        "CoinsLite ist nicht für Kinder gedacht. Du musst mindestens 16 Jahre alt sein, um ein Konto zu erstellen. Glaubst du, dass ein Kind uns Daten gegeben hat, schreib an {email}, und wir löschen sie.",
      ],
    },
    {
      id: "changes",
      heading: "Änderungen dieser Erklärung",
      blocks: [
        "Wenn wir diese Erklärung ändern, aktualisieren wir das Datum oben. Betrifft eine Änderung, wie wir deine Daten nutzen, informieren wir dich vorher per E-Mail oder in der App.",
      ],
    },
  ],
} satisfies LegalText;
