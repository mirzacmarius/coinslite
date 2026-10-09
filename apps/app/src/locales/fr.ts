import type { Dictionary } from "./types";

export default {
  common: {
    language: "Langue",
    appDescription:
      "Enregistrez les pièces, billets et timbres que vous possédez.",
  },
  nav: {
    overview: "Aperçu",
    collection: "Collection",
    catalog: "Catalogue",
    albums: "Albums",
    account: "Compte",
  },
  shell: {
    skipToContent: "Aller au contenu",
    primaryNavigation: "Menu principal",
    signOut: "Se déconnecter",
    workspaceMenu: "Compte et préférences",
    plans: "Formules",
    appearance: "Apparence",
    appearanceLight: "Clair",
    appearanceDark: "Sombre",
    appearanceSystem: "Système",
    more: "Plus",
  },
  placeholder: {
    title: "Rien ici pour l’instant",
    description: "Cette partie de CoinsLite arrive bientôt.",
  },
  items: {
    add: "Ajouter un objet",
    new: "Nouvel objet",
    title: "Titre",
    titlePlaceholder: "Titre, par ex. 5 francs Semeuse 1960",
    notesPlaceholder: "Ajouter des notes…",
    type: "Type d’objet",
    types: {
      coin: "Pièce",
      banknote: "Billet",
      stamp: "Timbre",
    },
    country: "Pays",
    setCountry: "Choisir le pays",
    year: "Année",
    denomination: "Valeur faciale",
    quantity: "Quantité",
    purchasePrice: "Prix d’achat",
    marketValue: "Valeur de marché",
    perPiece: "par exemplaire",
    purchaseDate: "Date d’achat",
    source: "Provenance",
    sourcePlaceholder: "Où vous l’avez obtenu",
    notes: "Notes",
    moreDetails: "Plus de détails",
    createMore: "En ajouter d’autres",
    cancel: "Annuler",
    close: "Fermer",
    added: "Objet ajouté à votre collection",
    emptyTitle: "Votre collection est vide",
    emptyDescription:
      "Ajoutez votre première pièce, votre premier billet ou timbre pour le voir ici.",
    showMore: "Afficher plus",
    notFoundTitle: "Objet introuvable",
    notFound:
      "Cet objet n’existe pas ou ne fait pas partie de votre collection.",
    backToCollection: "Retour à la collection",
    details: "Détails",
    purchase: "Achat",
    noMatches: "Aucun résultat",
    errors: {
      titleRequired: "Donnez un titre à l’objet.",
      quantity: "Utilisez un nombre entier supérieur ou égal à 1.",
      year: "Saisissez une année, par ex. 1881.",
      amount: "Saisissez un montant, par ex. 75,50.",
      date: "Choisissez une date qui n’est pas dans le futur.",
      failed: "Impossible d’ajouter l’objet. Réessayez.",
    },
  },
  auth: {
    signIn: {
      pageTitle: "Connexion",
      title: "Connectez-vous à votre collection",
      submit: "Se connecter",
      forgotPassword: "Mot de passe oublié ?",
      noAccount: "Nouveau sur CoinsLite ?",
      createAccount: "Créer un compte",
      failed:
        "L’adresse e-mail et le mot de passe ne correspondent pas. Vérifiez-les ou réinitialisez votre mot de passe.",
      verifyToContinue:
        "Vérifiez votre adresse e-mail pour terminer la connexion.",
    },
    signUp: {
      pageTitle: "Créer un compte",
      title: "Créez votre compte",
      description: "Recensez les pièces, billets et timbres que vous possédez.",
      submit: "Créer le compte",
      homeCurrencyHint:
        "Les valeurs de votre collection sont affichées dans cette devise.",
      acceptTerms: "J’accepte la {privacy} et les {terms}",
      privacyPolicy: "politique de confidentialité",
      termsOfUse: "conditions d’utilisation",
      termsRequired:
        "Acceptez la politique de confidentialité et les conditions d’utilisation pour continuer.",
      haveAccount: "Vous avez déjà un compte ?",
      failed:
        "Impossible de créer le compte. Si vous en avez déjà un, connectez-vous avec votre mot de passe, un lien de connexion ou Google.",
    },
    fields: {
      email: "E-mail",
      password: "Mot de passe",
      newPassword: "Nouveau mot de passe",
      homeCurrency: "Devise de référence",
      passwordHint: "Au moins 8 caractères.",
      code: "Code",
      emailInvalid: "Saisissez une adresse e-mail, par exemple nom@exemple.fr.",
      passwordTooShort: "Utilisez au moins 8 caractères.",
      passwordRequired: "Saisissez votre mot de passe.",
      codeInvalid: "Saisissez les 8 chiffres reçus par e-mail.",
    },
    code: {
      title: "Consultez vos e-mails",
      description:
        "Nous avons envoyé un code à 8 chiffres à {email}. Il expire dans 15 minutes.",
      submit: "Vérifier l’e-mail",
      resend: "Envoyer un nouveau code",
      resent: "Nous avons envoyé un nouveau code à {email}.",
      differentEmail: "Utiliser une autre adresse e-mail",
      failed:
        "Ce code n’a pas fonctionné. Vérifiez-le ou demandez-en un nouveau.",
    },
    verify: {
      pageTitle: "Vérifier l’e-mail",
      title: "Vérifiez votre adresse e-mail",
      description:
        "Confirmez que {email} est bien à vous pour terminer l’inscription.",
      confirm: "Vérifier mon adresse e-mail",
      failed:
        "Ce lien a expiré ou a déjà été utilisé. Connectez-vous pour recevoir un nouveau code.",
      noLink:
        "Ouvrez le lien de l’e-mail de vérification, ou connectez-vous pour recevoir un nouveau code.",
    },
    reset: {
      pageTitle: "Réinitialiser le mot de passe",
      title: "Réinitialisez votre mot de passe",
      description:
        "Nous vous enverrons un code par e-mail pour choisir un nouveau mot de passe.",
      sendCode: "Envoyer le code",
      codeSent:
        "Si {email} correspond à un compte CoinsLite, nous y avons envoyé un code. Il expire dans 15 minutes.",
      newPasswordTitle: "Choisissez un nouveau mot de passe",
      submit: "Enregistrer le mot de passe",
      failed: "Ce code n’a pas fonctionné ou a expiré. Demandez-en un nouveau.",
    },
    methods: {
      or: "ou",
      google: "Continuer avec Google",
      link: "Recevoir un lien de connexion",
    },
    link: {
      pageTitle: "Connexion par lien",
      title: "Se connecter avec un lien",
      description:
        "Nous vous envoyons par e-mail un lien qui vous connecte. Nouveau sur CoinsLite ? Le même lien crée votre compte.",
      submit: "M’envoyer un lien",
      sentTitle: "Consultez vos e-mails",
      sent: "Nous avons envoyé un lien de connexion à {email}. Il ne fonctionne qu’une fois et expire dans 15 minutes.",
      usePassword: "Utiliser un mot de passe",
      failed:
        "Ce lien de connexion a expiré ou a déjà été utilisé. Demandez-en un nouveau.",
      confirmTitle: "Se connecter à CoinsLite",
      confirmDescription: "Continuer en tant que {email}.",
      confirm: "Se connecter",
    },
    welcome: {
      pageTitle: "Terminer la configuration",
      title: "Terminez la configuration de votre compte",
      description:
        "Connecté en tant que {email}. Choisissez votre devise de référence et acceptez les conditions pour commencer.",
      submit: "Commencer à utiliser CoinsLite",
    },
    backToSignIn: "Retour à la connexion",
    noMatches: "Aucun résultat",
    failedGeneric: "Une erreur s’est produite. Réessayez.",
  },
  dashboard: {
    headerTitle: "Aperçu",
    headerDescription: "Votre collection en un coup d’œil.",
    bodyTitle: "Bienvenue sur CoinsLite",
    bodyDescription: "Votre collection apparaîtra ici.",
  },
  settings: {
    title: "Paramètres",
    headerTitle: "Paramètres",
    headerDescription: "Gérez les paramètres de votre compte.",
    avatar: {
      title: "Votre avatar",
      description: "Voici votre avatar. Il s’affiche sur votre profil.",
      uploadHint: "Cliquez sur l’avatar pour importer votre propre image.",
      resetButton: "Réinitialiser",
    },
    deleteAccount: {
      title: "Supprimer le compte",
      description:
        "Supprimez définitivement votre compte CoinsLite et tout son contenu.",
      warning: "Cette action est irréversible. Procédez avec prudence.",
      deleteButton: "Supprimer le compte",
      confirmButton: "Êtes-vous sûr ?",
    },
    sidebar: {
      general: "Général",
      billing: "Facturation",
    },
  },
} as const satisfies Dictionary;
