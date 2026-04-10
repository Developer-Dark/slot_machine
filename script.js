const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzy_vS1mHaLfj3DinkFxR3i9azJlYC8AOecbaEBmZMmYkP1LYvOalWyMILjgoyCgAou2A/exec';

const CONFIG = {
  TARGET_RTP: 92.0,
  BASE_WIN_RATE: 0.42,
  SYMBOLS: ['♠', '7', '♥', '♦', '♣'],
  PAYOUTS: { '♠': 50, '7': 15, '♥': 5, '♦': 2, '♣': 0.5 }
};

let stats = { totalSpent: 0, totalWon: 0 };
let remainingSpins = 0;
let isSpinning = false;
let playerId = localStorage.getItem('playerId') || Math.random().toString(36).substring(2, 8).toUpperCase();
localStorage.setItem('playerId', playerId);
document.getElementById('playerIdText').textContent = playerId;

function updateStatsUI() {
  const actualRtp = stats.totalSpent === 0 ? 0 : (stats.totalWon / stats.totalSpent) * 100;
  const diff = actualRtp - CONFIG.TARGET_RTP;
  document.getElementById('actualRtp').textContent = actualRtp.toFixed(1) + '%';
  const diffEl = document.getElementById('rtpDiff');
  diffEl.textContent = (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
  diffEl.style.color = Math.abs(diff) < 2 ? '#f9fafb' : (diff > 0 ? '#f04452' : '#3182f6');
}

async function spin() {
  if (isSpinning || remainingSpins <= 0) return;
  isSpinning = true;
  remainingSpins--;
  stats.totalSpent += 1;
  
  document.getElementById('spinCountText').textContent = remainingSpins;
  document.getElementById('spin-btn').disabled = true;
  document.getElementById('result-text').textContent = "분석 중...";
  document.body.classList.remove('celebrate');
  document.getElementById('main-card').classList.remove('jackpot-active');

  const isWin = Math.random() < CONFIG.BASE_WIN_RATE;
  let resultSymbols = [], payout = 0, winSymbol = '';

  if (isWin) {
    const r = Math.random();
    if (r < 0.02) winSymbol = '♠';
    else if (r < 0.1) winSymbol = '7';
    else if (r < 0.3) winSymbol = '♥';
    else winSymbol = '♣';
    resultSymbols = [winSymbol, winSymbol, winSymbol];
    payout = CONFIG.PAYOUTS[winSymbol];
  } else {
    do {
      resultSymbols = [0,0,0].map(() => CONFIG.SYMBOLS[Math.floor(Math.random()*5)]);
    } while (resultSymbols[0] === resultSymbols[1] && resultSymbols[1] === resultSymbols[2]);
  }

  const symbolHeight = 110;
  for(let i=1; i<=3; i++) {
    const reel = document.getElementById('reel' + i);
    reel.lastElementChild.textContent = resultSymbols[i-1];
    reel.style.transition = 'none';
    reel.style.transform = 'translateY(0)';
    reel.offsetHeight; 
    reel.style.transition = `transform ${1.2 + i*0.2}s cubic-bezier(0.45, 0.05, 0.55, 0.95)`;
    reel.style.transform = `translateY(-${39 * symbolHeight}px)`;
  }

  setTimeout(() => {
    stats.totalWon += payout;
    document.getElementById('result-text').textContent = payout > 0 ? "당첨 결과 확인" : "미적중";
    updateStatsUI();
    
    if (payout > 0) {
      document.body.classList.add('celebrate');
      if (payout >= 15) document.getElementById('main-card').classList.add('jackpot-active');
    }

    const div = document.createElement('div');
    div.style.cssText = "display:flex; justify-content:space-between; padding:12px; border-bottom:1px solid #2c2d31;";
    div.innerHTML = `<span>${resultSymbols.join(' ')}</span> <b>${payout > 0 ? payout : '-'}</b>`;
    document.getElementById('history').prepend(div);

    fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: `id=${playerId}&result=${payout}` });
    isSpinning = false;
    document.getElementById('spin-btn').disabled = (remainingSpins <= 0);
  }, 2000);
}

async function loadData() {
  try {
    const res = await fetch(`${SCRIPT_URL}?id=${playerId}&t=${Date.now()}`);
    const data = await res.json();
    remainingSpins = data.spins || 0;
    document.getElementById('spinCountText').textContent = remainingSpins;
    document.getElementById('spin-btn').textContent = "스핀 시작";
    document.getElementById('spin-btn').disabled = (remainingSpins <= 0);
  } catch (e) {
    document.getElementById('spin-btn').textContent = "연결 오류";
  }
}

document.getElementById('spin-btn').onclick = spin;
document.getElementById('history-btn').onclick = () => document.getElementById('historyModal').classList.remove('hidden');
document.getElementById('closeHistory').onclick = () => document.getElementById('historyModal').classList.add('hidden');
document.getElementById('copyBtn').onclick = () => {
  navigator.clipboard.writeText(playerId).then(() => alert('ID가 복사되었습니다.'));
};

(function init() {
  for(let i=1; i<=3; i++) {
    const r = document.getElementById('reel'+i);
    for(let j=0; j<40; j++) {
      const d = document.createElement('div');
      d.className = 'symbol';
      d.textContent = CONFIG.SYMBOLS[Math.floor(Math.random()*5)];
      r.appendChild(d);
    }
  }
  loadData();
})();
