import type { Dictionary } from "../dictionary";

export default {
  meta: {
    title: "CoinsLite : un inventaire clair de vos pièces, billets et timbres",
    description:
      "Enregistrez les pièces, billets et timbres que vous possédez, gardez leur état et leurs photos, et voyez ce que vaut votre collection dans votre propre devise. Gratuit jusqu’à {limit} objets.",
    imageAlt:
      "CoinsLite, pour les collectionneurs de pièces, billets et timbres",
  },
  header: {
    home: "Page d’accueil de CoinsLite",
    signIn: "Se connecter",
    createAccount: "Créer un compte",
    language: "Langue",
    features: "Fonctionnalités",
    plans: "Formules",
  },
  hero: {
    eyebrow: "Pour les collectionneurs de pièces, billets et timbres",
    titleLead: "Votre collection,",
    titleRest: "bien répertoriée et estimée dans votre devise",
    lead: "CoinsLite tient un inventaire clair de ce que vous possédez : ce qu’est chaque objet, son état, ce que vous l’avez payé et ce qu’il vaut aujourd’hui. Choisissez vos objets dans le catalogue en quelques clics, ou saisissez-les vous-même.",
    primary: "Créer un compte gratuit",
    secondary: "Se connecter",
    note: "Gratuit jusqu’à {limit} objets. Aucune carte bancaire requise.",
  },
  preview: {
    label: "Un exemple de collection",
    title: "Collection",
    items: "{count} objets",
    marketValue: "Valeur de marché",
    gainLoss: "Gain/perte",
    types: { coin: "Pièce", banknote: "Billet", stamp: "Timbre" },
  },
  features: {
    title: "Ce que fait CoinsLite",
    lead: "Tout ce qui suit existe déjà dans l’application, dans chaque langue.",
    catalog: {
      title: "Depuis le catalogue ou à la main",
      text: "Choisissez une entrée du catalogue et ses informations se remplissent : pays, années, valeur faciale, série et métal. Ou saisissez l’objet vous-même ; les timbres se saisissent toujours à la main.",
    },
    grades: {
      title: "L’état, distinct de la frappe",
      text: "Notez l’état de chaque objet sur l’échelle qui lui convient : Sheldon 1–70, l’échelle norvégienne 0–3, les états européens et internationaux ou ceux des timbres. La frappe (circulation, brillant universel ou belle épreuve) est enregistrée à part.",
    },
    albums: {
      title: "Albums",
      text: "Regroupez vos objets en albums, par exemple une série que vous suivez ou un voyage. Chaque objet appartient à un album au plus.",
    },
    photos: {
      title: "Des photos des deux faces",
      text: "Ajoutez une photo de l’avers et du revers. Les photos sont stockées en privé et vous seul pouvez les voir.",
    },
    totals: {
      title: "Des totaux dans votre devise de référence",
      text: "Prix d’achat, valeur de marché et gain/perte sur toute votre collection, le tout dans la devise que vous choisissez.",
    },
    spot: {
      title: "Les cours spot de l’or et de l’argent",
      text: "Les cours spot sont actualisés régulièrement, avec l’heure de chaque mise à jour, et la valeur du métal de vos pièces les suit.",
    },
    sets: {
      title: "Ensembles et complétion",
      text: "Affichez une série du catalogue comme un ensemble : ce que vous en possédez et les entrées qui vous manquent encore.",
    },
    insurance: {
      title: "Rapport d’assurance",
      text: "Un PDF pour votre assureur avec les objets de votre choix, leurs valeurs et vos coordonnées. Premium.",
    },
    exports: {
      title: "Export PDF et CSV",
      text: "Votre collection, ou toute partie filtrée, en PDF à imprimer ou en CSV pour un tableur. Premium.",
    },
    languages: {
      title: "Cinq langues",
      text: "Anglais, norvégien (bokmål), allemand, français et roumain, avec les nombres et les dates écrits comme votre langue les écrit.",
    },
    noAds: {
      title: "Sans publicité",
      text: "Aucune publicité, quelle que soit la formule, et aucun script d’analyse ou de suivi.",
    },
  },
  plans: {
    title: "Formules",
    lead: "Commencez gratuitement. Passez à Premium quand votre collection grandit.",
    free: {
      name: "Formule gratuite",
      price: "Gratuit",
      summary: "Jusqu’à {limit} objets, quelle que soit leur quantité.",
      features: [
        "Le catalogue, les albums et les photos",
        "L’état, la frappe et les ensembles",
        "Les totaux et les cours spot",
      ],
      cta: "Créer un compte gratuit",
    },
    premium: {
      name: "Premium",
      monthly: "{price} par mois",
      yearly: "ou {price} par an",
      summary: "Des objets en nombre illimité, et les rapports en plus.",
      features: [
        "Objets en nombre illimité",
        "Le rapport d’assurance",
        "Export PDF et CSV",
        "Tout ce que propose la formule gratuite",
      ],
      cta: "Commencer avec un compte gratuit",
    },
    pricesTitle: "Tarifs de Premium",
    currency: "Devise",
    month: "Mensuel",
    year: "Annuel",
    pricesNote:
      "Vous payez dans votre devise locale quand Premium y a un prix, sinon en euros. Le paiement est géré par Polar.",
    cancelNote:
      "Résiliez quand vous voulez : Premium reste actif jusqu’à la fin de la période payée. De retour à la formule gratuite, tous vos objets restent et restent modifiables ; vous ne pouvez simplement plus en ajouter tant que vous en avez plus de {limit}.",
  },
  closing: {
    title: "Commencez votre collection dès aujourd’hui",
    text: "Créer un compte prend une minute, et vos {limit} premiers objets sont gratuits.",
  },
  footer: {
    product: "Produit",
    account: "Compte",
    legal: "Mentions légales",
    privacy: "Politique de confidentialité",
    terms: "Conditions d’utilisation",
  },
  notFound: {
    title: "Page introuvable",
    description:
      "Il n’y a rien à cette adresse. La page a peut-être été déplacée, ou le lien est erroné.",
    home: "Aller à l’accueil",
  },
  legal: {
    updated: "Dernière mise à jour le {date}",
    draft:
      "Brouillon : certaines informations seront complétées avant le lancement de CoinsLite. Elles sont signalées dans le texte.",
    governs:
      "Ceci est une traduction. En cas de divergence avec la {english}, la version anglaise prévaut.",
    englishVersion: "version anglaise",
    contents: "Sommaire",
    placeholders: {
      operator: "nom légal de l’exploitant",
      address: "adresse de l’exploitant",
      email: "adresse e-mail de contact",
      law: "droit applicable",
      authority: "autorité de contrôle",
      days: "nombre",
    },
  },
} satisfies Dictionary;
