const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzy_vS1mHaLfj3DinkFxR3i9azJlYC8AOecbaEBmZMmYkP1LYvOalWyMILjgoyCgAou2A/exec';

const CONFIG = {
  TARGET_RTP: 98.5, // 기대 환수율 상향
  BASE_WIN_RATE: 0.44, 
  SYMBOLS_DATA: {
    '♠': { name: 'JACKPOT', weight: 0.001, payout: 100, class: 'jackpot' }, // 잭팟 확률 낮춤
    '7': { name: 'LUCKY 7', weight: 0.04, payout: 15, class: 'seven' },
    '♥': { name: 'TRIPLE', weight: 0.12, payout: 5, class: 'normal' },
    '♦': { name: 'DOUBLE', weight: 0.25, payout: 2, class: 'normal' },
    '♣': { name: 'HALF', weight: 0.589, payout: 0.5, class: 'normal' }
  }
};

const SYMBOLS = Object.keys(CONFIG.SYMBOLS_DATA);
let stats = { totalSpent: 0, totalWon: 0 };
let remainingSpins = 0;
let isSpinning = false;

// 웨이브 효과 생성
function createWave(e) {
  const btn = e.currentTarget;
  const wave = document.createElement('span');
  wave.className = 'btn-wave';
  const rect = btn.getBoundingClientRect();
  wave.style.left = `${e.clientX - rect.left}px`;
  wave.style.top = `${e.clientY - rect.top}px`;
  btn.appendChild(wave);
  setTimeout(() => wave.remove(), 600);
}

async function spin(e) {
  createWave(e);
  if (isSpinning || remainingSpins <= 0) return;
  
  isSpinning = true;
  remainingSpins--;
  stats.totalSpent += 1;
  document.getElementById('spinCountText').textContent = remainingSpins;
  document.getElementById('spin-btn').disabled = true;
  document.getElementById('result').textContent = "연산 중...";

  const isWin = Math.random() < CONFIG.BASE_WIN_RATE;
  let finalSymbols = [], reward = { name: '꽝', payout: 0, sym: '', class: 'lose' };

  if (isWin) {
    let r = Math.random(), acc = 0;
    for (const sym of SYMBOLS) {
      acc += CONFIG.SYMBOLS_DATA[sym].weight;
      if (r <= acc) { reward = { ...CONFIG.SYMBOLS_DATA[sym], sym }; break; }
    }
    finalSymbols = [reward.sym, reward.sym, reward.sym];
  } else {
    do {
      finalSymbols = [SYMBOLS[Math.floor(Math.random()*5)], SYMBOLS[Math.floor(Math.random()*5)], SYMBOLS[Math.floor(Math.random()*5)]];
    } while (finalSymbols[0] === finalSymbols[1] && finalSymbols[1] === finalSymbols[2]);
  }

  for(let i=1; i<=3; i++) {
    const reel = document.getElementById('reel' + i);
    reel.lastElementChild.textContent = finalSymbols[i-1];
    reel.style.transition = 'none';
    reel.style.transform = 'translateY(0)';
    setTimeout(() => {
      reel.style.transition = `transform ${0.8 + (i-1)*0.2}s cubic-bezier(0.15, 0, 0.1, 1)`;
      reel.style.transform = `translateY(-3900px)`; 
    }, 20);
  }

  setTimeout(async () => {
    stats.totalWon += reward.payout;
    const resText = document.getElementById('result');
    resText.textContent = reward.name;
    resText.style.color = reward.class === 'jackpot' ? '#fff' : (reward.payout > 0 ? '#58a6ff' : '#484f58');
    
    updateStatsUI();
    addHistory(finalSymbols.join(' '), reward.name, reward.class);
    
    fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: `id=${playerId}&result=${encodeURIComponent(reward.name)}` });

    isSpinning = false;
    document.getElementById('spin-btn').disabled = (remainingSpins <= 0);
  }, 1500); 
}

function updateStatsUI() {
  const actualRtp = stats.totalSpent === 0 ? 0 : (stats.totalWon / stats.totalSpent) * 100;
  const diff = actualRtp - CONFIG.TARGET_RTP;
  document.getElementById('actualRtp').textContent = actualRtp.toFixed(1) + '%';
  const diffEl = document.getElementById('rtpDiff');
  diffEl.textContent = (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
  diffEl.style.color = Math.abs(diff) < 1 ? '#8b949e' : (diff > 0 ? '#3fb950' : '#f85149');
}

function addHistory(symbols, rewardName, rewardClass) {
  const div = document.createElement('div');
  div.className = `entry ${rewardClass}`;
  div.innerHTML = `<span>${symbols}</span><strong>${rewardName}</strong>`;
  document.getElementById('history').prepend(div);
}

// 초기화 및 바인딩
document.getElementById('spin-btn').onclick = spin;
document.getElementById('history-btn').onclick = (e) => {
  createWave(e);
  document.getElementById('historyModal').classList.remove('hidden');
};
document.getElementById('closeHistory').onclick = () => document.getElementById('historyModal').classList.add('hidden');
