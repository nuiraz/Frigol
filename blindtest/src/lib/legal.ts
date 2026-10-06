import { LEGAL } from './config';
import { WEB_APP_URL } from './theme';

export type LegalPage = { title: string; sections: { heading: string; body: string }[] };

export const LEGAL_PAGES: Record<string, LegalPage> = {
  mentions: {
    title: 'Mentions légales',
    sections: [
      {
        heading: 'Éditeur',
        body: `L’application « Blind Test » (${WEB_APP_URL}) est éditée à titre non commercial par ${LEGAL.editor}.\nContact : ${LEGAL.contactEmail}`,
      },
      { heading: 'Directeur de la publication', body: LEGAL.editor },
      {
        heading: 'Hébergement',
        body: `Site web : ${LEGAL.host}.\nComptes et données en ligne : ${LEGAL.dataHost}.`,
      },
      {
        heading: 'Contenus musicaux',
        body: 'Les musiques sont lues via le lecteur officiel intégré de YouTube. Elles restent la propriété de leurs auteurs et ayants droit. L’application n’héberge, ne télécharge et ne redistribue aucun fichier audio ou vidéo. YouTube et YouTube Music sont des marques de Google LLC ; cette application n’est ni affiliée ni approuvée par Google.',
      },
      {
        heading: 'Signalement',
        body: `Pour signaler un contenu illicite ou demander son retrait : bouton « Signaler » du hub communautaire ou ${LEGAL.contactEmail}.`,
      },
    ],
  },
  cgu: {
    title: 'Conditions d’utilisation',
    sections: [
      {
        heading: '1. Objet',
        body: 'Ces conditions encadrent l’utilisation de l’application Blind Test : jeu de reconnaissance musicale, comptes joueurs, classement mondial et hub communautaire de playlists. Utiliser l’application vaut acceptation de ces conditions.',
      },
      {
        heading: '2. Compte',
        body: 'Le jeu est accessible sans compte. Un compte gratuit permet d’apparaître au classement et de partager des playlists. Tu dois avoir au moins 15 ans ou l’accord d’un parent. Tu es responsable de la confidentialité de ton mot de passe. Ton pseudo ne doit pas être injurieux, usurper l’identité d’autrui ni contenir de données personnelles.',
      },
      {
        heading: '3. Classement',
        body: 'Seules les parties solo jouées connecté sont classées. Toute tentative de triche (scores falsifiés, automatisation) peut entraîner la suppression des scores ou du compte.',
      },
      {
        heading: '4. Hub communautaire',
        body: 'En partageant une playlist, tu publies son nom, sa description et la liste des titres (liens YouTube). Tu t’engages à ne publier aucun contenu illicite, haineux, pornographique ou portant atteinte aux droits d’autrui. Les playlists signalées peuvent être retirées sans préavis. Tu peux retirer tes playlists à tout moment.',
      },
      {
        heading: '5. Contenus YouTube',
        body: 'La lecture utilise le lecteur YouTube et est soumise aux conditions d’utilisation de YouTube (youtube.com/t/terms). Certaines vidéos peuvent être indisponibles selon les choix de leurs ayants droit.',
      },
      {
        heading: '6. Responsabilité',
        body: 'L’application est fournie gratuitement, « en l’état », sans garantie de disponibilité. L’éditeur ne saurait être tenu responsable des contenus publiés par les utilisateurs ni des contenus diffusés par YouTube.',
      },
      {
        heading: '7. Résiliation et modifications',
        body: 'Tu peux supprimer ton compte à tout moment depuis la page Compte. Ces conditions peuvent évoluer ; la version en vigueur est toujours disponible dans l’application. Droit applicable : droit français.',
      },
    ],
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    sections: [
      {
        heading: 'Responsable du traitement',
        body: `${LEGAL.editor} — ${LEGAL.contactEmail}`,
      },
      {
        heading: 'Données collectées',
        body: '• Sans compte : aucune donnée n’est envoyée à nos serveurs. Tes catégories, réglages et meilleurs scores restent stockés sur ton appareil.\n• Avec un compte : adresse e-mail, mot de passe (chiffré, jamais lisible), pseudo, avatar, scores des parties classées (score, niveau, catégorie, date), playlists partagées, « j’aime » et signalements.',
      },
      {
        heading: 'Finalités et base légale',
        body: 'Ces données servent uniquement à faire fonctionner ton compte, le classement mondial et le hub communautaire (exécution du service que tu as demandé, article 6.1.b du RGPD). Aucune publicité, aucune revente, aucun profilage.',
      },
      {
        heading: 'Données publiques',
        body: 'Ton pseudo, ton avatar, tes meilleurs scores et tes playlists partagées sont visibles par tous les joueurs. Ton adresse e-mail n’est jamais affichée.',
      },
      {
        heading: 'Durée de conservation',
        body: 'Tant que ton compte existe. La suppression du compte efface immédiatement et définitivement toutes les données associées.',
      },
      {
        heading: 'Sous-traitants',
        body: `• ${LEGAL.dataHost} : comptes et base de données.\n• GitHub Pages : hébergement du site.\n• YouTube (Google) : le lecteur vidéo intégré peut déposer des cookies et collecter des données selon la politique de confidentialité de Google (policies.google.com/privacy).`,
      },
      {
        heading: 'Tes droits',
        body: `Tu peux accéder à tes données, les rectifier (page Compte), les effacer (bouton « Supprimer mon compte »), t’opposer à leur traitement ou demander leur portabilité en écrivant à ${LEGAL.contactEmail}. Tu peux aussi adresser une réclamation à la CNIL (cnil.fr).`,
      },
      {
        heading: 'Sécurité',
        body: 'Les échanges sont chiffrés (HTTPS). L’accès aux données est protégé par des règles de sécurité au niveau de la base : chaque joueur ne peut modifier que ses propres données.',
      },
    ],
  },
};
