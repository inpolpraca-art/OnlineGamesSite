// Bandit Wheel — автоматические раунды.
// Новый раунд каждые 20 секунд. Во время вращения ставки полностью заблокированы.

const BASE_SECTORS = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  3, 3, 3, 3,
  5, 5,
  10,
  20
];

const values = {
  1:  { color:'#e6d25d', text:'#261e13' },
  3:  { color:'#4e9d47', text:'#f9eed6' },
  5:  { color:'#4b87ad', text:'#f7e9d1' },
  10: { color:'#a44791', text:'#fff4dc' },
  20: { color:'#bd4830', text:'#fff0d5' }
};

const BET_STEP = 10;
const ROUND_BETTING_SECONDS = 20;
const SPIN_DURATION = 4800;

const canvas = document.querySelector('#wheel');
const ctx = canvas.getContext('2d');

const dialog = document.querySelector('#result-dialog');
const resultTitle = document.querySelector('#result-title');
const resultText = document.querySelector('#result-text');
const resultIcon = document.querySelector('#result-icon');

const countEl = document.querySelector('#spin-count');
const lastNumberEl = document.querySelector('#last-number');
const balanceEl = document.querySelector('#balance');
const availableBalanceEl = document.querySelector('#available-balance');
const summaryAmountEl = document.querySelector('#summary-amount');

const timerEl = document.querySelector('#timer');
const countdownEl = document.querySelector('#countdown');
const roundStateEl = document.querySelector('#round-state');
const roundLabelEl = document.querySelector('#round-label');
const roundHintEl = document.querySelector('#round-hint');

let sectors = [...BASE_SECTORS];
let rotation = 0;
let spinning = false;
let acceptingBets = true;
let spins = 0;
let secondsLeft = ROUND_BETTING_SECONDS;
let timerId = null;
let roundStartedAt = 0;
let recentResults = JSON.parse(localStorage.getItem('bandit_recent_results') || '[]');

let balance = Number(localStorage.getItem('bandit_balance'));
if (!Number.isFinite(balance) || balance < 0) balance = 1000;

// Отдельная ставка на каждый множитель.
const bets = {
  1: 0,
  3: 0,
  5: 0,
  10: 0,
  20: 0
};

function formatTokens(value) {
  return Math.max(0, Math.floor(value)).toLocaleString('ru-RU');
}

function totalBets() {
  return Object.values(bets).reduce((sum, value) => sum + value, 0);
}

function saveBalance() {
  localStorage.setItem('bandit_balance', String(balance));
}

function shuffleSectors() {
  // Перемешиваем числа перед каждым новым раундом.
  sectors = [...BASE_SECTORS];

  for (let i = sectors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sectors[i], sectors[j]] = [sectors[j], sectors[i]];
  }
}

function buildBetGrid() {
  document.querySelector('#bet-grid').innerHTML = Object.keys(values).map(number => `
    <div class="bet-row" data-number="${number}" style="--bet-color:${values[number].color}">
      <div class="bet-info">
        <b>×${number}</b>
        <span>${number == 20 ? 'редкий множитель' : 'множитель'}</span>
      </div>

      <button class="bet-control" type="button" data-action="minus" data-number="${number}" aria-label="Уменьшить ставку на ${number}">−</button>

      <div class="bet-amount">
        <strong id="bet-${number}">0</strong>
        <small>токенов</small>
      </div>

      <button class="bet-control" type="button" data-action="plus" data-number="${number}" aria-label="Увеличить ставку на ${number}">+</button>
    </div>
  `).join('');

  document.querySelectorAll('.bet-control').forEach(button => {
    button.addEventListener('click', () => {
      if (!acceptingBets || spinning) return;

      const number = Number(button.dataset.number);
      const action = button.dataset.action;

      if (action === 'plus') changeBet(number, BET_STEP);
      if (action === 'minus') changeBet(number, -BET_STEP);
    });
  });
}

function changeBet(number, delta) {
  if (!acceptingBets || spinning) return;

  if (delta > 0) {
    const available = balance - totalBets();

    if (available < delta) {
      return;
    }

    bets[number] += delta;
  } else {
    bets[number] = Math.max(0, bets[number] + delta);
    // Возвращаем уменьшенную ставку в доступный баланс.
  }

  renderBets();
}

function renderBets() {
  const total = totalBets();

  balanceEl.textContent = formatTokens(balance);
  availableBalanceEl.textContent = formatTokens(balance - total);
  summaryAmountEl.textContent = formatTokens(total);

  Object.keys(bets).forEach(number => {
    const amountEl = document.querySelector(`#bet-${number}`);
    if (amountEl) amountEl.textContent = formatTokens(bets[number]);

    const row = document.querySelector(`.bet-row[data-number="${number}"]`);
    if (row) row.classList.toggle('has-bet', bets[number] > 0);
    if (row) row.classList.toggle('locked', !acceptingBets || spinning);
  });

  document.querySelectorAll('.bet-control').forEach(button => {
    button.disabled = !acceptingBets || spinning;
  });
}

function clearBets() {
  Object.keys(bets).forEach(number => {
    bets[number] = 0;
  });
  renderBets();
}


function renderRecentResults() {
  const el = document.querySelector('#recent-results');
  if (!el) return;
  if (!recentResults.length) {
    el.innerHTML = '<span class="recent-empty">Пока нет результатов</span>';
    return;
  }
  el.innerHTML = recentResults.slice(0, 3).map(number => `
    <div class="recent-item" style="--result-color:${values[number].color}">×${number}</div>
  `).join('');
}

const PLAYER_NAMES = ['RustKid', 'Bandit_77', 'Wolf', 'Nikita', 'Hunter', 'Kira'];
function renderPlayers() {
  const grid = document.querySelector('#players-grid');
  if (!grid) return;
  const rows = PLAYER_NAMES.slice(0, 6).map((name, index) => {
    const picks = [1,3,5,10,20].filter((_, i) => (index + i) % 3 === 0).slice(0, 2);
    const betsForPlayer = picks.map((number, j) => ({ number, amount: (index + j + 1) * 10 }));
    const total = betsForPlayer.reduce((s,b) => s+b.amount, 0);
    return { name, bets: betsForPlayer, total };
  });
  grid.innerHTML = rows.map(row => `
    <div class="player-card">
      <div class="player-top">
        <span class="player-name">${row.name}</span>
        <span class="player-total">${formatTokens(row.total)} токенов</span>
      </div>
      <div class="player-bets">
        ${row.bets.map(b => `<span class="player-bet" style="--bet-color:${values[b.number].color}">×${b.number} · ${formatTokens(b.amount)}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function updatePlayersStatus() {
  const status = document.querySelector('#players-status');
  if (!status) return;
  status.textContent = acceptingBets ? 'Принимаются ставки' : 'Ставки закрыты';
}

function drawWheel(angle = rotation) {
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 9;
  const slice = Math.PI * 2 / sectors.length;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(angle);

  sectors.forEach((number, index) => {
    const start = -Math.PI / 2 + index * slice;
    const item = values[number];

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();

    ctx.strokeStyle = '#312419';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Лёгкая "поношенная" текстура.
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = .16;
    ctx.strokeStyle = '#271b12';
    ctx.lineWidth = 5;

    for (let line = 0; line < 4; line++) {
      const y = (index * 67 + line * 47) % radius - radius / 2;
      ctx.beginPath();
      ctx.moveTo(-radius, y);
      ctx.lineTo(radius, y + 15);
      ctx.stroke();
    }

    ctx.restore();

    ctx.save();
    ctx.rotate(start + slice / 2);
    ctx.translate(radius * .67, 0);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = item.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${number === 20 ? 33 : number === 10 ? 30 : 37}px Unbounded`;
    ctx.shadowColor = '#291b12';
    ctx.shadowBlur = 2;
    ctx.fillText(number, 0, 0);
    ctx.restore();
  });

  // Центр.
  ctx.beginPath();
  ctx.arc(0, 0, radius * .275, 0, Math.PI * 2);
  ctx.fillStyle = '#c8b998';
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#3d2d20';
  ctx.stroke();

  ctx.save();
  ctx.globalAlpha = .3;
  ctx.strokeStyle = '#5e4936';
  ctx.lineWidth = 5;

  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(-radius * .22 + i * 12, -radius * .12);
    ctx.lineTo(radius * .2 - i * 8, radius * .16);
    ctx.stroke();
  }

  ctx.restore();

  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#794c31';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#26170e';
  ctx.stroke();

  ctx.restore();
}

function getWinner() {
  const winnerIndex = Math.floor(Math.random() * sectors.length);
  return {
    index: winnerIndex,
    number: sectors[winnerIndex]
  };
}

function setRoundUI() {
  timerEl.textContent = secondsLeft;
  countdownEl.textContent = acceptingBets
    ? `${secondsLeft} сек`
    : 'СТОП';

  updatePlayersStatus();

  if (acceptingBets) {
    roundStateEl.textContent = 'СТАВКИ';
    roundLabelEl.textContent = 'Сделайте ставки';
    roundHintEl.textContent = 'Можно ставить сразу на все числа';
  } else {
    roundStateEl.textContent = 'ИГРА';
    roundLabelEl.textContent = 'Колесо вращается';
    roundHintEl.textContent = 'Ставки временно заблокированы';
  }
}

function startBettingPhase() {
  acceptingBets = true;
  spinning = false;
  secondsLeft = ROUND_BETTING_SECONDS;
  roundStartedAt = Date.now();

  // Новая раскладка чисел для нового раунда.
  shuffleSectors();
  drawWheel(rotation);
  setRoundUI();
  renderBets();

  clearInterval(timerId);
  timerId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - roundStartedAt) / 1000);
    secondsLeft = Math.max(0, ROUND_BETTING_SECONDS - elapsed);
    setRoundUI();

    if (secondsLeft <= 0) {
      clearInterval(timerId);
      startRound();
    }
  }, 250);
}

function startRound() {
  if (spinning) return;

  acceptingBets = false;
  spinning = true;
  setRoundUI();
  renderBets();

  // Все ставки этого раунда списываются перед вращением.
  const lockedTotal = totalBets();
  balance -= lockedTotal;
  saveBalance();
  renderBets();

  const winner = getWinner();
  animateToWinner(winner);
}

function animateToWinner(winner) {
  const slice = Math.PI * 2 / sectors.length;
  const current = rotation % (Math.PI * 2);

  // Сектор-победитель ставим точно под указатель сверху.
  const target = -winner.index * slice - slice / 2;
  const extraTurns = Math.PI * 2 * (7 + Math.floor(Math.random() * 3));
  const finish = rotation + extraTurns + (target - current);

  const start = rotation;
  const startedAt = performance.now();

  function animate(now) {
    const progress = Math.min((now - startedAt) / SPIN_DURATION, 1);
    const eased = 1 - Math.pow(1 - progress, 4);

    rotation = start + (finish - start) * eased;
    drawWheel(rotation);

    if (progress < 1) {
      requestAnimationFrame(animate);
      return;
    }

    rotation %= Math.PI * 2;
    spinning = false;
    finishRound(winner.number);
  }

  requestAnimationFrame(animate);
}

function finishRound(number) {
  spins++;
  countEl.textContent = spins;
  lastNumberEl.textContent = `×${number}`;

  const total = totalBets();
  const winningBet = bets[number] || 0;
  const payout = winningBet * number;

  // Все поставленные токены уже зарезервированы в балансе:
  // здесь возвращается только выигрышная выплата.
  balance += payout;
  saveBalance();

  const won = winningBet > 0;

  resultIcon.textContent = number;
  resultIcon.style.background = values[number].color;
  resultIcon.style.color = values[number].text;

  resultTitle.textContent = won
    ? `Победа ×${number}!`
    : `Выпало ×${number}`;

  if (total === 0) {
    resultText.textContent = `Раунд завершён. Выиграл множитель ×${number}.`;
  } else if (won) {
    resultText.textContent =
      `На ×${number} было поставлено ${formatTokens(winningBet)} токенов. Выплата: ${formatTokens(payout)} токенов. Общая сумма ставок: ${formatTokens(total)}.`;
  } else {
    resultText.textContent =
      `Выпало ×${number}, но на него не было ставки. Сумма ставок за раунд: ${formatTokens(total)} токенов.`;
  }

  recentResults.unshift(number);
  recentResults = recentResults.slice(0, 3);
  localStorage.setItem('bandit_recent_results', JSON.stringify(recentResults));
  renderRecentResults();

  clearBets();
  renderBets();

  // Небольшое окно результата, после которого сразу начинается новый 20-секундный цикл.
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  }

  setTimeout(() => {
    if (dialog.open) dialog.close();
    startBettingPhase();
  }, 2200);
}

document.querySelector('#play-again').addEventListener('click', () => {
  if (dialog.open) dialog.close();
});

document.querySelector('#wallet-add').addEventListener('click', () => {
  // Только виртуальные демонстрационные токены.
  if (!acceptingBets || spinning) return;

  balance += 100;
  saveBalance();
  renderBets();
});

buildBetGrid();
renderRecentResults();
renderPlayers();
shuffleSectors();
renderBets();
drawWheel();
startBettingPhase();
