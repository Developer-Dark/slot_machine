const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx5fXtx23w-17rK-7_qb9WKH3XjHmMxOrPhfO28blTx25d-FLwaZpMBRKTeB9aIP8-W5g/exec';

const CONFIG = {
  SYMBOLS: ['♠', '7', '♥', '♦', '♣'],
  PAYOUTS: { '♠': 100.0, '7': 25.0, '♥': 10.0, '♦': 5.0, '♣': 1.0 }
};

let balance = 0.0, remainingSpins = 0, totalSpent = 0, totalWon = 0, isSpinning = false;

let playerId = localStorage.getItem('playerId') || "WAL-" + Math.random().toString(36).substring(2, 8).toUpperCase();
localStorage.setItem('playerId', playerId);
document.getElementById('playerIdText').textContent = playerId;

async function spin() {
  if (isSpinning || remainingSpins <= 0) return;
  isSpinning = true;
  
  remainingSpins--;
  totalSpent += 1;
  document.getElementById('spinCountText').textContent = remainingSpins;
  document.getElementById('spin-btn').disabled = true;
  const statusTag = document.getElementById('status-tag');
  statusTag.textContent = "VERIFYING...";
  statusTag.style.color = "#ffcc00";

  document.body.classList.remove('jackpot-win');
  document.getElementById('main-card').classList.remove('jackpot-active');

  const isWin = Math.random() < 0.38;
  let resSyms = [], payout = 0, winSym = '', rewardKey = '꽝';

  if (isWin) {
    const r = Math.random();
    if (r < 0.03) { winSym = '♠'; rewardKey = '잭팟'; }
    else if (r < 0.12) { winSym = '7'; rewardKey = '럭키 세븐'; }
    else if (r < 0.4) { winSym = '♥'; rewardKey = '트리플'; }
    else { winSym = '♦'; rewardKey = '더블'; }
    resSyms = [winSym, winSym, winSym];
    payout = CONFIG.PAYOUTS[winSym];
  } else {
    do { resSyms = [0,0,0].map(() => CONFIG.SYMBOLS[Math.floor(Math.random()*5)]); } 
    while (resSyms[0] === resSyms[1] && resSyms[1] === resSyms[2]);
    // ♣♣♣ 잭팟은 아니지만 소액 반환일 경우
    if (resSyms.every(s => s === '♣')) { payout = 1.0; rewardKey = '하프-백'; }
  }

  const symH = 130;
  for(let i=1; i<=3; i++) {
    const r = document.getElementById('reel' + i);
    r.lastElementChild.textContent = resSyms[i-1];
    r.style.transition = 'none';
    r.style.transform = 'translateY(0)';
    r.offsetHeight; 
    r.style.transition = `transform ${1.5 + i*0.2}s cubic-bezier(0.4, 0, 0.2, 1)`;
    r.style.transform = `translateY(-${39 * symH}px)`;
  }

  setTimeout(() => {
    totalWon += payout;
    balance += payout;
    
    document.getElementById('balanceText').textContent = balance.toFixed(2);
    document.getElementById('actualRtp').textContent = ((totalWon/totalSpent)*100).toFixed(0) + '%';
    
    if (payout > 0) {
      statusTag.textContent = `SUCCESS +${payout.toFixed(2)}`;
      statusTag.style.color = "#00ff88";
      if (payout >= 25) {
        document.body.classList.add('jackpot-win');
        document.getElementById('main-card').classList.add('jackpot-active');
      }
    } else {
      statusTag.textContent = "FAILED (-1.00)";
      statusTag.style.color = "#ff4444";
    }

    // 서버로 한글 rewardKey 전송 (Code.gs와 일치)
    fetch(SCRIPT_URL, { 
      method: 'POST', 
      mode: 'no-cors', 
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `id=${playerId}&result=${encodeURIComponent(rewardKey)}` 
    });

    const log = document.createElement('div');
    log.style.cssText = "display:flex; justify-content:space-between; padding:15px; border-bottom:1px solid #222; font-family:monospace; font-size:13px;";
    log.innerHTML = `<span>[${resSyms.join('|')}]</span> <b style="color:${payout > 0 ? '#00ff88':'#707070'}">${payout > 0 ? '+' + payout.toFixed(2) : '0.00'}</b>`;
    document.getElementById('history').prepend(log);

    isSpinning = false;
    document.getElementById('spin-btn').disabled = (remainingSpins <= 0);
  }, 2300);
}

async function loadData() {
  try {
    const res = await fetch(`${SCRIPT_URL}?id=${playerId}&t=${Date.now()}`);
    const data = await res.json();
    remainingSpins = data.spins || 0;
    // 서버 잔액 데이터가 있다면 반영, 없다면 스핀 비례 기본치
    balance = data.balance || (remainingSpins * 1.0); 
    document.getElementById('spinCountText').textContent = remainingSpins;
    document.getElementById('balanceText').textContent = balance.toFixed(2);
    document.getElementById('spin-btn').textContent = "CONFIRM TRADE";
    document.getElementById('spin-btn').disabled = (remainingSpins <= 0);
  } catch (e) { document.getElementById('spin-btn').textContent = "ERROR: RECONNECTING"; }
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
