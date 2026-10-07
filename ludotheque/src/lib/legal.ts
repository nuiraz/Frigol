import { APP_NAME, APP_URL, LEGAL } from './config';

export const LEGAL_PAGES: Record<string, { title: string; sections: [string, string][] }> = {
  mentions: {
    title: 'Mentions légales',
    sections: [
      ['Éditeur', `${APP_NAME} (${APP_URL}) est édité par ${LEGAL.editor}. Contact : ${LEGAL.contactEmail}`],
      ['Directeur de la publication', LEGAL.editor],
      ['Hébergement', `Site : ${LEGAL.host}. Comptes et données : ${LEGAL.dataHost}.`],
      [
        'Marques',
        'Steam est une marque de Valve Corporation ; PlayStation et PSN sont des marques de Sony Interactive Entertainment ; Xbox est une marque de Microsoft Corporation. Ludothèque est un service indépendant, ni affilié ni approuvé par ces sociétés. Les visuels des jeux appartiennent à leurs éditeurs. Données Steam fournies par l’API Steam Web ; données Xbox via OpenXBL.',
      ],
      ['Signalement', `Pour signaler un contenu illicite : bouton « Signaler » d’une publication, ou ${LEGAL.contactEmail}.`],
    ],
  },
  cgu: {
    title: 'Conditions d’utilisation',
    sections: [
      ['1. Objet', `Ces conditions encadrent l’utilisation de ${APP_NAME} : consultation des jeux, comptes membres, connexion de comptes de jeu, notes, avis, discussions et commentaires.`],
      ['2. Compte', 'Il faut avoir au moins 15 ans (ou l’accord d’un parent) pour créer un compte. Tu es responsable de la confidentialité de ton mot de passe. Ton pseudo ne doit être ni injurieux ni trompeur.'],
      [
        '3. Comptes de jeu',
        'Tu ne peux lier que tes propres comptes Steam, PlayStation et Xbox. Les codes d’accès (NPSSO, clé OpenXBL) sont conservés côté serveur, jamais accessibles depuis le site, et servent uniquement à importer tes jeux et succès ; tu peux délier un compte à tout moment. L’accès aux données PlayStation repose sur des interfaces non officielles qui peuvent cesser de fonctionner.',
      ],
      [
        '4. Contenus publiés',
        'Tes avis, discussions et commentaires doivent respecter la loi et les autres membres : pas de propos haineux, harcèlement, spam, contenu sexuel ou violent, ni de données personnelles d’autrui. Tu restes propriétaire de tes textes et autorises leur affichage public sur le site. Les contenus signalés peuvent être retirés et les comptes suspendus.',
      ],
      ['5. Responsabilité', 'Le service est fourni gratuitement, « en l’état », sans garantie de disponibilité. Les notes et avis reflètent l’opinion de leurs auteurs.'],
      ['6. Fin et modifications', 'Tu peux supprimer ton compte à tout moment depuis « Mon compte ». Ces conditions peuvent évoluer ; la version en vigueur est toujours consultable ici. Droit applicable : droit français.'],
    ],
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    sections: [
      ['Responsable', `${LEGAL.editor} — ${LEGAL.contactEmail}`],
      [
        'Données collectées',
        'E-mail, mot de passe (chiffré), pseudo, avatar et bio ; comptes de jeu liés (identifiant, pseudo, avatar), jeux possédés, temps de jeu, succès et trophées ; avis, notes, discussions, commentaires, « j’aime » et signalements ; codes d’accès des plateformes (stockés côté serveur, jamais affichés).',
      ],
      ['Finalités', 'Faire fonctionner le service que tu as demandé (article 6.1.b du RGPD) : ta ludothèque, ton profil et le hub communautaire. Aucune publicité ni revente.'],
      ['Données publiques', 'Ton pseudo, avatar, bio, comptes de jeu liés, ludothèque, succès, avis et commentaires sont visibles par tous. Ton e-mail ne l’est jamais.'],
      ['Durée', 'Tant que ton compte existe. La suppression du compte efface immédiatement toutes les données associées.'],
      ['Sous-traitants', `${LEGAL.dataHost} ; GitHub Pages ; Valve (API Steam) ; Sony (comptes PlayStation) ; OpenXBL (Xbox).`],
      ['Tes droits', `Accès, rectification, effacement (bouton « Supprimer mon compte »), opposition et portabilité : ${LEGAL.contactEmail}. Réclamation possible auprès de la CNIL (cnil.fr).`],
      ['Cookies', 'Aucun cookie publicitaire ni traceur : seul le stockage local du navigateur est utilisé pour garder ta session.'],
    ],
  },
};
