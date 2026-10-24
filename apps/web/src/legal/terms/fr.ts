import type { LegalText } from "../types";

export default {
  title: "Conditions d’utilisation",
  description:
    "L’accord entre vous et CoinsLite : les formules, le paiement et la résiliation, votre contenu, le catalogue, les valeurs et nos responsabilités.",
  sections: [
    {
      id: "agreement",
      heading: "L’accord",
      blocks: [
        "Ces conditions forment un accord entre vous et {operator}, {address} (« nous »), qui exploite CoinsLite. En créant un compte, vous les acceptez, ainsi que la politique de confidentialité. Vous devez avoir au moins 16 ans.",
      ],
    },
    {
      id: "service",
      heading: "Le service et ses formules",
      blocks: [
        "CoinsLite vous permet de répertorier les pièces, billets et timbres que vous possédez, de les organiser et de suivre ce que vous les avez payés et ce qu’ils valent.",
        [
          "Formule gratuite : jusqu’à {limit} objets, comptés comme objets quelle que soit leur quantité.",
          "Premium : des objets en nombre illimité, plus le rapport d’assurance et les exports PDF et CSV. Il est vendu au mois ou à l’année, aux prix affichés sur notre site et dans l’application au moment où vous y passez.",
        ],
        "Premium est vendu par l’intermédiaire de Polar, qui agit comme revendeur officiel (merchant of record) : Polar est le vendeur que vous payez, gère le paiement et les taxes, et ses propres conditions s’appliquent à l’achat.",
      ],
    },
    {
      id: "billing",
      heading: "Renouvellement et résiliation",
      blocks: [
        [
          "Premium se renouvelle automatiquement à la fin de chaque mois ou de chaque année jusqu’à ce que vous le résiliiez.",
          "Vous pouvez résilier à tout moment depuis la page du compte. Premium reste alors actif jusqu’à la fin de la période payée et ne se renouvelle pas.",
          "Les remboursements et votre droit de rétractation sont gérés par Polar en tant que vendeur, selon ses conditions et le droit de la consommation qui vous est applicable.",
          "Si nous modifions le prix de Premium, nous vous prévenons avant que le nouveau prix ne s’applique à votre abonnement, pour que vous puissiez résilier avant.",
          "Quand Premium prend fin, vous revenez à la formule gratuite. Rien n’est perdu : tous vos objets restent visibles et modifiables, même au-delà de {limit} objets. Vous ne pouvez simplement plus en ajouter tant que vous en avez plus de {limit}.",
        ],
      ],
    },
    {
      id: "use",
      heading: "Utilisation acceptable",
      blocks: [
        "Utilisez CoinsLite de manière légale et pour votre propre collection. Vous ne devez pas :",
        [
          "envoyer du contenu que vous n’avez pas le droit d’utiliser, ou qui est illégal ou choquant ;",
          "tenter d’accéder aux données d’autrui, ou de contourner les limites, les formules ou la sécurité ;",
          "surcharger le service, ou copier le catalogue en masse par des moyens automatisés ;",
          "revendre ou partager l’accès au service.",
        ],
        "Si un compte enfreint ces règles, nous pouvons le suspendre ou le fermer. Sauf si la loi ou un risque urgent s’y oppose, nous vous prévenons d’abord et vous donnons la possibilité de répondre.",
      ],
    },
    {
      id: "content",
      heading: "Votre contenu",
      blocks: [
        "Ce que vous saisissez et les photos que vous ajoutez restent à vous. Vous nous autorisez à les stocker, les traiter et vous les afficher uniquement dans la mesure nécessaire au fonctionnement de CoinsLite, par exemple pour calculer vos totaux, produire les rapports que vous demandez et, quand vous utilisez le scanner, faire analyser vos photos. Nous ne publions pas votre contenu et ne l’utilisons à aucune autre fin.",
        "Si vous partagez un album ou un ensemble par lien, vous choisissez de montrer cette partie de votre collection à quiconque détient le lien, comme le décrit la politique de confidentialité, et vous êtes responsable de ce que vous partagez et des personnes à qui vous donnez le lien. Vous pouvez arrêter le partage à tout moment.",
      ],
    },
    {
      id: "catalog",
      heading: "Le catalogue",
      blocks: [
        "Le catalogue est constitué par CoinsLite à partir de sources dont les licences le permettent, comme des données du domaine public et des listes officielles, complétées par notre propre travail éditorial. La source, l’auteur et la licence sont mentionnés lorsque la licence l’exige. Vous pouvez utiliser le catalogue pour répertorier votre propre collection ; ses textes et images restent à nous et aux titulaires mentionnés. Les informations du catalogue peuvent comporter des erreurs : signalez-les-nous quand vous en trouvez.",
      ],
    },
    {
      id: "values",
      heading: "Valeurs et rapports",
      blocks: [
        [
          "Les prix d’achat et les valeurs de marché sont vos propres chiffres. Nous ne les vérifions pas.",
          "Les cours spot proviennent d’un fournisseur tiers, sont actualisés régulièrement et ne sont donnés qu’à titre indicatif. Ils peuvent être retardés ou erronés, et la valeur du métal n’est qu’un calcul à partir d’eux : poids × titre × cours spot × quantité.",
          "Le rapport d’assurance et les exports reprennent les valeurs que vous avez choisies. Ils ne constituent ni une expertise, ni une estimation, ni un conseil financier. C’est votre assureur qui décide de ce qu’il accepte.",
        ],
      ],
    },
    {
      id: "scanner",
      heading: "Le scanner de pièces",
      blocks: [
        "Le scanner, une bêta de Premium, suggère de quelle pièce il s’agit sur vos photos. Les suggestions peuvent être fausses : elles vous sont donc toujours présentées pour que vous les vérifiiez et les corrigiez avant tout enregistrement.",
      ],
    },
    {
      id: "availability",
      heading: "Disponibilité",
      blocks: [
        "Nous faisons en sorte que CoinsLite soit disponible et vos données en sécurité, mais nous ne pouvons pas promettre que le service sera toujours disponible ou exempt d’erreurs. Nous pouvons modifier, ajouter ou retirer des fonctionnalités. Si nous fermions un jour le service, nous vous préviendrions au moins 30 jours à l’avance, pour que vous puissiez demander une copie de vos données.",
      ],
    },
    {
      id: "liability",
      heading: "Responsabilité",
      blocks: [
        "Nous sommes responsables des dommages que nous causons intentionnellement ou par négligence grave, et de tout ce que la loi ne nous permet pas d’exclure. Pour le reste, nous ne sommes pas responsables des pertes indirectes, et notre responsabilité totale est limitée à ce que vous nous avez payé au cours des 12 mois précédant la réclamation. Rien dans ces conditions ne limite vos droits de consommateur.",
      ],
    },
    {
      id: "ending",
      heading: "Fin de l’accord",
      blocks: [
        "Vous pouvez arrêter à tout moment en supprimant votre compte depuis la page du compte. Cela met fin à tout abonnement qui se renouvellerait et supprime vos données, comme le décrit la politique de confidentialité.",
      ],
    },
    {
      id: "changes",
      heading: "Modifications de ces conditions",
      blocks: [
        "Nous pouvons mettre à jour ces conditions. Nous vous informons des changements importants par e-mail ou dans l’application avant qu’ils ne s’appliquent. Si vous n’êtes pas d’accord, vous pouvez supprimer votre compte avant cette date.",
      ],
    },
    {
      id: "law",
      heading: "Droit applicable",
      blocks: [
        "Ces conditions sont régies par le droit de {law}. Si vous êtes un consommateur, vous conservez la protection des règles impératives du pays où vous résidez, et vous pouvez y porter une réclamation.",
      ],
    },
    {
      id: "contact",
      heading: "Nous contacter",
      blocks: ["{operator}, {address}. E-mail : {email}."],
    },
  ],
} satisfies LegalText;
