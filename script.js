const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzy_vS1mHaLfj3DinkFxR3i9azJlYC8AOecbaEBmZMmYkP1LYvOalWyMILjgoyCgAou2A/exec';

const CONFIG = {
  SYMBOLS: ['♠', '7', '♥', '♦', '♣'],
  PAYOUTS: { '♠': 100.0, '7': 25.0, '♥': 10.0, '♦': 5.0, '♣': 1.0 }
};

let balance = 0.0;
let remainingSpins = 0;
let totalSpent = 0;
let totalWon = 0;
let isSpinning = false;

let playerId = localStorage.getItem('playerId') || "WAL-" + Math.random().toString(36).substring(2, 8).toUpperCase();
localStorage.setItem('playerId', playerId);
document.getElementById('playerIdText').textContent = playerId;

async function spin() {
  if (isSpinning || remainingSpins <= 0) return;
  isSpinning = true;
  
  // 가상 화폐 차감
  remainingSpins--;
  totalSpent += 1;
  document.getElementById('spinCountText').textContent = remainingSpins;
  document.getElementById('spin-btn').disabled = true;
  document.getElementById('status-tag').textContent = "PROCESSING...";
  document.getElementById('status-tag').style.color = "#ffcc00";

  document.body.classList.remove('jackpot-win');
  document.getElementById('main-card').classList.remove('jackpot-active');

  const isWin = Math.random() < 0.4;
  let resSyms = [], payout = 0, winSym = '';

  if (isWin) {
    const r = Math.random();
    if (r < 0.03) winSym = '♠';
    else if (r < 0.12) winSym = '7';
    else if (r < 0.4) winSym = '♥';
    else winSym = '♦';
    resSyms = [winSym, winSym, winSym];
    payout = CONFIG.PAYOUTS[winSym];
  } else {
    do { resSyms = [0,0,0].map(() => CONFIG.SYMBOLS[Math.floor(Math.random()*5)]); } 
    while (resSyms[0] === resSyms[1] && resSyms[1] === resSyms[2]);
  }

  const symH = 120;
  for(let i=1; i<=3; i++) {
    const r = document.getElementById('reel' + i);
    r.lastElementChild.textContent = resSyms[i-1];
    r.style.transition = 'none';
    r.style.transform = 'translateY(0)';
    r.offsetHeight; 
    r.style.transition = `transform ${1.5 + i*0.2}s cubic-bezier(0.45, 0.05, 0.55, 0.95)`;
    r.style.transform = `translateY(-${39 * symH}px)`;
  }

  setTimeout(() => {
    totalWon += payout;
    balance += payout; // 실제 당첨금 합산
    
    document.getElementById('balanceText').textContent = balance.toFixed(2);
    document.getElementById('actualRtp').textContent = ((totalWon/totalSpent)*100).toFixed(0) + '%';
    
    if (payout > 0) {
      document.getElementById('status-tag').textContent = `RECEIVED +${payout.toFixed(2)}`;
      document.getElementById('status-tag').style.color = var(--accent);
      if (payout >= 25) {
        document.body.classList.add('jackpot-win');
        document.getElementById('main-card').classList.add('jackpot-active');
      }
    } else {
      document.getElementById('status-tag').textContent = "TRANSACTION FAILED";
      document.getElementById('status-tag').style.color = "#ff4444";
    }

    const log = document.createElement('div');
    log.style.cssText = "display:flex; justify-content:space-between; padding:12px; border-bottom:1px solid #222; font-family:monospace; font-size:12px;";
    log.innerHTML = `<span>${resSyms.join('|')}</span> <b style="color:${payout > 0 ? '#00ff88':'#707070'}">${payout > 0 ? '+' + payout.toFixed(2) : '0.00'}</b>`;
    document.getElementById('history').prepend(log);

    fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: `id=${playerId}&result=${payout}` });
    isSpinning = false;
    document.getElementById('spin-btn').disabled = (remainingSpins <= 0);
  }, 2200);
}

async function loadData() {
  try {
    const res = await fetch(`${SCRIPT_URL}?id=${playerId}&t=${Date.now()}`);
    const data = await res.json();
    remainingSpins = data.spins || 0;
    balance = data.balance || (remainingSpins * 1.0); // 초기 잔액 설정 (예시)
    document.getElementById('spinCountText').textContent = remainingSpins;
    document.getElementById('balanceText').textContent = balance.toFixed(2);
    document.getElementById('spin-btn').textContent = "CONFIRM SPIN";
    document.getElementById('spin-btn').disabled = (remainingSpins <= 0);
  } catch (e) { document.getElementById('spin-btn').textContent = "NETWORK ERROR"; }
}

document.getElementById('spin-btn').onclick = spin;
document.getElementById('history-btn').onclick = () => document.getElementById('historyModal').classList.remove('hidden');
document.getElementById('closeHistory').onclick = () => document.getElementById('historyModal').classList.add('hidden');
document.getElementById('copyBtn').onclick = () => {
  navigator.clipboard.writeText(playerId).then(() => alert('Wallet ID Copied!'));
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
