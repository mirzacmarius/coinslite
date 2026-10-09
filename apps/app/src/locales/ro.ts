import type { Dictionary } from "./types";

export default {
  common: {
    language: "Limbă",
    appDescription:
      "Înregistrează monedele, bancnotele și timbrele pe care le deții.",
  },
  nav: {
    overview: "Prezentare",
    collection: "Colecție",
    catalog: "Catalog",
    albums: "Albume",
    account: "Cont",
  },
  shell: {
    skipToContent: "Sari la conținut",
    primaryNavigation: "Meniu principal",
    signOut: "Deconectare",
    workspaceMenu: "Cont și preferințe",
    plans: "Planuri",
    appearance: "Aspect",
    appearanceLight: "Luminos",
    appearanceDark: "Întunecat",
    appearanceSystem: "Sistem",
    more: "Mai mult",
  },
  placeholder: {
    title: "Nimic aici încă",
    description: "Această parte din CoinsLite vine în curând.",
  },
  items: {
    add: "Adaugă obiect",
    new: "Obiect nou",
    title: "Titlu",
    titlePlaceholder: "Titlu, de ex. 10 lei 2008",
    notesPlaceholder: "Adaugă note…",
    type: "Tip de obiect",
    types: {
      coin: "Monedă",
      banknote: "Bancnotă",
      stamp: "Timbru",
    },
    country: "Țară",
    setCountry: "Alege țara",
    year: "An",
    denomination: "Valoare nominală",
    quantity: "Cantitate",
    purchasePrice: "Preț de achiziție",
    marketValue: "Valoare de piață",
    perPiece: "pe bucată",
    purchaseDate: "Data achiziției",
    source: "Proveniență",
    sourcePlaceholder: "De unde l-ai obținut",
    notes: "Note",
    moreDetails: "Mai multe detalii",
    createMore: "Adaugă mai multe",
    cancel: "Anulează",
    close: "Închide",
    added: "Obiect adăugat în colecție",
    emptyTitle: "Colecția ta e goală",
    emptyDescription:
      "Adaugă prima monedă, bancnotă sau primul timbru ca să-l vezi aici.",
    showMore: "Arată mai multe",
    notFoundTitle: "Obiectul nu a fost găsit",
    notFound: "Acest obiect nu există sau nu face parte din colecția ta.",
    backToCollection: "Înapoi la colecție",
    details: "Detalii",
    purchase: "Achiziție",
    noMatches: "Niciun rezultat",
    errors: {
      titleRequired: "Dă-i obiectului un titlu.",
      quantity: "Folosește un număr întreg de cel puțin 1.",
      year: "Introdu un an, de ex. 1881.",
      amount: "Introdu o sumă, de ex. 75,50.",
      date: "Alege o dată care nu e în viitor.",
      failed: "Obiectul nu a putut fi adăugat. Încearcă din nou.",
    },
  },
  auth: {
    signIn: {
      pageTitle: "Conectare",
      title: "Conectează-te la colecția ta",
      submit: "Conectează-te",
      forgotPassword: "Ai uitat parola?",
      noAccount: "Nou pe CoinsLite?",
      createAccount: "Creează un cont",
      failed:
        "Adresa de e-mail și parola nu se potrivesc. Verifică-le sau resetează parola.",
      verifyToContinue: "Confirmă adresa de e-mail ca să termini conectarea.",
    },
    signUp: {
      pageTitle: "Creează cont",
      title: "Creează-ți contul",
      description:
        "Înregistrează monedele, bancnotele și timbrele pe care le ai.",
      submit: "Creează contul",
      homeCurrencyHint:
        "Valorile din colecția ta sunt afișate în această monedă.",
      acceptTerms: "Accept {privacy} și {terms}",
      privacyPolicy: "politica de confidențialitate",
      termsOfUse: "termenii de utilizare",
      termsRequired:
        "Acceptă politica de confidențialitate și termenii de utilizare ca să continui.",
      haveAccount: "Ai deja un cont?",
      failed:
        "Nu am putut crea contul. Dacă ai deja unul, conectează-te cu parola, un link de conectare sau Google.",
    },
    fields: {
      email: "E-mail",
      password: "Parolă",
      newPassword: "Parolă nouă",
      homeCurrency: "Moneda de bază",
      passwordHint: "Cel puțin 8 caractere.",
      code: "Cod",
      emailInvalid: "Introdu o adresă de e-mail, de exemplu nume@exemplu.ro.",
      passwordTooShort: "Folosește cel puțin 8 caractere.",
      passwordRequired: "Introdu parola.",
      codeInvalid: "Introdu cele 8 cifre din e-mail.",
    },
    code: {
      title: "Verifică-ți e-mailul",
      description:
        "Am trimis un cod de 8 cifre la {email}. Expiră în 15 minute.",
      submit: "Confirmă e-mailul",
      resend: "Trimite un cod nou",
      resent: "Am trimis un cod nou la {email}.",
      differentEmail: "Folosește alt e-mail",
      failed: "Codul nu a funcționat. Verifică-l sau cere unul nou.",
    },
    verify: {
      pageTitle: "Confirmă e-mailul",
      title: "Confirmă adresa de e-mail",
      description:
        "Confirmă că {email} îți aparține ca să termini înregistrarea.",
      confirm: "Confirmă adresa de e-mail",
      failed:
        "Linkul a expirat sau a fost deja folosit. Conectează-te ca să primești un cod nou.",
      noLink:
        "Deschide linkul din e-mailul de confirmare sau conectează-te ca să primești un cod nou.",
    },
    reset: {
      pageTitle: "Resetează parola",
      title: "Resetează-ți parola",
      description: "Îți trimitem un cod pe e-mail ca să alegi o parolă nouă.",
      sendCode: "Trimite codul",
      codeSent:
        "Dacă {email} are un cont CoinsLite, i-am trimis un cod. Expiră în 15 minute.",
      newPasswordTitle: "Alege o parolă nouă",
      submit: "Salvează parola",
      failed: "Codul nu a funcționat sau a expirat. Cere unul nou.",
    },
    methods: {
      or: "sau",
      google: "Continuă cu Google",
      link: "Trimite-mi un link de conectare",
    },
    link: {
      pageTitle: "Conectare cu link",
      title: "Conectează-te cu un link",
      description:
        "Îți trimitem pe e-mail un link care te conectează. Nou pe CoinsLite? Același link îți creează contul.",
      submit: "Trimite-mi un link",
      sentTitle: "Verifică-ți e-mailul",
      sent: "Am trimis un link de conectare la {email}. Funcționează o singură dată și expiră în 15 minute.",
      usePassword: "Folosește o parolă",
      failed:
        "Linkul de conectare a expirat sau a fost deja folosit. Cere unul nou.",
      confirmTitle: "Conectează-te la CoinsLite",
      confirmDescription: "Continuă ca {email}.",
      confirm: "Conectează-te",
    },
    welcome: {
      pageTitle: "Finalizează configurarea",
      title: "Finalizează configurarea contului",
      description:
        "Conectat ca {email}. Alege moneda de bază și acceptă termenii ca să începi.",
      submit: "Începe să folosești CoinsLite",
    },
    backToSignIn: "Înapoi la conectare",
    noMatches: "Niciun rezultat",
    failedGeneric: "Ceva nu a mers. Încearcă din nou.",
  },
  dashboard: {
    headerTitle: "Prezentare generală",
    headerDescription: "Colecția ta dintr-o privire.",
    bodyTitle: "Bun venit la CoinsLite",
    bodyDescription: "Colecția ta va apărea aici.",
  },
  settings: {
    title: "Setări",
    headerTitle: "Setări",
    headerDescription: "Gestionează setările contului tău.",
    avatar: {
      title: "Avatarul tău",
      description: "Acesta este avatarul tău. Apare în profilul tău.",
      uploadHint: "Apasă pe avatar pentru a încărca propria imagine.",
      resetButton: "Resetează",
    },
    deleteAccount: {
      title: "Șterge contul",
      description:
        "Șterge definitiv contul tău CoinsLite și tot conținutul lui.",
      warning: "Această acțiune nu poate fi anulată. Continuă cu atenție.",
      deleteButton: "Șterge contul",
      confirmButton: "Ești sigur?",
    },
    sidebar: {
      general: "General",
      billing: "Facturare",
    },
  },
} as const satisfies Dictionary;
