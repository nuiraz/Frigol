import { router } from 'expo-router';

/** Lance directement une partie : morceaux dans le désordre, depuis le début, lecture automatique. */
export function quickPlay(categories = 'all') {
  router.push({
    pathname: '/game',
    params: {
      categories,
      difficulty: 'facile',
      target: 'titre',
      answer: 'qcm',
      rounds: '10',
      players: '',
      start: 'debut',
      auto: '1',
    },
  });
}
