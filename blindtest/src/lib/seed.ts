import type { AppData, Category, Track } from './types';

const t = (id: string, artist: string, title: string): Track => ({
  id,
  artist,
  title,
});

const demoCategories: Category[] = [
  {
    id: 'demo-80s',
    name: 'Années 80',
    emoji: '📼',
    color: '#FF4FD8',
    sources: [],
    tracks: [
      t('djV11Xbc914', 'a-ha', 'Take On Me'),
      t('Zi_XLOBDo_Y', 'Michael Jackson', 'Billie Jean'),
      t('FTQbiNvZqaY', 'Toto', 'Africa'),
      t('9jK-NcRmVcw', 'Europe', 'The Final Countdown'),
      t('btPJPFnesV4', 'Survivor', 'Eye of the Tiger'),
      t('dQw4w9WgXcQ', 'Rick Astley', 'Never Gonna Give You Up'),
      t('E8gmARGvPlI', 'Wham!', 'Last Christmas'),
    ],
  },
  {
    id: 'demo-pop',
    name: 'Hits Pop',
    emoji: '🎤',
    color: '#4FC3FF',
    sources: [],
    tracks: [
      t('kJQP7kiw5Fk', 'Luis Fonsi', 'Despacito'),
      t('9bZkp7q19f0', 'PSY', 'Gangnam Style'),
      t('JGwWNGJdvx8', 'Ed Sheeran', 'Shape of You'),
      t('OPf0YbXqDm0', 'Mark Ronson', 'Uptown Funk'),
      t('YQHsXMglC9A', 'Adele', 'Hello'),
      t('ZbZSe6N_BXs', 'Pharrell Williams', 'Happy'),
      t('CevxZvSJLk8', 'Katy Perry', 'Roar'),
      t('8UVNT4wvIGY', 'Gotye', 'Somebody That I Used to Know'),
      t('5NV6Rdv1a3I', 'Daft Punk', 'Get Lucky'),
      t('7wtfhZwyrcc', 'Imagine Dragons', 'Believer'),
      t('pRpeEdMmmQ0', 'Shakira', 'Waka Waka'),
      t('VHoT4N43jK8', 'Stromae', 'Alors on danse'),
      t('oiKj0Z_Xnjc', 'Stromae', 'Papaoutai'),
      t('K5KAc5CoCuk', 'Indila', 'Dernière danse'),
    ],
  },
  {
    id: 'demo-rock',
    name: 'Rock',
    emoji: '🎸',
    color: '#FFB020',
    sources: [],
    tracks: [
      t('fJ9rUzIMcZQ', 'Queen', 'Bohemian Rhapsody'),
      t('HgzGwKwLmgM', 'Queen', "Don't Stop Me Now"),
      t('hTWKbfoikeg', 'Nirvana', 'Smells Like Teen Spirit'),
      t('1w7OgIMMRc4', "Guns N' Roses", "Sweet Child O' Mine"),
      t('v2AC41dglnM', 'AC/DC', 'Thunderstruck'),
      t('l482T0yNkeo', 'AC/DC', 'Highway to Hell'),
      t('eVTXPUF4Oz4', 'Linkin Park', 'In the End'),
      t('0J2QdDbelmY', 'The White Stripes', 'Seven Nation Army'),
      t('dvgZkm1xWPE', 'Coldplay', 'Viva la Vida'),
    ],
  },
];

export function createDefaultData(): AppData {
  return {
    version: 1,
    categories: JSON.parse(JSON.stringify(demoCategories)),
    settings: { adminPin: '1234', youtubeApiKey: '' },
    bestScores: {},
  };
}
