const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzy_vS1mHaLfj3DinkFxR3i9azJlYC8AOecbaEBmZMmYkP1LYvOalWyMILjgoyCgAou2A/exec';

const CONFIG = {
  TARGET_RTP: 92.0,
  BASE_WIN_RATE: 0.42, // 당첨 확률을 42%로 상향 (체감 성능 개선)
  SYMBOLS_DATA: {
    '♠': { name: '잭팟', weight: 0.004, payout: 50 },
    '7': { name: '럭키 세븐', weight: 0.031, payout: 15 },
    '♥': { name: '트리플', weight: 0.115, payout: 5 },
    '♦': { name: '더블', weight: 0.25, payout: 2 },
    '♣': { name: '하프-백', weight: 0.60, payout: 0.5 }
  }
};

const SYMBOLS = Object.keys(CONFIG.SYMBOLS_DATA);
let stats = { totalSpent: 0, totalWon: 0 };
let remainingSpins = 0;
let isSpinning = false;

let playerId = localStorage.getItem('playerId') || Math.random().toString(36).substring(2, 9);
localStorage.setItem('playerId', playerId);
document.getElementById('playerIdText').textContent = playerId;

function updateStatsUI() {
  const actualRtp = stats.totalSpent === 0 ? 0 : (stats.totalWon / stats.totalSpent) * 100;
  const diff = actualRtp - CONFIG.TARGET_RTP;
  document.getElementById('actualRtp').textContent = actualRtp.toFixed(1) + '%';
  const diffEl = document.getElementById('rtpDiff');
  diffEl.textContent = (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
  diffEl.className = 'value ' + (Math.abs(diff) < 2 ? '' : (diff > 0 ? 'diff-plus' : 'diff-minus'));

  const probList = document.getElementById('probList');
  probList.innerHTML = Object.entries(CONFIG.SYMBOLS_DATA).map(([sym, data]) => {
    const realProb = (CONFIG.BASE_WIN_RATE * data.weight * 100).toFixed(1);
    return `<div class="prob-tag"><span>${sym}</span> <b>${realProb}%</b></div>`;
  }).join('');
}

function pickWeightedSymbol() {
  let r = Math.random(), acc = 0;
  for (const sym of SYMBOLS) {
    acc += CONFIG.SYMBOLS_DATA[sym].weight;
    if (r <= acc) return sym;
  }
  return '♣';
}

async function spin() {
  if (isSpinning || remainingSpins <= 0) return;
  isSpinning = true;
  remainingSpins--;
  stats.totalSpent += 1;
  document.getElementById('spinCountText').textContent = remainingSpins;
  document.getElementById('spin-btn').disabled = true;
  document.getElementById('main-card').className = 'card main';
  document.getElementById('result').textContent = "결과 확인 중...";

  const isWin = Math.random() < CONFIG.BASE_WIN_RATE;
  let finalSymbols = [], reward = { name: '꽝', payout: 0, sym: '' };

  if (isWin) {
    const s = pickWeightedSymbol();
    finalSymbols = [s, s, s];
    reward = { ...CONFIG.SYMBOLS_DATA[s], sym: s };
  } else {
    do {
      finalSymbols = [SYMBOLS[Math.floor(Math.random()*5)], SYMBOLS[Math.floor(Math.random()*5)], SYMBOLS[Math.floor(Math.random()*5)]];
    } while (finalSymbols[0] === finalSymbols[1] && finalSymbols[1] === finalSymbols[2]);
  }

  const reels = [document.getElementById('reel1'), document.getElementById('reel2'), document.getElementById('reel3')];
  reels.forEach((reel, i) => {
    reel.lastElementChild.textContent = finalSymbols[i];
    reel.style.transition = 'none';
    reel.style.transform = 'translateY(0)';
    setTimeout(() => {
      reel.style.transition = `transform ${2 + i * 0.4}s cubic-bezier(0.1, 0, 0.1, 1)`;
      reel.style.transform = `translateY(-3900px)`; // (40-1)*100
    }, 50);
  });

  setTimeout(async () => {
    stats.totalWon += reward.payout;
    document.getElementById('result').textContent = reward.name;
    if (reward.payout > 0) {
      const cls = reward.sym === '♠' ? 'win-jackpot' : (reward.payout >= 15 ? 'win-high' : 'win-normal');
      document.getElementById('main-card').classList.add(cls);
    }
    updateStatsUI();
    addHistory(finalSymbols.join(' '), reward.name, reward.payout > 0);
    
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `id=${playerId}&result=${encodeURIComponent(reward.name)}`
      });
    } catch(e) {}
    
    isSpinning = false;
    document.getElementById('spin-btn').disabled = (remainingSpins <= 0);
  }, 3200);
}

function addHistory(symbols, reward, isWin) {
  const div = document.createElement('div');
  div.className = `entry ${isWin ? 'win' : ''}`;
  div.innerHTML = `<span>${symbols}</span><strong>${reward}</strong>`;
  document.getElementById('history').prepend(div);
}

async function loadData() {
  const btn = document.getElementById('spin-btn');
  try {
    const res = await fetch(`${SCRIPT_URL}?id=${playerId}`);
    const data = await res.json();
    remainingSpins = data.spins || 0;
    document.getElementById('spinCountText').textContent = remainingSpins;
    btn.textContent = "SPIN";
    btn.disabled = (remainingSpins <= 0);
  } catch (e) { btn.textContent = "연결 오류"; }
}

document.getElementById('spin-btn').onclick = spin;
document.getElementById('history-btn').onclick = () => document.getElementById('historyModal').classList.remove('hidden');
document.getElementById('closeHistory').onclick = () => document.getElementById('historyModal').classList.add('hidden');
document.getElementById('copyBtn').onclick = () => {
  navigator.clipboard.writeText(playerId).then(() => alert('ID 복사됨'));
};

// 초기화
(function init() {
  for(let i=1; i<=3; i++) {
    const r = document.getElementById('reel'+i);
    for(let j=0; j<40; j++) {
      const d = document.createElement('div');
      d.className = 'symbol';
      d.textContent = SYMBOLS[Math.floor(Math.random()*5)];
      r.appendChild(d);
    }
  }
  updateStatsUI();
  loadData();
})();
