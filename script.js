'use strict';

/* ══════════════════════════════════════════════
   STATE
══════════════════════════════════════════════ */
const state = {
  players: [],
  imposterCount: 1,
  roles: [],
  currentReveal: 0,
  selectedWord: null,
};

/* ══════════════════════════════════════════════
   PERSISTENCE
══════════════════════════════════════════════ */
function saveToStorage() {
  localStorage.setItem('iwg_players', JSON.stringify(state.players));
  localStorage.setItem('iwg_imposters', String(state.imposterCount));
}

function loadFromStorage() {
  try {
    const p = localStorage.getItem('iwg_players');
    const i = localStorage.getItem('iwg_imposters');
    if (p) state.players = JSON.parse(p);
    if (i) state.imposterCount = Math.max(1, Math.min(3, Number(i)));
  } catch (_) {}
}

/* ══════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════ */
function uid() { return Math.random().toString(36).slice(2, 9); }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function initials(name) { return name.trim().slice(0, 2).toUpperCase(); }
function minPlayersFor(count) { return count === 1 ? 3 : count === 2 ? 6 : 8; }

/* ══════════════════════════════════════════════
   SCREEN ROUTING
══════════════════════════════════════════════ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

/* ══════════════════════════════════════════════
   SETUP SCREEN
══════════════════════════════════════════════ */
function renderPlayerList() {
  const list = document.getElementById('player-list');
  list.innerHTML = '';

  state.players.forEach(player => {
    const item = document.createElement('div');
    item.className = 'player-item';
    item.dataset.id = player.id;

    const avatar = document.createElement('div');
    avatar.className = 'player-item-avatar';
    avatar.textContent = initials(player.name);

    const nameEl = document.createElement('span');
    nameEl.className = 'player-item-name';
    nameEl.textContent = player.name;
    nameEl.setAttribute('role', 'text');

    const actions = document.createElement('div');
    actions.className = 'player-item-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn edit';
    editBtn.setAttribute('aria-label', `Edit ${player.name}`);
    editBtn.textContent = '✏️';
    editBtn.addEventListener('click', () => startEdit(player.id, nameEl, avatar, editBtn));

    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn delete';
    delBtn.setAttribute('aria-label', `Remove ${player.name}`);
    delBtn.textContent = '🗑';
    delBtn.addEventListener('click', () => removePlayer(player.id));

    actions.append(editBtn, delBtn);
    item.append(avatar, nameEl, actions);
    list.appendChild(item);
  });

  validateSetup();
}

function startEdit(id, nameEl, avatar, editBtn) {
  if (nameEl.isEditing) return;
  nameEl.isEditing = true;
  nameEl.contentEditable = 'true';
  nameEl.focus();
  document.execCommand('selectAll', false, null);

  editBtn.textContent = '✔️';
  editBtn.setAttribute('aria-label', 'Save name');
  editBtn.replaceWith(editBtn.cloneNode(true));

  const saveBtn = nameEl.parentElement.querySelector('.icon-btn.edit');
  saveBtn.addEventListener('click', () => commitEdit(id, nameEl, avatar, saveBtn));

  nameEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(id, nameEl, avatar, saveBtn); }
    if (e.key === 'Escape') { cancelEdit(id, nameEl, avatar, saveBtn); }
  });

  nameEl.addEventListener('blur', () => {
    setTimeout(() => { if (nameEl.isEditing) commitEdit(id, nameEl, avatar, saveBtn); }, 150);
  }, { once: true });
}

function commitEdit(id, nameEl, avatar, saveBtn) {
  const newName = nameEl.textContent.trim().slice(0, 20);
  if (!newName) { cancelEdit(id, nameEl, avatar, saveBtn); return; }
  const player = state.players.find(p => p.id === id);
  if (player) { player.name = newName; saveToStorage(); }
  nameEl.contentEditable = 'false';
  nameEl.isEditing = false;
  nameEl.textContent = newName;
  avatar.textContent = initials(newName);
  saveBtn.textContent = '✏️';
}

function cancelEdit(id, nameEl, avatar, saveBtn) {
  const player = state.players.find(p => p.id === id);
  nameEl.contentEditable = 'false';
  nameEl.isEditing = false;
  if (player) nameEl.textContent = player.name;
  saveBtn.textContent = '✏️';
}

function addPlayer(name) {
  const trimmed = name.trim().slice(0, 20);
  if (!trimmed) return;
  if (state.players.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
    const input = document.getElementById('player-name-input');
    input.value = '';
    input.placeholder = 'Name already exists!';
    setTimeout(() => { input.placeholder = 'Enter player name…'; }, 1500);
    return;
  }
  state.players.push({ id: uid(), name: trimmed });
  saveToStorage();
  renderPlayerList();
  document.getElementById('player-name-input').value = '';
  document.getElementById('player-name-input').focus();
}

function removePlayer(id) {
  state.players = state.players.filter(p => p.id !== id);
  saveToStorage();
  renderPlayerList();
}

function updateImposterCount(delta) {
  const next = state.imposterCount + delta;
  if (next < 1 || next > 3) return;
  state.imposterCount = next;
  document.getElementById('imp-count').textContent = state.imposterCount;
  saveToStorage();
  validateSetup();
}

function validateSetup() {
  const count = state.players.length;
  const needed = minPlayersFor(state.imposterCount);
  const startBtn = document.getElementById('start-game-btn');
  const msg = document.getElementById('validation-msg');

  if (count < 3) {
    msg.textContent = 'Add at least 3 players to start.';
    startBtn.disabled = true;
  } else if (count < needed) {
    msg.textContent = `Need ${needed} players for ${state.imposterCount} imposter${state.imposterCount > 1 ? 's' : ''}.`;
    startBtn.disabled = true;
  } else {
    msg.textContent = '';
    startBtn.disabled = false;
  }
}

/* ══════════════════════════════════════════════
   GAME LOGIC
══════════════════════════════════════════════ */
function startGame() {
  state.selectedWord = randomItem(WORD_PAIRS);

  const shuffled = shuffle(state.players);
  const imposterIndices = new Set();
  while (imposterIndices.size < state.imposterCount) {
    imposterIndices.add(Math.floor(Math.random() * shuffled.length));
  }

  state.roles = shuffled.map((player, i) => ({
    playerId: player.id,
    name: player.name,
    isImposter: imposterIndices.has(i),
    word: imposterIndices.has(i) ? state.selectedWord.hint : state.selectedWord.word,
    roleLabel: imposterIndices.has(i) ? 'You Are The Imposter' : 'Your Word',
  }));

  state.currentReveal = 0;
  showRevealScreen();
}

/* ══════════════════════════════════════════════
   REVEAL SCREEN
══════════════════════════════════════════════ */
function showRevealScreen() {
  showScreen('screen-reveal');
  renderRevealCard();
}

const FLIP_DURATION = 550; // must match CSS transition duration in ms

function clearBackFace() {
  // Wipe secret content so it can never bleed through during animation
  const flipBack = document.getElementById('flip-back');
  flipBack.className = 'flip-back';
  document.getElementById('role-badge').textContent = '';
  document.getElementById('role-label').textContent = '';
  document.getElementById('role-word').textContent = '';
}

function populateCard(role) {
  // Front face
  document.getElementById('reveal-avatar').textContent = initials(role.name);
  document.getElementById('reveal-player-name').textContent = role.name;

  // Back face — safe to write now because card is facing front
  const flipBack = document.getElementById('flip-back');
  flipBack.className = 'flip-back ' + (role.isImposter ? 'is-imposter' : 'is-normal');
  document.getElementById('role-badge').textContent = '';
  document.getElementById('role-label').textContent = role.roleLabel;
  document.getElementById('role-word').textContent = role.word;
}

function renderRevealCard() {
  const role = state.roles[state.currentReveal];
  const total = state.roles.length;

  document.getElementById('reveal-progress').textContent =
    `Player ${state.currentReveal + 1} of ${total}`;

  // Card is already facing front here (first card or after nextPlayer settled)
  populateCard(role);
  document.getElementById('next-player-btn').classList.add('hidden');
}

function flipCard() {
  const flipInner = document.getElementById('flip-inner');
  if (flipInner.classList.contains('flipped')) return;
  flipInner.classList.add('flipped');
  setTimeout(() => {
    document.getElementById('next-player-btn').classList.remove('hidden');
  }, FLIP_DURATION);
}

function nextPlayer() {
  state.currentReveal++;
  const flipInner = document.getElementById('flip-inner');

  if (state.currentReveal >= state.roles.length) {
    // No next card — just go to start screen after flip-back
    clearBackFace();
    flipInner.classList.remove('flipped');
    setTimeout(() => showStartScreen(), FLIP_DURATION);
    return;
  }

  // Step 1: Wipe secret content immediately (card is still showing back face)
  clearBackFace();

  // Step 2: Flip back to front
  flipInner.classList.remove('flipped');

  // Step 3: Only after the flip-back animation finishes, write the next player's data
  setTimeout(() => {
    renderRevealCard();
  }, FLIP_DURATION);
}

/* ══════════════════════════════════════════════
   GAME START SCREEN
══════════════════════════════════════════════ */
function showStartScreen() {
  const starter = randomItem(state.roles);
  document.getElementById('first-player-name').textContent = starter.name;
  showScreen('screen-start');
}

/* ══════════════════════════════════════════════
   IMPOSTER REVEAL SCREEN
══════════════════════════════════════════════ */
function showImposterReveal() {
  const imposters = state.roles.filter(r => r.isImposter);

  // Build imposter cards
  const list = document.getElementById('imposter-list');
  list.innerHTML = '';
  imposters.forEach(imp => {
    const card = document.createElement('div');
    card.className = 'imposter-card';

    const av = document.createElement('div');
    av.className = 'imposter-card-avatar';
    av.textContent = initials(imp.name);

    const nm = document.createElement('span');
    nm.className = 'imposter-card-name';
    nm.textContent = imp.name;

    card.append(av, nm);
    list.appendChild(card);
  });

  document.getElementById('secret-word-display').textContent = state.selectedWord.word;
  document.getElementById('hint-word-display').textContent = state.selectedWord.hint;

  showScreen('screen-imposter-reveal');
}

/* ══════════════════════════════════════════════
   EVENT LISTENERS
══════════════════════════════════════════════ */
function initListeners() {
  const nameInput = document.getElementById('player-name-input');
  document.getElementById('add-player-btn').addEventListener('click', () => addPlayer(nameInput.value));
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addPlayer(nameInput.value); });

  document.getElementById('imp-minus').addEventListener('click', () => updateImposterCount(-1));
  document.getElementById('imp-plus').addEventListener('click', () => updateImposterCount(1));

  document.getElementById('start-game-btn').addEventListener('click', startGame);

  document.getElementById('reveal-card').addEventListener('click', flipCard);
  document.getElementById('next-player-btn').addEventListener('click', nextPlayer);

  document.getElementById('begin-game-btn').addEventListener('click', () => showScreen('screen-play'));

  document.getElementById('reveal-imposter-btn').addEventListener('click', showImposterReveal);

  document.getElementById('play-again-btn').addEventListener('click', startGame);
  document.getElementById('back-setup-btn').addEventListener('click', () => {
    renderPlayerList();
    showScreen('screen-setup');
  });
}

/* ══════════════════════════════════════════════
   SERVICE WORKER REGISTRATION
══════════════════════════════════════════════ */
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
function init() {
  loadFromStorage();
  document.getElementById('imp-count').textContent = state.imposterCount;
  renderPlayerList();
  initListeners();
  showScreen('screen-setup');
  registerSW();
}

document.addEventListener('DOMContentLoaded', init);

/* ══════════════════════════════════════════════
   PWA INSTALL PROMPT
══════════════════════════════════════════════ */
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const banner = document.getElementById('pwa-banner');
  banner.classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  document.getElementById('pwa-banner').classList.add('hidden');
  deferredInstallPrompt = null;
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('pwa-install-btn').addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      document.getElementById('pwa-banner').classList.add('hidden');
    }
    deferredInstallPrompt = null;
  });

  document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
    document.getElementById('pwa-banner').classList.add('hidden');
  });
});
