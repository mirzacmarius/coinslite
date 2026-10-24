import type { LegalText } from "../types";

export default {
  title: "Politique de confidentialité",
  description:
    "Ce que CoinsLite enregistre sur vous et votre collection, pourquoi, qui le traite, combien de temps c’est conservé, et vos droits.",
  sections: [
    {
      id: "who",
      heading: "Qui nous sommes",
      blocks: [
        "CoinsLite est une application web pour répertorier les pièces, billets et timbres que vous possédez. Elle est exploitée par {operator}, {address} (« nous »). Nous sommes responsables du traitement des données personnelles décrites ici. Pour toute question sur cette politique ou sur vos données, écrivez à {email}.",
      ],
    },
    {
      id: "data",
      heading: "Ce que nous enregistrons",
      blocks: [
        [
          "Votre compte : votre adresse e-mail, votre nom d’affichage, la langue et la devise de référence que vous choisissez, la date à laquelle vous avez accepté ces conditions, votre dernière connexion, les notes de version que vous avez vues et, si vous les ajoutez pour le rapport d’assurance, vos nom complet, adresse, code postal, ville, pays et numéro de téléphone.",
          "Votre collection : vos objets avec tout ce que vous saisissez à leur sujet (informations descriptives, état, quantité, prix d’achat, valeur de marché, date et provenance de l’achat, notes), vos albums et les photos que vous ajoutez.",
          "Pages partagées : si vous partagez un album ou un ensemble par lien, nous enregistrons le partage (ce qui est partagé, le secret du lien et si les valeurs de marché s’affichent), et quiconque ouvre le lien voit ce que la page montre : le nom et la description de l’album ou de l’ensemble, votre nom d’affichage et, pour chaque objet, son titre, son année, son pays, sa valeur faciale, sa série, sa matière, son état, sa quantité et sa photo, ainsi que les valeurs de marché si vous les activez. Les prix d’achat, lieux de conservation, notes, numéros de certificat et de série ne sont jamais montrés. Arrêtez le partage et le lien cesse de fonctionner.",
          "Données de connexion : une empreinte (hash) de votre mot de passe si vous en utilisez un, vos sessions, les codes et liens de courte durée que nous vous envoyons par e-mail, et un décompte des tentatives de connexion échouées. Si vous vous connectez avec Google, nous recevons votre adresse e-mail, l’indication que Google l’a vérifiée ou non, votre nom et l’adresse de votre photo de profil.",
          "Votre formule : formule gratuite ou Premium et, pour Premium, la périodicité, le prix, la devise et la fin de la période en cours de l’abonnement, tels que Polar les communique.",
          "Vos messages : les messages que vous nous envoyez depuis la page du compte, avec votre adresse e-mail et votre identifiant de compte.",
          "Données techniques : votre adresse IP et des informations sur votre navigateur parviennent à nos hébergeurs à chaque requête et peuvent figurer dans leurs journaux.",
          "Statistiques d’utilisation : les pages de l’application et de ce site qui sont ouvertes, le site qui y renvoie, votre navigateur, votre système d’exploitation et votre type d’appareil, ainsi que votre localisation approximative (pays, région et ville), déduite de votre adresse IP. Elles sont comptées sans cookies et sans votre compte, et les adresses des pages omettent les identifiants de vos objets et albums, les termes de recherche et les codes de connexion.",
        ],
        "Nous ne demandons pas et ne souhaitons pas recevoir de données sensibles, comme la santé ou la religion. Merci de limiter vos notes sur les objets aux objets.",
      ],
    },
    {
      id: "purposes",
      heading: "Pourquoi nous les utilisons, et sur quelle base légale",
      blocks: [
        [
          "Pour fournir CoinsLite selon notre accord avec vous (exécution d’un contrat) : votre compte, votre collection et ses totaux, les rapports et exports que vous demandez, les e-mails qui vous connectent ou confirment un changement, et Premium si vous l’achetez.",
          "Pour que CoinsLite reste sûr et fonctionne (notre intérêt légitime) : limiter les connexions échouées et la fréquence des envois de fichiers et de messages, trouver et corriger les erreurs, prévenir les abus.",
          "Pour savoir quelles parties de CoinsLite sont utilisées, afin de les améliorer (notre intérêt légitime) : des statistiques d’utilisation, comptées via OpenPanel sans cookies et sans que nous sachions qui vous êtes. Un bloqueur de contenu dans votre navigateur les empêche.",
          "Pour vous répondre (notre intérêt légitime) : réponses à vos messages et demandes.",
          "Pour respecter nos obligations légales (obligation légale) : par exemple conserver les documents que nous sommes tenus de conserver.",
        ],
        "Nous ne vendons pas vos données, n’affichons pas de publicité et n’utilisons pas vos données pour du profilage ou du marketing. Nos statistiques d’utilisation ne vous identifient pas, et rien ne vous suit sur d’autres sites.",
      ],
    },
    {
      id: "processors",
      heading: "Qui les traite pour nous",
      blocks: [
        "Nous faisons appel à ces prestataires. Chacun ne reçoit que ce dont il a besoin pour sa tâche :",
        [
          "Convex : héberge notre backend, notre base de données et les fichiers stockés, y compris vos photos. Il détient toutes les données ci-dessus.",
          "Vercel : héberge l’application et ce site. Il traite chaque requête de page, avec votre adresse IP et des informations sur votre navigateur.",
          "Resend : envoie nos e-mails. Il reçoit votre adresse e-mail et le message, par exemple un code de connexion ou un lien de confirmation.",
          "Google : seulement si vous choisissez de vous connecter avec Google, selon la politique de confidentialité de Google.",
          "Polar : vend Premium en tant que revendeur officiel (merchant of record). Quand vous passez à Premium, Polar reçoit votre adresse e-mail, votre identifiant de compte et votre adresse IP (pour choisir la devise et la taxe), et collecte directement vos données de paiement. Polar agit comme responsable de traitement indépendant pour le paiement, selon sa propre politique de confidentialité.",
          "Anthropic : seulement quand vous utilisez le scanner (une bêta de Premium), Anthropic reçoit les deux photos que vous prenez et les entrées du catalogue possibles, pour suggérer de quelle pièce ou de quel billet il s’agit, et son état. Rien qui vous identifie n’est envoyé.",
          "Sentry : enregistre les erreurs de l’application et, pour un échantillon de pages, leur temps de chargement, afin que nous puissions trouver et corriger les problèmes. Avec chaque rapport, il reçoit l’adresse de la page (sans ses paramètres de requête), des informations sur votre navigateur et votre appareil, et votre localisation approximative. Il ne conserve pas votre adresse IP, les rapports ne vous nomment jamais, et les données restent en Allemagne.",
          "OpenPanel : compte la façon dont l’application et ce site sont utilisés. À chaque page vue, il reçoit le titre et l’adresse de la page (sans les identifiants de vos objets et albums, ni les termes de recherche, ni les codes de connexion), le site d’origine, des informations sur votre navigateur et votre appareil, et votre adresse IP. Il en déduit votre localisation approximative et un identifiant de visiteur qui change chaque jour, puis supprime l’adresse IP. Il ne dépose aucun cookie et conserve les données en Allemagne.",
          "MetalpriceAPI : fournit les cours spot et les taux de change. Nos requêtes ne contiennent aucune donnée personnelle.",
          "Banque centrale européenne : fournit les taux de change des jours passés, quand vous enregistrez un achat dans une autre devise. Nos requêtes ne contiennent que le jour et les devises, aucune donnée personnelle.",
        ],
      ],
    },
    {
      id: "transfers",
      heading: "Transferts internationaux",
      blocks: [
        "Certains de ces prestataires sont établis, ou stockent des données, aux États-Unis ou dans d’autres pays hors de l’Espace économique européen. Lorsque des données quittent l’EEE, le transfert est encadré par des garanties reconnues par le RGPD, comme une décision d’adéquation ou les clauses contractuelles types de la Commission européenne. Écrivez à {email} pour en obtenir une copie.",
      ],
    },
    {
      id: "cookies",
      heading: "Cookies et stockage local",
      blocks: [
        "CoinsLite n’enregistre que ce dont il a besoin pour fonctionner. Rien ne sert à la publicité ou au suivi, et nos statistiques d’utilisation ne déposent aucun cookie ; nous ne demandons donc pas de consentement aux cookies.",
        [
          "Connexion : les cookies __convexAuthJWT et __convexAuthRefreshToken vous gardent connecté, et __convexAuthOAuthVerifier existe le temps de la connexion avec Google. Des entrées correspondantes commençant par __convexAuth sont conservées dans le stockage local de votre navigateur.",
          "coinslite-signed-in (cookie, un an) : indique à ce site que vous êtes connecté, pour qu’il ouvre l’application au lieu de la page d’accueil.",
          "coinslite-language (cookie, un an) : la langue que vous avez choisie, dans l’application et sur ce site.",
          "Next-Locale (cookie, jusqu’à la fermeture du navigateur) : la langue de la page affichée.",
          "theme (stockage local) : clair, sombre ou l’apparence de votre système.",
          "collection.display (stockage local) : liste ou grille, et le nombre d’objets par page.",
          "coinslite:catalog-recent (stockage local) : les dernières entrées du catalogue que vous avez choisies, jusqu’à six par type d’objet.",
          "coinslite-email-change (stockage local) : un changement d’adresse e-mail en attente de votre confirmation ; supprimé une fois effectué.",
        ],
        "Le stockage local reste sur votre appareil. Vous pouvez l’effacer, ainsi que les cookies, à tout moment dans votre navigateur ; vous serez alors déconnecté et vos préférences réinitialisées.",
      ],
    },
    {
      id: "retention",
      heading: "Combien de temps nous les conservons",
      blocks: [
        "Nous conservons vos données tant que vous avez un compte.",
        [
          "Supprimer votre compte (Compte, puis Supprimer le compte) efface définitivement votre profil, vos méthodes de connexion et vos sessions, vos objets, albums et photos, et le lien avec votre abonnement. L’essentiel disparaît immédiatement ; le reste d’une grande collection suit peu après en arrière-plan.",
          "Ce qui reste est la trace qu’un identifiant de compte a été supprimé, sans nommer personne, afin qu’un message tardif de Polar à son sujet mette fin à l’abonnement concerné.",
          "Un compte en formule gratuite auquel personne ne se connecte reçoit un e-mail après 6, 8 et 12 mois, puis est supprimé 14 jours après le dernier, qui en indique la date. Se connecter relance le décompte.",
          "Si vous commencez à créer un compte ou demandez un lien de connexion sans jamais confirmer votre adresse e-mail, ce que nous avons enregistré pour cela est supprimé au bout de 7 jours.",
          "Les photos que vous envoyez sans jamais les enregistrer, par exemple lors d’un scan que vous ne gardez pas, sont supprimées en quelques heures.",
          "Les données supprimées peuvent subsister jusqu’à {backupDays} jours dans les sauvegardes de notre backend et jusqu’à {logDays} jours dans les journaux de nos hébergeurs, après quoi elles disparaissent.",
          "Les e-mails contenant vos messages restent dans notre boîte de réception jusqu’à ce que nous les supprimions. Polar conserve les documents de paiement aussi longtemps que la loi l’exige.",
        ],
      ],
    },
    {
      id: "rights",
      heading: "Vos droits",
      blocks: [
        "En vertu du RGPD et de lois similaires, vous disposez des droits suivants. Vous pouvez exercer la plupart d’entre eux vous-même dans l’application ; pour les autres, écrivez à {email} et nous vous répondrons dans un délai d’un mois.",
        [
          "Accès : savoir ce que nous détenons sur vous. La page du compte et votre collection l’affichent, et nous vous envoyons une copie complète sur demande.",
          "Rectification : modifiez vos informations sur la page du compte et vos objets dans l’application.",
          "Effacement : supprimez votre compte et tout son contenu depuis la page du compte.",
          "Portabilité : demandez une copie de vos données dans un format lisible par machine. C’est gratuit, quelle que soit la formule. Avec Premium, vous pouvez aussi exporter vous-même votre collection en CSV.",
          "Opposition : opposez-vous à ce que nous faisons sur la base de nos intérêts légitimes.",
          "Retrait du consentement : lorsque nous nous fondons sur votre consentement, vous pouvez le retirer à tout moment, sans effet sur ce qui a été fait auparavant.",
          "Réclamation : adressez une réclamation à l’autorité de contrôle, {authority}, ou à celle du lieu où vous vivez ou travaillez.",
        ],
      ],
    },
    {
      id: "security",
      heading: "Sécurité",
      blocks: [
        "Les données circulent chiffrées. Les mots de passe ne sont enregistrés que sous forme d’empreintes. Vos photos sont privées : elles ne sont montrées qu’à vous, par des liens qui cessent de fonctionner en moins d’une journée. Seul un petit nombre d’administrateurs peut voir des informations de compte comme les noms, adresses e-mail, formules et le nombre d’objets d’un compte, et uniquement pour faire fonctionner le service.",
      ],
    },
    {
      id: "children",
      heading: "Enfants",
      blocks: [
        "CoinsLite n’est pas destiné aux enfants. Vous devez avoir au moins 16 ans pour créer un compte. Si vous pensez qu’un enfant nous a transmis des données, écrivez à {email} et nous les supprimerons.",
      ],
    },
    {
      id: "changes",
      heading: "Modifications de cette politique",
      blocks: [
        "Quand nous modifions cette politique, nous mettons à jour la date en haut de page. Si une modification touche à l’usage de vos données, nous vous prévenons par e-mail ou dans l’application avant qu’elle ne s’applique.",
      ],
    },
  ],
} satisfies LegalText;
