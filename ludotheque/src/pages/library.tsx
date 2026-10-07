import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Cover, Empty, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { library, type LibraryEntry, type Platform } from '@/lib/db';
import { PLATFORMS, playtime } from '@/lib/format';

type Sort = 'recent' | 'playtime' | 'completion' | 'name';

export default function Library() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const [platform, setPlatform] = useState<Platform | 'all'>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [q, setQ] = useState('');

  useEffect(() => {
    library(userId).then(setEntries).catch(() => setEntries([]));
  }, [userId]);

  const list = useMemo(() => {
    const filtered = (entries ?? []).filter(
      (e) => e.games && (platform === 'all' || e.games.platform === platform) && e.games.name.toLowerCase().includes(q.toLowerCase()),
    );
    const pct = (e: LibraryEntry) => (e.achievements_total ? e.achievements_unlocked / e.achievements_total : -1);
    return filtered.sort((a, b) =>
      sort === 'playtime'
        ? b.playtime_minutes - a.playtime_minutes
        : sort === 'completion'
          ? pct(b) - pct(a)
          : sort === 'name'
            ? a.games!.name.localeCompare(b.games!.name)
            : (b.last_played ?? '').localeCompare(a.last_played ?? ''),
    );
  }, [entries, platform, sort, q]);

  if (!entries) return <Spinner />;

  const counts = (p: Platform) => entries.filter((e) => e.games?.platform === p).length;

  return (
    <main className="page">
      <section className="row spread">
        <div className="stack" style={{ gap: 6 }}>
          <h1>Ma ludothèque</h1>
          <p className="muted">
            {entries.length} jeux · {entries.reduce((n, e) => n + e.achievements_unlocked, 0).toLocaleString('fr-FR')} succès et trophées
          </p>
        </div>
        <Link to="/comptes" className="btn secondary small">
          Gérer mes comptes
        </Link>
      </section>

      {entries.length === 0 ? (
        <Empty title="Ta ludothèque est vide" hint="Connecte ton compte Steam, PlayStation ou Xbox pour importer tous tes jeux et succès.">
          <Link to="/comptes" className="btn">
            Connecter mes comptes
          </Link>
        </Empty>
      ) : (
        <>
          <div className="row">
            <button className={`chip ${platform === 'all' ? 'on' : ''}`} onClick={() => setPlatform('all')}>
              Tout · {entries.length}
            </button>
            {(Object.keys(PLATFORMS) as Platform[]).filter(counts).map((p) => (
              <button key={p} className={`chip ${platform === p ? 'on' : ''}`} onClick={() => setPlatform(p)}>
                {PLATFORMS[p].label} · {counts(p)}
              </button>
            ))}
          </div>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer par nom" />
            <select className="input" style={{ width: 200 }} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="recent">Joués récemment</option>
              <option value="playtime">Temps de jeu</option>
              <option value="completion">Progression</option>
              <option value="name">Nom</option>
            </select>
          </div>
          <div className="games-grid">
            {list.map((e) => {
              const pct = e.achievements_total ? Math.round((e.achievements_unlocked / e.achievements_total) * 100) : null;
              return (
                <Link key={e.game_id} to={`/bibliotheque/${encodeURIComponent(e.game_id)}`} className="game-tile">
                  <Cover game={e.games!} showPlatform />
                  <span className="game-tile-title">{e.games!.name}</span>
                  {pct != null && (
                    <div className="progress" title={`${pct} %`}>
                      <span style={{ width: `${pct}%`, background: e.platinum ? '#9fd8ff' : undefined }} />
                    </div>
                  )}
                  <span className="faint small">
                    {pct != null ? `${e.achievements_unlocked}/${e.achievements_total}${e.platinum ? ' · Platine' : ''}` : ''}
                    {e.playtime_minutes ? `${pct != null ? ' · ' : ''}${playtime(e.playtime_minutes)}` : ''}
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
