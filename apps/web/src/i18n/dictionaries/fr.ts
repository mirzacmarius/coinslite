import type { Dictionary } from "../dictionary";

export default {
  meta: {
    title: "CoinsLite : chaque pièce, billet et timbre, bien répertorié",
    description:
      "Enregistrez vos pièces, billets et timbres avec leur état, leur prix d’achat et ce qu’ils valent aujourd’hui, dans votre propre devise. Gratuit jusqu’à {limit} objets.",
    imageAlt:
      "CoinsLite : un médaillier dont un tiroir est ouvert, et les mots « Sachez exactement ce que vous avez »",
  },
  header: {
    home: "Page d’accueil de CoinsLite",
    skip: "Aller au contenu",
    signIn: "Se connecter",
    start: "Commencer gratuitement",
    startShort: "Commencer",
    language: "Langue",
    sections: "Rubriques",
    menu: "Sommaire",
    close: "Fermer",
    nav: {
      record: "Comment ça marche",
      sets: "Ensembles",
      insurance: "Assurance",
      plans: "Formules",
      questions: "Vos questions",
    },
  },
  hero: {
    kicker: "Pour les collectionneurs de pièces, billets et timbres",
    title: "Sachez exactement ce que vous avez.",
    lead: "CoinsLite tient le registre de chaque pièce, billet et timbre que vous possédez : ce que c’est, son état, ce que vous l’avez payé et ce qu’il vaut aujourd’hui, dans votre propre devise.",
    primary: "Commencer gratuitement",
    secondary: "Se connecter",
  },
  figure: {
    label:
      "Un médaillier, dessiné comme une illustration technique. Chacun de ses quatre tiroirs contient un ensemble : pièces de 2 euros, dollars Peace, billets et timbres. Une pièce occupe chaque alvéole que vous possédez ; les alvéoles vides sont ce qui manque encore. Un fichier posé dessus range une nouvelle fiche pour chaque objet ajouté.",
    names: {
      euro: "2 euros",
      notes: "Billets",
      stamps: "Timbres",
    },
    status: {
      opened: "Tiroir {name} ouvert : {held} sur {total}.",
      added: "Ajouté à {name} : {held} sur {total}.",
      closed:
        "Tous les tiroirs fermés : {held} sur {total} dans le médaillier.",
    },
  },
  statement: {
    lead: "La plupart des collections vivent à trois endroits à la fois : dans le médaillier, dans un tableur ouvert pour la dernière fois en 2019, et dans la mémoire du collectionneur.",
    turn: "Les pièces sont en sécurité. Ce que vous savez d’elles, non.",
    rest: "CoinsLite le consigne, objet par objet, pour que vous, votre assureur et votre famille puissiez le lire.",
  },
  record: {
    title: "Une pièce, enregistrée comme il faut",
    lead: "Voici ce que CoinsLite garde pour une seule pièce. Chaque champ est facultatif, et la plupart se remplissent tout seuls.",
    example: "Exemple de fiche",
    chapters: {
      catalog: {
        title: "Choisissez-la dans le catalogue",
        text: "Cherchez « Morgan 1921 » et choisissez l’entrée. Pays, série, valeur faciale, métal, poids et titre viennent avec. Absente du catalogue ? Saisissez-la vous-même ; les timbres le sont toujours.",
      },
      grade: {
        title: "Notez son état sur la bonne échelle",
        text: "Sheldon de 1 à 70 pour une pièce américaine, de 0 à 3 pour une norvégienne, de UNC à G pour la plupart des autres, et des échelles propres aux billets et aux timbres. La frappe est notée à part, et le numéro PCGS ou NGC d’une pièce sous coque l’accompagne.",
      },
      purchase: {
        title: "Notez ce que vous avez payé, et où",
        text: "Prix d’achat, date et provenance, pour chaque exemplaire. Un lot acheté d’un coup ? Renseignez l’achat sur tous les objets en une fois.",
      },
      photos: {
        title: "Photographiez les deux faces",
        text: "Avers et revers, plus six autres. Les photos sont stockées en privé et ne s’ouvrent que par des liens qui expirent dans l’heure.",
      },
      value: {
        title: "Sachez ce qu’elle vaut aujourd’hui",
        text: "Votre propre valeur de marché, estimée d’après les ventes que vous avez vues. Pour l’or et l’argent, la valeur du métal suit le cours spot d’elle-même.",
      },
    },
    card: {
      fields: {
        catalog: "Catalogue",
        grade: "État",
        strike: "Frappe",
        purchase: "Prix d’achat",
        source: "Achetée",
        photos: "Photos",
        market: "Valeur de marché",
        metal: "Valeur du métal",
        gain: "Gain/perte",
      },
      values: {
        catalog: "Argent, 26,73 g, 0,900",
        grade: "MS-63 sur l’échelle Sheldon",
        strike: "Circulation",
        source: "{date} · Salon numismatique, Oslo",
        photos: "Avers et revers",
        metal: "24,06 g d’argent fin × cours spot",
      },
    },
  },
  value: {
    title: "Ce qu’elle vaut, dans votre propre devise",
    text: "Les totaux de toute votre collection : ce que vous avez payé, ce qu’elle vaut aujourd’hui et le gain ou la perte entre les deux, le tout dans une seule devise de référence. Des graphiques montrent comment la valeur a évolué et où elle se trouve.",
    facts: {
      spot: {
        value: "15",
        text: "minutes entre deux mises à jour du cours spot de l’or et de l’argent, et chaque valeur du métal suit",
      },
      currencies: {
        value: "8",
        text: "devises de référence : NOK, SEK, DKK, EUR, RON, GBP, USD et CHF",
      },
      presets: {
        value: "16",
        text: "modèles de lingots qui renseignent poids et titre, du Krugerrand au Panda",
      },
      scales: {
        value: "5",
        text: "échelles de notation, des 70 points de Sheldon aux timbres, la frappe à part",
      },
    },
  },
  sets: {
    title: "Voyez ce qui manque",
    text: "Toute série du catalogue s’ouvre comme un ensemble : les millésimes que vous avez, ceux qui vous manquent, et où vous en êtes. Marquez les manques comme souhaités, ou ajoutez en une fois tout ce que vous possédez déjà d’un ensemble.",
    tray: {
      title: "{series}, de 1921 à 1935",
      count: "{held} sur {total} · {percent} %",
      held: "Possédé",
      missing: "Manquant",
      wanted: "Sur votre liste de souhaits",
    },
    note: "À titre d’exemple : le dollar Peace est l’un des ensembles du catalogue, avec chaque millésime et chaque atelier.",
  },
  insurance: {
    title: "Si le pire arrive, remettez la liste",
    text: "Le rapport d’assurance est un PDF exploitable par votre assureur : les objets de votre choix avec leur prix d’achat, leur valeur de marché et leur valeur du métal, la plus élevée comme valeur assurée, vos coordonnées et les totaux.",
    premium: "Premium",
    sheet: {
      title: "Rapport d’assurance",
      owner: "Vos nom et adresse",
      example: "Exemple",
      columns: {
        item: "Objet",
        grade: "État",
        quantity: "Qté",
        market: "Valeur de marché",
        metal: "Valeur du métal",
        insured: "Valeur assurée",
      },
      total: "Total",
      used: "oblitéré",
      note: "Valeurs déclarées par le propriétaire. La valeur du métal est poids × titre × cours spot. La valeur assurée est la plus élevée des valeurs retenues pour chaque objet.",
    },
  },
  also: {
    title: "Et tout le reste",
    items: {
      albums: {
        title: "Albums",
        text: "Regroupez vos objets par série, par voyage ou comme bon vous semble.",
      },
      wantlist: {
        title: "Liste de souhaits",
        text: "Marquez ce que vous cherchez. Ajouter la pièce la raye de la liste.",
      },
      certification: {
        title: "Pièces certifiées",
        text: "PCGS, NGC, ANACS, ICG ou PMG, avec le numéro de certificat.",
      },
      stamps: {
        title: "Catalogues de timbres",
        text: "Numéros Michel, Scott, Stanley Gibbons, Yvert et Tellier, AFA et Norgeskatalogen.",
      },
      import: {
        title: "Import de tableur",
        text: "Jusqu’à 2 000 lignes depuis un fichier CSV, vérifiées avant tout enregistrement.",
      },
      export: {
        title: "Export PDF et CSV",
        text: "N’importe quelle vue de votre collection, à imprimer ou à garder. Premium.",
      },
      charts: {
        title: "Graphiques",
        text: "La valeur dans le temps, par date d’acquisition et par type d’objet.",
      },
      sales: {
        title: "Objets vendus",
        text: "Notez ce que vous avez vendu et à quel prix. L’objet quitte vos totaux et garde son historique.",
      },
      languages: {
        title: "Cinq langues",
        text: "English, Norsk bokmål, Deutsch, Français et Română, avec les nombres et les dates écrits à votre façon.",
      },
      phone: {
        title: "Sur votre téléphone",
        text: "Fonctionne dans le navigateur sur téléphone, tablette et ordinateur, et s’ajoute à votre écran d’accueil.",
      },
    },
  },
  privacy: {
    title: "Personne d’autre ne voit ce que vous possédez.",
    points: [
      "Vos photos ne sont que pour vous : un lien vers l’une d’elles cesse de fonctionner dans l’heure, même s’il est partagé.",
      "Aucune publicité, quelle que soit la formule, et aucun cookie de suivi. Les pages vues sont comptées sans savoir qui vous êtes.",
      "Supprimez votre compte, et vos objets, photos et albums partent avec lui.",
    ],
  },
  plans: {
    title: "Gratuit pour vos {limit} premiers objets",
    lead: "Premium est là quand votre collection dépasse la formule gratuite, ou quand vous voulez les rapports.",
    free: {
      name: "Formule gratuite",
      price: "Gratuit",
      summary: "Jusqu’à {limit} objets, quelle que soit leur quantité.",
      features: [
        "Le catalogue, les ensembles et la liste de souhaits",
        "États, frappe, photos et albums",
        "Totaux, graphiques et cours spot",
        "Import de tableur",
      ],
      cta: "Commencer gratuitement",
    },
    premium: {
      name: "Premium",
      monthly: "{price} par mois",
      yearly: "ou {price} par an",
      summary: "Objets illimités, et les rapports en plus.",
      features: [
        "Objets illimités",
        "Le rapport d’assurance",
        "Export PDF et CSV",
        "Tout ce qu’offre la formule gratuite",
      ],
      cta: "Gratuit d’abord, Premium ensuite",
    },
  },
  questions: {
    title: "Les questions des collectionneurs",
    items: [
      {
        question: "Mes pièces doivent-elles être dans le catalogue ?",
        answer:
          "Non. Tout peut être saisi à la main, et les timbres le sont toujours. Quand le catalogue a l’émission, il vous évite la saisie et ouvre son ensemble.",
      },
      {
        question: "Puis-je importer mon tableur ?",
        answer:
          "Oui. Importez un CSV jusqu’à 2 000 lignes, avec des en-têtes dans l’une des cinq langues. Vous voyez quelles lignes seront ajoutées, et pourquoi d’autres ne le seront pas, avant tout enregistrement. Les {limit} objets de la formule gratuite s’appliquent toujours.",
      },
      {
        question: "Que se passe-t-il si j’arrête de payer Premium ?",
        answer:
          "Chaque objet reste, et reste modifiable. Vous ne pouvez simplement plus en ajouter tant que vous en avez plus de {limit}.",
      },
      {
        question: "Qui peut voir ma collection ?",
        answer:
          "Vous seul. Vos photos sont stockées en privé, et ce site compte les pages vues sans cookies et sans savoir qui vous êtes.",
      },
      {
        question: "Quelles devises puis-je utiliser ?",
        answer:
          "Votre devise de référence peut être NOK, SEK, DKK, EUR, RON, GBP, USD ou CHF. Changez-la plus tard et chaque montant est converti une fois, au taux que vous confirmez. Premium est facturé en NOK, RON, USD ou EUR, selon l’endroit où vous êtes.",
      },
      {
        question: "Est-ce que ça marche sur mon téléphone ?",
        answer:
          "Oui. Ça fonctionne dans tout navigateur récent, sur téléphone, tablette ou ordinateur, et vous pouvez l’ajouter à votre écran d’accueil.",
      },
    ],
  },
  closing: {
    title: "Commencez par la pièce posée sur votre bureau.",
    text: "Créer un compte prend une minute, et vos {limit} premiers objets sont gratuits.",
    cta: "Commencer gratuitement",
  },
  footer: {
    product: "Produit",
    account: "Compte",
    legal: "Mentions légales",
    privacy: "Politique de confidentialité",
    terms: "Conditions d’utilisation",
    tagline:
      "Un médaillier pour tout ce que vous collectionnez, avec la fiche de chaque pièce.",
    colophon:
      "Composé en Familjen Grotesk et Schibsted Grotesk. Chaque pièce de ce site est dessinée, pas photographiée.",
  },
  notFound: {
    title: "Rien n’est rangé à cette adresse",
    description: "La page a peut-être été déplacée, ou le lien est erroné.",
    home: "Aller à l’accueil",
    or: "Ou ouvrez un tiroir",
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
