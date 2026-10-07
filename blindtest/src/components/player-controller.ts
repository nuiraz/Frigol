/**
 * Logique du lecteur, partagée entre le web (exécutée dans la page) et le mobile
 * (injectée dans la WebView). Écrite en ES5 sous forme de texte pour pouvoir être
 * embarquée telle quelle dans le HTML de la WebView.
 *
 * Corps d'une fonction (player, send) qui renvoie le contrôleur.
 */
export const CONTROLLER_SOURCE = `
var phase = 'idle';
var target = { start: 0, duration: 0, startMode: 'random' };
var segTimer = null;
var segRemaining = null; // millisecondes d'extrait restant à jouer
var segStartedAt = 0;
var segWatch = null;
var watchdog = null;
var playlistTries = 0;

function clearTimers() {
  if (segTimer) { clearTimeout(segTimer); segTimer = null; }
  if (segWatch) { clearTimeout(segWatch); segWatch = null; }
  if (watchdog) { clearTimeout(watchdog); watchdog = null; }
}

function pickStart(duration) {
  if (target.startMode === 'fixed') return target.start;
  if (target.startMode === 'intro' || !duration || duration < 40) return 0;
  // Entre 25 % et 65 % du morceau : on tombe le plus souvent sur un couplet ou le refrain.
  var min = duration * 0.25, max = duration * 0.65;
  return Math.floor(min + Math.random() * (max - min));
}

function runSegmentTimer() {
  segStartedAt = Date.now();
  segTimer = setTimeout(endSegment, segRemaining);
}

/** Le son s'est interrompu (chargement réseau) : on met le chrono de l'extrait en pause. */
function holdSegmentTimer() {
  if (!segTimer) return;
  clearTimeout(segTimer);
  segTimer = null;
  segRemaining = Math.max(0, segRemaining - (Date.now() - segStartedAt));
}

function endSegment() {
  clearTimers();
  segRemaining = null;
  phase = 'idle';
  try { player.pauseVideo(); } catch (e) {}
  send({ type: 'segmentEnd' });
}

function readPlaylist() {
  var ids = null;
  try { ids = player.getPlaylist(); } catch (e) {}
  if (ids && ids.length) { clearTimers(); phase = 'idle'; send({ type: 'playlist', ids: ids }); return; }
  if (++playlistTries > 20) { clearTimers(); phase = 'idle'; send({ type: 'playlist', ids: [] }); return; }
  setTimeout(readPlaylist, 500);
}

function markPrepared() {
  clearTimers();
  var duration = 0;
  try { duration = player.getDuration() || 0; } catch (e) {}
  phase = 'prepared';
  send({ type: 'prepared', start: target.start, duration: duration });
}

return {
  onState: function (s) {
    if (s === 5 && phase === 'cueing') { markPrepared(); return; }
    // -1 non démarré, 0 terminé, 1 lecture, 2 pause, 3 chargement, 5 prête
    if (s === 1 && phase === 'preparing') {
      clearTimers();
      var duration = player.getDuration();
      target.start = pickStart(duration);
      player.pauseVideo();
      player.seekTo(target.start, true);
      phase = 'prepared';
      send({ type: 'prepared', start: target.start, duration: duration });
    } else if (s === 1 && phase === 'segment' && !segTimer) {
      // Le chrono de l'extrait ne tourne que quand le son sort vraiment : les chargements ne le raccourcissent pas.
      if (segWatch) { clearTimeout(segWatch); segWatch = null; }
      if (segRemaining === null) { segRemaining = target.duration * 1000; send({ type: 'segmentStart' }); }
      runSegmentTimer();
    } else if ((s === 3 || s === 2) && phase === 'segment') {
      holdSegmentTimer();
    } else if (s === 0 && phase === 'segment') {
      endSegment();
    } else if (s === 5 && phase === 'playlist') {
      readPlaylist();
    }
  },
  onError: function (code) {
    clearTimers();
    phase = 'idle';
    send({ type: 'error', code: code });
  },
  prepare: function (videoId, startMode, start) {
    clearTimers();
    target.startMode = startMode;
    target.start = start || 0;
    if (startMode !== 'random') {
      // Départ connu : on se contente de « préparer » la vidéo, sans lecture automatique
      // (bloquée par certains navigateurs).
      phase = 'cueing';
      player.cueVideoById({ videoId: videoId, startSeconds: target.start });
      watchdog = setTimeout(function () { if (phase === 'cueing') markPrepared(); }, 6000);
      return;
    }
    // Départ aléatoire : il faut connaître la durée, on lance donc la vidéo en silencieux.
    phase = 'preparing';
    player.mute();
    player.loadVideoById({ videoId: videoId, startSeconds: 0 });
    watchdog = setTimeout(function () {
      // Lecture auto refusée : on se rabat sur une vidéo simplement préparée.
      if (phase === 'preparing') { player.cueVideoById({ videoId: videoId, startSeconds: 0 }); markPrepared(); }
    }, 6000);
  },
  segment: function (duration, start) {
    clearTimers();
    phase = 'segment';
    segRemaining = null;
    target.duration = duration;
    if (typeof start === 'number') target.start = start;
    player.unMute();
    player.setVolume(100);
    player.seekTo(target.start, true);
    player.playVideo();
    if (player.getPlayerState() === 1) {
      segRemaining = target.duration * 1000;
      send({ type: 'segmentStart' });
      runSegmentTimer();
    }
    // Si rien ne joue au bout de 8 s, on le signale pour proposer de passer le morceau.
    segWatch = setTimeout(function () {
      if (phase === 'segment' && segRemaining === null) send({ type: 'stalled' });
    }, 8000);
  },
  stop: function () {
    clearTimers();
    segRemaining = null;
    phase = 'idle';
    try { player.pauseVideo(); } catch (e) {}
  },
  playlist: function (listId) {
    clearTimers();
    phase = 'playlist';
    playlistTries = 0;
    player.cuePlaylist({ list: listId, listType: 'playlist' });
    watchdog = setTimeout(function () {
      if (phase === 'playlist') readPlaylist();
    }, 6000);
  }
};
`;

export const PLAYER_VARS = {
  playsinline: 1,
  controls: 0,
  disablekb: 1,
  fs: 0,
  rel: 0,
  iv_load_policy: 3,
  autoplay: 0,
};
