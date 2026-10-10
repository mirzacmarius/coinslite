import type { Dictionary } from "../dictionary";

export default {
  meta: {
    title:
      "CoinsLite: evidența clară a monedelor, bancnotelor și timbrelor tale",
    description:
      "Înregistrează monedele, bancnotele și timbrele pe care le ai, păstrează-le starea și fotografiile și vezi cât valorează colecția ta în propria monedă. Gratuit pentru până la {limit} de obiecte.",
    imageAlt: "CoinsLite, pentru colecționarii de monede, bancnote și timbre",
  },
  header: {
    home: "Pagina principală CoinsLite",
    signIn: "Conectare",
    createAccount: "Creează cont",
    language: "Limbă",
    features: "Funcții",
    plans: "Planuri",
  },
  hero: {
    eyebrow: "Pentru colecționarii de monede, bancnote și timbre",
    title: "Colecția ta, înregistrată cum trebuie și evaluată în moneda ta",
    lead: "CoinsLite ține o evidență clară a ceea ce ai: ce este fiecare obiect, starea lui, cât ai plătit și cât valorează azi. Alege obiecte din catalog cu câteva clicuri sau introdu-le singur.",
    primary: "Creează un cont gratuit",
    secondary: "Conectează-te",
    note: "Gratuit pentru până la {limit} de obiecte. Nu ai nevoie de card.",
  },
  preview: {
    label: "Un exemplu de colecție",
    title: "Colecție",
    items: "{count} obiecte",
    marketValue: "Valoare de piață",
    gainLoss: "Câștig/pierdere",
    types: { coin: "Monedă", banknote: "Bancnotă", stamp: "Timbru" },
  },
  features: {
    title: "Ce face CoinsLite",
    lead: "Tot ce vezi mai jos există deja în aplicație, în fiecare limbă.",
    catalog: {
      title: "Din catalog sau de mână",
      text: "Alege o intrare de catalog și datele ei se completează singure: țara, anii, valoarea nominală, seria și metalul. Sau introdu obiectul singur; timbrele se introduc mereu de mână.",
    },
    grades: {
      title: "Starea, separat de batere",
      text: "Evaluează fiecare obiect pe scara potrivită: Sheldon 1–70, scara norvegiană 0–3, stările europene și internaționale sau cele pentru timbre. Baterea (circulație, necirculat lucios sau proof) se înregistrează separat.",
    },
    albums: {
      title: "Albume",
      text: "Grupează obiectele în albume, de exemplu o serie pe care o urmărești sau o călătorie. Fiecare obiect stă în cel mult un album.",
    },
    photos: {
      title: "Fotografii pe ambele fețe",
      text: "Adaugă o fotografie a aversului și una a reversului. Fotografiile sunt păstrate privat și doar tu le poți vedea.",
    },
    totals: {
      title: "Totaluri în moneda ta de bază",
      text: "Prețul de achiziție, valoarea de piață și câștigul/pierderea pentru întreaga colecție, toate în moneda pe care o alegi.",
    },
    spot: {
      title: "Prețuri spot pentru aur și argint",
      text: "Prețurile spot se actualizează regulat, cu ora fiecărei actualizări, iar valoarea metalului din monedele tale le urmează.",
    },
    sets: {
      title: "Seturi și completare",
      text: "Vezi o serie din catalog ca set: cât din ea ai și ce intrări îți lipsesc încă.",
    },
    insurance: {
      title: "Raport de asigurare",
      text: "Un PDF pentru asigurător cu obiectele alese, valorile lor și datele tale de contact. Premium.",
    },
    exports: {
      title: "Export PDF și CSV",
      text: "Colecția ta, sau orice parte filtrată a ei, ca PDF de tipărit sau CSV pentru un tabel. Premium.",
    },
    languages: {
      title: "Cinci limbi",
      text: "Engleză, norvegiană (bokmål), germană, franceză și română, cu numere și date scrise așa cum le scrie limba ta.",
    },
    noAds: {
      title: "Fără reclame",
      text: "Fără reclame în niciun plan și fără scripturi de analiză sau urmărire.",
    },
  },
  plans: {
    title: "Planuri",
    lead: "Începe gratuit. Treci la Premium când colecția ta crește.",
    free: {
      name: "Plan gratuit",
      price: "Gratuit",
      summary: "Până la {limit} de obiecte, indiferent de cantitate.",
      features: [
        "Catalogul, albumele și fotografiile",
        "Starea, baterea și seturile",
        "Totaluri și prețuri spot",
      ],
      cta: "Creează un cont gratuit",
    },
    premium: {
      name: "Premium",
      monthly: "{price} pe lună",
      yearly: "sau {price} pe an",
      summary: "Obiecte nelimitate, plus rapoartele.",
      features: [
        "Obiecte nelimitate",
        "Raportul de asigurare",
        "Export PDF și CSV",
        "Tot ce oferă planul gratuit",
      ],
      cta: "Începe cu un cont gratuit",
    },
    pricesTitle: "Prețurile Premium",
    currency: "Moneda",
    month: "Lunar",
    year: "Anual",
    pricesNote:
      "Plătești în moneda locală când Premium are un preț în ea, altfel în euro. Plata este gestionată de Polar.",
    cancelNote:
      "Anulează oricând: Premium rămâne activ până la sfârșitul perioadei plătite. Înapoi pe planul gratuit, toate obiectele rămân și pot fi editate în continuare; doar nu mai poți adăuga altele cât timp ai peste {limit}.",
  },
  closing: {
    title: "Începe-ți colecția azi",
    text: "Crearea unui cont durează un minut, iar primele {limit} de obiecte sunt gratuite.",
  },
  footer: {
    privacy: "Politica de confidențialitate",
    terms: "Termeni de utilizare",
  },
  notFound: {
    title: "Pagina nu a fost găsită",
    description:
      "Nu există nimic la această adresă. Poate a fost mutată sau linkul este greșit.",
    home: "Mergi la pagina principală",
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
