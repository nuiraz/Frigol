import { useParams } from 'react-router-dom';

import { LEGAL } from '@/lib/config';
import { LEGAL_PAGES } from '@/lib/legal';

export default function Legal() {
  const { page = 'mentions' } = useParams();
  const content = LEGAL_PAGES[page] ?? LEGAL_PAGES.mentions;
  return (
    <main className="page narrow">
      <h1>{content.title}</h1>
      <p className="faint small">Dernière mise à jour : {LEGAL.lastUpdate}</p>
      {content.sections.map(([h, body]) => (
        <section key={h} className="card stack">
          <h3>{h}</h3>
          <p className="muted">{body}</p>
        </section>
      ))}
    </main>
  );
}
