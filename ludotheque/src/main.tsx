import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';

import { Layout } from '@/components/layout';
import { Empty, RequireAuth } from '@/components/ui';
import { AuthProvider } from '@/lib/auth';
import { captureSteamReturn } from '@/lib/steam-login';
import Accounts from '@/pages/accounts';
import { Forgot, Login, Signup } from '@/pages/auth';
import Game from '@/pages/game';
import Games from '@/pages/games';
import Hub from '@/pages/hub';
import Legal from '@/pages/legal';
import Library from '@/pages/library';
import LibraryGame from '@/pages/library-game';
import Post from '@/pages/post';
import Profile from '@/pages/profile';
import Settings from '@/pages/settings';

import './styles.css';

// Retour de « Se connecter avec Steam » : à traiter avant l'affichage.
captureSteamReturn();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Hub />} />
            <Route path="jeux" element={<Games />} />
            <Route path="jeu/:id" element={<Game />} />
            <Route path="post/:id" element={<Post />} />
            <Route path="u/:username" element={<Profile />} />
            <Route path="bibliotheque" element={<RequireAuth><Library /></RequireAuth>} />
            <Route path="bibliotheque/:id" element={<RequireAuth><LibraryGame /></RequireAuth>} />
            <Route path="comptes" element={<RequireAuth><Accounts /></RequireAuth>} />
            <Route path="compte" element={<RequireAuth><Settings /></RequireAuth>} />
            <Route path="connexion" element={<Login />} />
            <Route path="inscription" element={<Signup />} />
            <Route path="mot-de-passe-oublie" element={<Forgot />} />
            <Route path="legal/:page" element={<Legal />} />
            <Route path="*" element={<main className="page"><Empty title="Page introuvable" /></main>} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  </StrictMode>,
);
