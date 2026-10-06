// ===== Utilitaires =====
const $ = (id) => document.getElementById(id);

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $("screen-" + name).classList.add("active");
  window.scrollTo(0, 0);
}

const storage = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
  },
};

// ===== État =====
const GAME_LENGTH = 10;
const selection = { category: "mix", level: "facile" };
let game = null;
let timerId = null;

// ===== Écran d'accueil =====
function renderOptions() {
  const cats = [["mix", { name: "Mélange", icon: "🎲" }], ...Object.entries(CATEGORIES)];
  $("category-options").innerHTML = cats
    .map(([key, c]) => `<button class="option" data-cat="${key}"><span class="icon">${c.icon}</span>${c.name}</button>`)
    .join("");
  $("level-options").innerHTML = Object.entries(LEVELS)
    .map(([key, l]) => `<button class="option" data-level="${key}"><span class="icon">${l.icon}</span>${l.name}<small>${l.time} s / question</small></button>`)
    .join("");

  $("category-options").onclick = (e) => {
    const btn = e.target.closest("[data-cat]");
    if (btn) { selection.category = btn.dataset.cat; updateSelected(); }
  };
  $("level-options").onclick = (e) => {
    const btn = e.target.closest("[data-level]");
    if (btn) { selection.level = btn.dataset.level; updateSelected(); }
  };
  updateSelected();
}

function updateSelected() {
  document.querySelectorAll("[data-cat]").forEach((b) => b.classList.toggle("selected", b.dataset.cat === selection.category));
  document.querySelectorAll("[data-level]").forEach((b) => b.classList.toggle("selected", b.dataset.level === selection.level));
}

function renderBestScores() {
  const best = storage.get("best-scores", {});
  const entries = Object.entries(best);
  if (!entries.length) {
    $("best-scores").innerHTML = `<p class="empty">Aucun score pour l'instant. Lance une partie !</p>`;
    return;
  }
  $("best-scores").innerHTML = entries
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, val]) => `<div class="best">${label}<br><b>${val}</b></div>`)
    .join("");
}

// ===== Construction d'une partie =====
function pool(category, level) {
  const cats = category === "mix" ? Object.keys(QUESTIONS) : [category];
  return cats.flatMap((cat) => QUESTIONS[cat][level].map((item) => ({ ...item, cat, level })));
}

function startClassic() {
  const questions = shuffle(pool(selection.category, selection.level)).slice(0, GAME_LENGTH);
  const catName = selection.category === "mix" ? "Mélange" : CATEGORIES[selection.category].name;
  startGame({
    mode: "classic",
    label: `${catName} · ${LEVELS[selection.level].name}`,
    questions,
  });
}

function startIQ() {
  const pick = (level, n) => shuffle(pool("mix", level)).slice(0, n);
  startGame({
    mode: "iq",
    label: "🧠 Test de QI",
    questions: [...pick("facile", 6), ...pick("moyen", 7), ...pick("difficile", 7)],
  });
}

function startGame({ mode, label, questions }) {
  game = {
    mode,
    label,
    questions: questions.map((q) => ({ ...q, choices: shuffle(q.c), answer: q.c[0] })),
    index: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    joker: mode === "classic" ? 1 : 0,
    history: [],
    startedAt: Date.now(),
  };
  $("game-label").textContent = label;
  $("score").textContent = "0";
  showScreen("game");
  showQuestion();
}

// ===== Déroulement =====
function timeFor(q) {
  // Le test de QI est plus serré que le mode libre.
  return game.mode === "iq" ? Math.round(LEVELS[q.level].time * 0.75) : LEVELS[q.level].time;
}

function showQuestion() {
  const q = game.questions[game.index];
  const total = game.questions.length;

  $("question-count").textContent = `Question ${game.index + 1} / ${total}`;
  $("progress-bar").style.width = `${(game.index / total) * 100}%`;
  $("streak").textContent = game.streak >= 2 ? `🔥 Série de ${game.streak}` : "";
  $("q-category").textContent = `${CATEGORIES[q.cat].icon} ${CATEGORIES[q.cat].name} · ${LEVELS[q.level].name}`;
  $("question").textContent = q.q;
  $("feedback").className = "feedback hidden";
  $("btn-next").classList.add("hidden");

  $("btn-joker").classList.toggle("hidden", game.mode === "iq");
  $("btn-joker").disabled = game.joker <= 0;
  $("btn-joker").textContent = `🎲 Joker 50/50 (${game.joker})`;

  $("answers").innerHTML = "";
  q.choices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.className = "answer";
    btn.textContent = choice;
    btn.onclick = () => answer(choice);
    $("answers").appendChild(btn);
  });

  startTimer(timeFor(q));
}

function startTimer(seconds) {
  clearInterval(timerId);
  game.timeLeft = seconds;
  game.timeMax = seconds;
  const bar = $("timer-bar");
  bar.style.transition = "none";
  bar.style.width = "100%";
  bar.style.background = "var(--good)";
  void bar.offsetWidth; // relance la transition CSS
  bar.style.transition = "";
  renderTimer();
  timerId = setInterval(() => {
    game.timeLeft--;
    renderTimer();
    if (game.timeLeft <= 0) answer(null);
  }, 1000);
}

function renderTimer() {
  const ratio = game.timeLeft / game.timeMax;
  $("timer").textContent = `⏱ ${game.timeLeft} s`;
  $("timer").classList.toggle("warn", game.timeLeft <= 5);
  $("timer-bar").style.width = `${ratio * 100}%`;
  $("timer-bar").style.background = ratio > 0.5 ? "var(--good)" : ratio > 0.2 ? "var(--accent)" : "var(--bad)";
}

function answer(choice) {
  clearInterval(timerId);
  const q = game.questions[game.index];
  const ok = choice === q.answer;
  let gained = 0;

  if (ok) {
    game.correct++;
    game.streak++;
    game.bestStreak = Math.max(game.bestStreak, game.streak);
    const base = LEVELS[q.level].points;
    const timeBonus = Math.round(base * (game.timeLeft / game.timeMax));
    const streakBonus = game.streak >= 3 ? 5 * (game.streak - 2) : 0;
    gained = base + timeBonus + streakBonus;
    game.score += gained;
  } else {
    game.streak = 0;
  }

  game.history.push({ q, choice, ok, timeRatio: game.timeLeft / game.timeMax });
  $("score").textContent = game.score;

  document.querySelectorAll(".answer").forEach((btn) => {
    btn.disabled = true;
    if (btn.textContent === q.answer) btn.classList.add("correct");
    else if (btn.textContent === choice) btn.classList.add("wrong");
  });

  const title = ok ? `✅ Bravo ! +${gained} points` : choice === null ? "⏰ Temps écoulé !" : "❌ Raté !";
  const answerLine = ok ? "" : `<br>La bonne réponse était : <b>${q.answer}</b>`;
  $("feedback").innerHTML = `<b>${title}</b>${answerLine}<br><span style="color:var(--muted)">${q.e}</span>`;
  $("feedback").className = `feedback ${ok ? "good" : "bad"}`;

  $("btn-joker").disabled = true;
  const last = game.index === game.questions.length - 1;
  $("btn-next").textContent = last ? "Voir les résultats 🏁" : "Question suivante →";
  $("btn-next").classList.remove("hidden");
  $("btn-next").focus();
}

function useJoker() {
  if (game.joker <= 0) return;
  game.joker--;
  const q = game.questions[game.index];
  const wrong = shuffle([...document.querySelectorAll(".answer")].filter((b) => b.textContent !== q.answer)).slice(0, 2);
  wrong.forEach((b) => b.classList.add("removed"));
  $("btn-joker").disabled = true;
  $("btn-joker").textContent = "🎲 Joker 50/50 (0)";
}

function next() {
  game.index++;
  if (game.index >= game.questions.length) finish();
  else showQuestion();
}

// ===== Résultats =====
function estimateIQ() {
  // Points pondérés par la difficulté + un petit bonus de rapidité.
  const weight = { facile: 1, moyen: 2, difficile: 3 };
  let got = 0, max = 0;
  game.history.forEach(({ q, ok, timeRatio }) => {
    max += weight[q.level] * 1.2;
    if (ok) got += weight[q.level] * (1 + 0.2 * timeRatio);
  });
  const ratio = got / max;
  // Échelle 70 → 145
  return Math.round(70 + ratio * 75);
}

function iqLabel(iq) {
  if (iq >= 130) return "Très supérieur — génie en vue ! 🚀";
  if (iq >= 115) return "Supérieur à la moyenne — impressionnant ! 🌟";
  if (iq >= 100) return "Dans la moyenne haute — bien joué ! 👍";
  if (iq >= 85) return "Dans la moyenne — tu peux progresser ! 💪";
  return "Continue à t'entraîner, ça viendra ! 📚";
}

function finish() {
  clearInterval(timerId);
  const total = game.questions.length;
  const pct = Math.round((game.correct / total) * 100);
  const seconds = Math.round((Date.now() - game.startedAt) / 1000);

  $("progress-bar").style.width = "100%";
  $("result-emoji").textContent = pct >= 90 ? "🏆" : pct >= 70 ? "🎉" : pct >= 50 ? "🙂" : "🤔";
  $("result-title").textContent = pct >= 90 ? "Exceptionnel !" : pct >= 70 ? "Très bien !" : pct >= 50 ? "Pas mal !" : "Courage !";
  $("result-text").textContent = game.label;
  $("result-stats").innerHTML = [
    [game.score, "points"],
    [`${game.correct}/${total}`, "bonnes réponses"],
    [`${pct} %`, "réussite"],
    [game.bestStreak, "meilleure série"],
    [`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`, "durée"],
  ].map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("");

  const best = storage.get("best-scores", {});
  if (game.mode === "iq") {
    const iq = estimateIQ();
    const pos = Math.min(100, Math.max(0, ((iq - 70) / 75) * 100));
    $("iq-result").innerHTML = `
      <div>Ton QI estimé</div>
      <div class="iq-number">${iq}</div>
      <div><b>${iqLabel(iq)}</b></div>
      <div class="iq-scale"><div class="iq-marker" style="left:${pos}%"></div></div>
      <div class="iq-legend"><span>70</span><span>85</span><span>100</span><span>115</span><span>130</span><span>145</span></div>
      <p class="disclaimer">Estimation ludique basée sur tes réponses et ta rapidité. Ce n'est pas un test de QI officiel.</p>`;
    $("iq-result").classList.remove("hidden");
    if (!best["🧠 Test de QI"] || iq > parseInt(best["🧠 Test de QI"], 10)) best["🧠 Test de QI"] = `${iq} de QI`;
  } else {
    $("iq-result").classList.add("hidden");
    if (!best[game.label] || game.score > parseInt(best[game.label], 10)) best[game.label] = `${game.score} pts`;
  }
  storage.set("best-scores", best);

  $("recap").innerHTML = game.history.map(({ q, choice, ok }) => `
    <li>
      <span class="${ok ? "ok" : "ko"}">${ok ? "✔" : "✘"}</span> ${escapeHTML(q.q)}
      <small>Ta réponse : ${choice === null ? "<i>aucune (temps écoulé)</i>" : escapeHTML(choice)}${ok ? "" : ` · Bonne réponse : <b>${escapeHTML(q.answer)}</b>`}</small>
    </li>`).join("");

  showScreen("result");
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ===== Événements =====
$("btn-start").onclick = startClassic;
$("btn-iq").onclick = startIQ;
$("btn-joker").onclick = useJoker;
$("btn-next").onclick = next;
$("btn-replay").onclick = () => (game.mode === "iq" ? startIQ() : startClassic());
$("btn-home").onclick = () => { renderBestScores(); showScreen("home"); };
$("btn-quit").onclick = () => {
  if (confirm("Quitter la partie en cours ?")) {
    clearInterval(timerId);
    renderBestScores();
    showScreen("home");
  }
};

document.addEventListener("keydown", (e) => {
  if (!$("screen-game").classList.contains("active")) return;
  const buttons = [...document.querySelectorAll(".answer")];
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= buttons.length && !buttons[n - 1].disabled && !buttons[n - 1].classList.contains("removed")) buttons[n - 1].click();
});

renderOptions();
renderBestScores();
