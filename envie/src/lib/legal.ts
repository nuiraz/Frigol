import { APP_NAME, LEGAL, PREMIUM, WEB_URL } from './config';

export type LegalPage = { title: string; sections: { heading: string; body: string }[] };

export const LEGAL_PAGES: Record<string, LegalPage> = {
  mentions: {
    title: 'Mentions légales',
    sections: [
      {
        heading: 'Éditeur',
        body: `${APP_NAME} est un service édité à titre personnel par ${LEGAL.editor}.\nContact : ${LEGAL.contactEmail}`,
      },
      { heading: 'Hébergement du site', body: LEGAL.host },
      { heading: 'Hébergement des données', body: LEGAL.dataHost },
      {
        heading: 'Contenus et marques',
        body:
          'Les titres, jaquettes, extraits audio et marques cités appartiennent à leurs ayants droit respectifs. ' +
          'Les jaquettes et extraits de 30 secondes proviennent des services publics d’Apple (iTunes), de TVmaze et de Steam ; ' +
          `${APP_NAME} n’est affilié à aucun de ces services ni à Sony, Microsoft, Nintendo ou Valve.`,
      },
      {
        heading: 'Contenus publiés par les membres',
        body:
          'Les avis et commentaires sont publiés sous la seule responsabilité de leurs auteurs. ' +
          `Tout contenu illicite peut être signalé depuis l’app (bouton « Signaler ») ou à ${LEGAL.contactEmail} ; il sera retiré dans les meilleurs délais.`,
      },
      { heading: 'Adresse du site', body: WEB_URL },
    ],
  },
  cgu: {
    title: 'Conditions d’utilisation',
    sections: [
      {
        heading: '1. Objet',
        body: `${APP_NAME} propose des idées de films, séries, jeux vidéo et musiques, et un hub communautaire où les membres notent et commentent ces titres. L’utilisation est gratuite.`,
      },
      {
        heading: '2. Compte',
        body:
          'La découverte est accessible sans compte. Pour publier des avis, il faut créer un compte avec une adresse e-mail valide et un pseudo. ' +
          'Il faut avoir au moins 15 ans, ou l’accord d’un parent. Tu es responsable de la confidentialité de ton mot de passe.',
      },
      {
        heading: '3. Règles de la communauté',
        body:
          'Sont interdits : propos haineux, harcèlement, insultes, contenus sexuels ou violents, spam, publicité, divulgation d’informations personnelles et spoilers non signalés. ' +
          'Les administrateurs peuvent supprimer tout contenu ou compte qui ne respecte pas ces règles.',
      },
      {
        heading: '4. Tes contenus',
        body:
          'Tu restes propriétaire de tes avis. En les publiant, tu autorises leur affichage public dans l’app tant que tu ne les supprimes pas. Tu peux les modifier ou les supprimer à tout moment.',
      },
      {
        heading: '5. Responsabilité',
        body: 'Le service est fourni « en l’état », sans garantie de disponibilité. Les recommandations sont indicatives.',
      },
      {
        heading: '6. Suppression du compte',
        body: 'Tu peux supprimer ton compte à tout moment depuis Profil → Paramètres. Toutes tes données sont alors effacées.',
      },
      { heading: 'Mise à jour', body: `Dernière mise à jour : ${LEGAL.lastUpdate}.` },
    ],
  },
  cgv: {
    title: 'Conditions de vente — Premium',
    sections: [
      {
        heading: '1. Offre',
        body: `${APP_NAME} Premium est un abonnement mensuel à ${PREMIUM.price} TTC par ${PREMIUM.period}, qui débloque : 5 idées d’un coup, filtres avancés, collections illimitées, « Mon bilan », journal privé, export de liste et badge Premium. L’usage de base d’${APP_NAME} reste gratuit.`,
      },
      {
        heading: '2. Paiement',
        body: 'Le paiement est réalisé par carte bancaire via Stripe, prestataire de paiement sécurisé. Aucune donnée bancaire n’est conservée par Envie. L’abonnement est prélevé à la souscription puis chaque mois à la même date.',
      },
      {
        heading: '3. Durée et résiliation',
        body: 'L’abonnement est sans engagement : tu peux le résilier à tout moment depuis le lien reçu par e-mail de Stripe ou en écrivant au contact ci-dessous. Il reste actif jusqu’à la fin de la période déjà payée, sans renouvellement.',
      },
      {
        heading: '4. Droit de rétractation',
        body: 'Conformément au Code de la consommation, tu disposes de 14 jours pour te rétracter. En demandant l’accès immédiat aux fonctions Premium, tu acceptes que le service commence avant la fin de ce délai ; le remboursement est alors calculé au prorata de la période non utilisée.',
      },
      {
        heading: '5. Réclamations et médiation',
        body: `Pour toute question : ${LEGAL.contactEmail}. En cas de litige, tu peux recourir gratuitement à un médiateur de la consommation ou à la plateforme européenne de règlement des litiges en ligne.`,
      },
      { heading: 'Mise à jour', body: `Dernière mise à jour : ${LEGAL.lastUpdate}.` },
    ],
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    sections: [
      {
        heading: 'Données collectées',
        body:
          '• Compte : adresse e-mail, mot de passe (chiffré par Supabase, jamais visible), pseudo, avatar et bio.\n' +
          '• Activité : tes avis, notes, commentaires, likes, signalements et ta liste « À faire / Déjà fait ».\n' +
          '• Sur ton appareil : ta session et ta liste sont enregistrées localement pour fonctionner hors connexion.\n' +
          '• Premium : la date de fin d’abonnement. Le paiement est géré par Stripe, qui traite tes données bancaires ; Envie ne les reçoit jamais.',
      },
      {
        heading: 'Pourquoi',
        body: 'Uniquement pour faire fonctionner le service : te connecter, afficher tes avis sur le hub et synchroniser ta liste entre tes appareils. Aucune publicité, aucune revente, aucun pistage.',
      },
      {
        heading: 'Qui y a accès',
        body:
          'Ton pseudo, ton avatar, ta bio et tes avis sont publics. Ton e-mail et ta liste sont privés. ' +
          `Les données sont stockées chez ${LEGAL.dataHost}. Pour afficher les jaquettes, l’app interroge iTunes, TVmaze et Steam avec le nom du titre, sans aucune donnée personnelle.`,
      },
      { heading: 'Durée de conservation', body: 'Tant que ton compte existe. À sa suppression, tout est effacé immédiatement.' },
      {
        heading: 'Tes droits (RGPD)',
        body:
          `Tu peux accéder à tes données, les corriger ou les supprimer (Profil → Paramètres), ou nous écrire à ${LEGAL.contactEmail}. ` +
          'Tu peux aussi saisir la CNIL (cnil.fr).',
      },
      { heading: 'Cookies', body: 'Aucun cookie publicitaire ou de mesure d’audience. Seul le stockage nécessaire à ta session est utilisé.' },
      { heading: 'Mise à jour', body: `Dernière mise à jour : ${LEGAL.lastUpdate}.` },
    ],
  },
};
