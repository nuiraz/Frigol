import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Empty, GameTile, Spinner } from '@/components/ui';
import { callApi } from '@/lib/api';
import { getRatings, searchKnownGames, topRated, type Game, type Rating } from '@/lib/db';

export default function Games() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [term, setTerm] = useState(q);
  const [results, setResults] = useState<{ key: string; games: Game[]; error?: string } | null>(null);
  const [ratings, setRatings] = useState<Map<string, Rating>>(new Map());
  const [top, setTop] = useState<{ game: Game; rating: Rating }[] | null>(null);

  useEffect(() => {
    topRated(1, 24).then(setTop).catch(() => setTop([]));
  }, []);

  // Recherche : catalogue Steam (via le serveur) + jeux PlayStation / Xbox déjà connus.
  useEffect(() => {
    if (!q) return;
    let cancelled = false;
    Promise.allSettled([callApi<{ games: Game[] }>('steam-search', { term: q }), searchKnownGames(q)]).then(async ([steam, known]) => {
      if (cancelled) return;
      const list: Game[] = [];
      const seen = new Set<string>();
      for (const g of [...(steam.status === 'fulfilled' ? steam.value.games : []), ...(known.status === 'fulfilled' ? known.value : [])]) {
        if (seen.has(g.id)) continue;
        seen.add(g.id);
        list.push(g);
      }
      const error = steam.status === 'rejected' && !list.length ? steam.reason?.message : undefined;
      setResults({ key: q, games: list, error });
      setRatings(await getRatings(list.map((g) => g.id)).catch(() => new Map()));
    });
    return () => {
      cancelled = true;
    };
  }, [q]);

  const current = results?.key === q ? results : null;

  return (
    <main className="page">
      <section className="stack" style={{ gap: 8 }}>
        <h1>Trouver un jeu</h1>
        <p className="muted">Cherche n’importe quel jeu pour voir sa note communautaire et donner la tienne.</p>
      </section>

      <form
        className="row"
        style={{ flexWrap: 'nowrap' }}
        onSubmit={(e) => {
          e.preventDefault();
          setParams(term.trim() ? { q: term.trim() } : {});
        }}>
        <input className="input" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Elden Ring, Hades, Baldur’s Gate 3…" autoFocus />
        <button className="btn" type="submit">
          Rechercher
        </button>
      </form>

      {q ? (
        !current ? (
          <Spinner />
        ) : current.error ? (
          <Empty title="Recherche indisponible" hint={current.error} />
        ) : current.games.length === 0 ? (
          <Empty title="Aucun jeu trouvé" hint="Essaie avec le nom exact du jeu, en anglais si besoin." />
        ) : (
          <div className="games-grid">
            {current.games.map((g) => (
              <GameTile key={g.id} game={g} score={ratings.get(g.id)?.average ?? null} />
            ))}
          </div>
        )
      ) : (
        <section className="stack">
          <h2>Les mieux notés par la communauté</h2>
          {!top ? (
            <Spinner />
          ) : top.length === 0 ? (
            <Empty title="Aucune note pour l’instant" hint="Lance une recherche et sois le premier à noter un jeu." />
          ) : (
            <div className="games-grid">
              {top.map(({ game, rating }) => (
                <GameTile key={game.id} game={game} score={rating.average}>
                  <span className="faint small">{rating.reviews} avis</span>
                </GameTile>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
