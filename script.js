const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzy_vS1mHaLfj3DinkFxR3i9azJlYC8AOecbaEBmZMmYkP1LYvOalWyMILjgoyCgAou2A/exec';

let remainingSpins = 0, totalSpent = 0, totalWon = 0, isSpinning = false;
const CONFIG = {
  SYMBOLS: ['♠', '7', '♥', '♦', '♣'],
  PAYOUTS: { '♠': 100, '7': 25, '♥': 10, '♦': 5, '♣': 1 }
};

let playerId = localStorage.getItem('playerId') || Math.random().toString(36).substring(2, 8).toUpperCase();
localStorage.setItem('playerId', playerId);
document.getElementById('playerIdText').textContent = playerId;

async function spin() {
  if (isSpinning || remainingSpins <= 0) return;
  isSpinning = true;
  
  remainingSpins--;
  totalSpent++;
  document.getElementById('spinCountText').textContent = remainingSpins;
  document.getElementById('spin-btn').disabled = true;

  const isWin = Math.random() < 0.38;
  let resSyms = [], payout = 0, rewardKey = '꽝';

  if (isWin) {
    const r = Math.random();
    let winSym = r < 0.05 ? '♠' : r < 0.15 ? '7' : '♦';
    resSyms = [winSym, winSym, winSym];
    payout = CONFIG.PAYOUTS[winSym];
    rewardKey = winSym === '♠' ? '잭팟' : winSym === '7' ? '럭키 세븐' : '더블';
  } else {
    resSyms = ['♣', '♠', '♥'];
  }

  const symH = 110;
  for(let i=1; i<=3; i++) {
    const r = document.getElementById('reel' + i);
    r.lastElementChild.textContent = resSyms[i-1];
    r.style.transition = 'none';
    r.style.transform = 'translateY(0)';
    r.offsetHeight; 
    r.style.transition = `transform ${1.2 + i*0.2}s cubic-bezier(0.45, 0.05, 0.55, 0.95)`;
    r.style.transform = `translateY(-${29 * symH}px)`;
  }

  setTimeout(() => {
    totalWon += payout;
    const rtp = ((totalWon / totalSpent) * 100).toFixed(0);
    document.getElementById('actualRtpText').textContent = rtp + '%';
    
    fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: `id=${playerId}&result=${encodeURIComponent(rewardKey)}` });

    const log = document.createElement('div');
    log.style.padding = "10px 0";
    log.style.borderBottom = "1px solid #333";
    log.innerHTML = `<span style="color:#8e8e93">${resSyms.join(' ')}</span> <b style="float:right; color:${payout > 0 ? '#30d158' : '#ff453a'}">${payout > 0 ? '+' + payout : '0'}</b>`;
    document.getElementById('history').prepend(log);

    isSpinning = false;
    document.getElementById('spin-btn').disabled = remainingSpins <= 0;
  }, 2000);
}

async function loadData() {
  try {
    const res = await fetch(`${SCRIPT_URL}?id=${playerId}`);
    const data = await res.json();
    remainingSpins = data.spins || 0;
    document.getElementById('spinCountText').textContent = remainingSpins;
    document.getElementById('spin-btn').disabled = remainingSpins <= 0;
    document.getElementById('spin-btn').textContent = "SPIN";
  } catch (e) { document.getElementById('spin-btn').textContent = "ERROR"; }
}

document.getElementById('spin-btn').onclick = spin;
document.getElementById('history-btn').onclick = () => document.getElementById('historyModal').classList.remove('hidden');
document.getElementById('closeHistory').onclick = () => document.getElementById('historyModal').classList.add('hidden');
document.getElementById('copyBtn').onclick = () => {
  navigator.clipboard.writeText(playerId).then(() => alert('ID Copied'));
};

(function init() {
  for(let i=1; i<=3; i++) {
    const r = document.getElementById('reel'+i);
    for(let j=0; j<30; j++) {
      const d = document.createElement('div'); d.className = 'symbol';
      d.textContent = CONFIG.SYMBOLS[j % 5]; r.appendChild(d);
    }
  }
  loadData();
})();
