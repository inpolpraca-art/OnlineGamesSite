// Bandit Wheel — игровая версия без реальных денег.
// Низкие множители встречаются чаще, как на референсе Rust Bandit Camp.
const sectors = [
  1,1,1,1,1,1,1,1,1,1,1,1,
  3,3,3,3,
  5,5,
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

const canvas = document.querySelector('#wheel');
const ctx = canvas.getContext('2d');

const spinButton = document.querySelector('#spin-button');
const dialog = document.querySelector('#result-dialog');
const resultTitle = document.querySelector('#result-title');
const resultText = document.querySelector('#result-text');
const resultIcon = document.querySelector('#result-icon');

const countEl = document.querySelector('#spin-count');
const lastNumberEl = document.querySelector('#last-number');
const balanceEl = document.querySelector('#balance');

const betAmountEl = document.querySelector('#bet-amount');
const summaryAmountEl = document.querySelector('#summary-amount');
const summaryMultiplierEl = document.querySelector('#summary-multiplier');
const potentialWinEl = document.querySelector('#potential-win');

let rotation = 0;
let spinning = false;
let spins = 0;

let balance = Number(localStorage.getItem('bandit_balance'));
if (!Number.isFinite(balance) || balance < 0) balance = 1000;

let betAmount = Number(localStorage.getItem('bandit_bet_amount'));
if (!Number.isFinite(betAmount) || betAmount < 1) betAmount = 10;

let selectedMultiplier = Number(localStorage.getItem('bandit_multiplier')) || 1;

const MIN_BET = 1;
const BET_STEP = 5;
const MAX_BET = 1000;

function saveState() {
  localStorage.setItem('bandit_balance', String(balance));
  localStorage.setItem('bandit_bet_amount', String(betAmount));
  localStorage.setItem('bandit_multiplier', String(selectedMultiplier));
}

function formatTokens(value) {
  return Math.max(0, Math.floor(value)).toLocaleString('ru-RU');
}

function updateUI() {
  balanceEl.textContent = formatTokens(balance);
  betAmountEl.textContent = formatTokens(betAmount);
  summaryAmountEl.textContent = formatTokens(betAmount);
  summaryMultiplierEl.textContent = selectedMultiplier;
  potentialWinEl.textContent = formatTokens(betAmount * selectedMultiplier);

  document.querySelectorAll('.quick-bet').forEach(button => {
    button.classList.toggle('active', Number(button.dataset.amount) === betAmount);
  });
}

document.querySelector('#bet-grid').innerHTML =
  Object.keys(values).map(number => `
    <button class="bet ${Number(number) === selectedMultiplier ? 'selected' : ''}"
            type="button"
            data-number="${number}"
            style="--bet-color:${values[number].color}">
      <b>×${number}</b>
      <span>${number == 20 ? 'редкий' : 'множитель'}</span>
    </button>
  `).join('');

document.querySelectorAll('.bet').forEach(button => {
  button.addEventListener('click', () => {
    if (spinning) return;

    selectedMultiplier = Number(button.dataset.number);

    document.querySelector('.bet.selected')?.classList.remove('selected');
    button.classList.add('selected');

    saveState();
    updateUI();
  });
});

function setBetAmount(amount) {
  if (spinning) return;

  betAmount = Math.max(MIN_BET, Math.min(MAX_BET, Math.floor(amount)));

  if (betAmount > balance && balance > 0) {
    betAmount = balance;
  }

  saveState();
  updateUI();
}

document.querySelector('#bet-minus').addEventListener('click', () => {
  setBetAmount(betAmount - BET_STEP);
});

document.querySelector('#bet-plus').addEventListener('click', () => {
  setBetAmount(betAmount + BET_STEP);
});

document.querySelectorAll('.quick-bet').forEach(button => {
  button.addEventListener('click', () => setBetAmount(Number(button.dataset.amount)));
});

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

  // Центр колеса.
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
  // Вращаем случайный сектор с сохранением реальной раскладки.
  const winnerIndex = Math.floor(Math.random() * sectors.length);
  return {
    index: winnerIndex,
    number: sectors[winnerIndex]
  };
}

function spin() {
  if (spinning) return;

  if (balance < betAmount) {
    resultIcon.textContent = '!';
    resultIcon.style.background = '#bd4830';
    resultIcon.style.color = '#fff0d5';
    resultTitle.textContent = 'Недостаточно токенов';
    resultText.textContent = `У вас ${formatTokens(balance)} токенов, а ставка составляет ${formatTokens(betAmount)}.`;
    dialog.showModal();
    return;
  }

  spinning = true;
  spinButton.disabled = true;

  // Ставка списывается перед вращением.
  balance -= betAmount;
  saveState();
  updateUI();

  const winner = getWinner();
  const slice = Math.PI * 2 / sectors.length;

  const current = rotation % (Math.PI * 2);
  const target = -winner.index * slice - slice / 2;
  const extraTurns = Math.PI * 2 * (7 + Math.floor(Math.random() * 3));
  const finish = rotation + extraTurns + (target - current);

  const start = rotation;
  const duration = 4800;
  const startedAt = performance.now();

  function animate(now) {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);

    rotation = start + (finish - start) * eased;
    drawWheel(rotation);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      rotation %= Math.PI * 2;
      spinning = false;
      spinButton.disabled = false;
      showResult(winner.number);
    }
  }

  requestAnimationFrame(animate);
}

function showResult(number) {
  spins++;
  countEl.textContent = spins;
  lastNumberEl.textContent = `×${number}`;

  const won = number === selectedMultiplier;
  const payout = won ? betAmount * number : 0;

  if (won) {
    balance += payout;
  }

  saveState();
  updateUI();

  resultIcon.textContent = number;
  resultIcon.style.background = values[number].color;
  resultIcon.style.color = values[number].text;

  resultTitle.textContent = won
    ? `Победа ×${number}!`
    : `Выпало ×${number}`;

  resultText.textContent = won
    ? `Вы поставили ${formatTokens(betAmount)} токенов и выиграли ${formatTokens(payout)} токенов.`
    : `Вы поставили ${formatTokens(betAmount)} токенов на ×${selectedMultiplier}. Выиграл сектор ×${number}.`;

  dialog.showModal();
}

spinButton.addEventListener('click', spin);

document.querySelector('#play-again').addEventListener('click', () => {
  dialog.close();
  setTimeout(spin, 100);
});

// Кнопка + теперь выдаёт небольшую демонстрационную порцию игровых токенов.
document.querySelector('#wallet-add').addEventListener('click', () => {
  if (spinning) return;

  balance += 100;
  saveState();
  updateUI();
});

updateUI();
drawWheel();
