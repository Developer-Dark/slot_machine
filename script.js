const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzy_vS1mHaLfj3DinkFxR3i9azJlYC8AOecbaEBmZMmYkP1LYvOalWyMILjgoyCgAou2A/exec';

const CONFIG = {
  SYMBOLS: ['♠', '7', '♥', '♦', '♣'],
  PAYOUTS: { '♠': 50, '7': 15, '♥': 5, '♦': 2, '♣': 0.5 },
  MESSAGES: {
    ready: "시스템 가동 대기 중",
    spinning: "알고리즘 연산 수행 중...",
    win: "데이터 매칭 성공: 리워드 발생",
    jackpot: "고가치 자산(Jackpot) 매칭 완료",
    lose: "매칭 데이터 없음: 세션 종료"
  }
};

let stats = { totalSpent: 0, totalWon: 0 };
let remainingSpins = 0;
let isSpinning = false;

let playerId = localStorage.getItem('playerId') || Math.random().toString(36).substring(2, 8).toUpperCase();
localStorage.setItem('playerId', playerId);
document.getElementById('playerIdText').textContent = playerId;

async function spin() {
  if (isSpinning || remainingSpins <= 0) return;
  
  isSpinning = true;
  remainingSpins--;
  stats.totalSpent += 1;
  
  document.getElementById('spinCountText').textContent = remainingSpins;
  document.getElementById('spin-btn').disabled = true;
  document.getElementById('main-title').textContent = CONFIG.MESSAGES.spinning;
  document.getElementById('sub-title').textContent = "네트워크 트랜잭션 처리 중";
  
  document.body.classList.remove('jackpot-win');

  const isWin = Math.random() < 0.42; 
  let resSyms = [], payout = 0, winSym = '';

  if (isWin) {
    const r = Math.random();
    if (r < 0.02) winSym = '♠';
    else if (r < 0.12) winSym = '7';
    else if (r < 0.4) winSym = '♥';
    else winSym = '♣';
    resSyms = [winSym, winSym, winSym];
    payout = CONFIG.PAYOUTS[winSym];
  } else {
    do { resSyms = [0,0,0].map(() => CONFIG.SYMBOLS[Math.floor(Math.random()*5)]); } 
    while (resSyms[0] === resSyms[1] && resSyms[1] === resSyms[2]);
  }

  // 릴 애니메이션 (120px 높이 기준)
  const symH = 120;
  for(let i=1; i<=3; i++) {
    const r = document.getElementById('reel' + i);
    r.lastElementChild.textContent = resSyms[i-1];
    r.style.transition = 'none';
    r.style.transform = 'translateY(0)';
    r.offsetHeight; 
    r.style.transition = `transform ${1.3 + i*0.2}s cubic-bezier(0.4, 0, 0.2, 1)`;
    r.style.transform = `translateY(-${39 * symH}px)`;
  }

  setTimeout(() => {
    stats.totalWon += payout;
    
    if (payout >= 15) {
      document.getElementById('main-title').textContent = CONFIG.MESSAGES.jackpot;
      document.body.classList.add('jackpot-win');
    } else if (payout > 0) {
      document.getElementById('main-title').textContent = CONFIG.MESSAGES.win;
    } else {
      document.getElementById('main-title').textContent = CONFIG.MESSAGES.lose;
    }

    const actualRtp = (stats.totalWon / stats.totalSpent) * 100;
    document.getElementById('actualRtp').textContent = actualRtp.toFixed(1) + '%';
    document.getElementById('rtpStatus').textContent = actualRtp > 92 ? "초과 달성" : "안정화 단계";

    // 로그 생성
    const entry = document.createElement('div');
    entry.style.cssText = "display:flex; justify-content:space-between; padding:16px; border-bottom:1px solid #202329; font-size:14px; font-family:monospace;";
    entry.innerHTML = `<span>[LOG] ${resSyms.join('|')}</span> <b style="color:${payout > 0 ? '#3182f6':'#6b7684'}">${payout > 0 ? 'WIN: ' + payout : 'FAIL'}</b>`;
    document.getElementById('history').prepend(entry);

    fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: `id=${playerId}&result=${payout}` });
    
    isSpinning = false;
    document.getElementById('spin-btn').disabled = (remainingSpins <= 0);
    document.getElementById('sub-title').textContent = "다음 시뮬레이션 준비 완료";
  }, 2200);
}

// 초기화 로직 (이전 구조 유지)
async function loadData() {
  try {
    const res = await fetch(`${SCRIPT_URL}?id=${playerId}&t=${Date.now()}`);
    const data = await res.json();
    remainingSpins = data.spins || 0;
    document.getElementById('spinCountText').textContent = remainingSpins;
    document.getElementById('spin-btn').textContent = "시뮬레이션 시작";
    document.getElementById('spin-btn').disabled = (remainingSpins <= 0);
  } catch (e) { document.getElementById('spin-btn').textContent = "서버 연결 오류"; }
}

document.getElementById('spin-btn').onclick = spin;
document.getElementById('history-btn').onclick = () => document.getElementById('historyModal').classList.remove('hidden');
document.getElementById('closeHistory').onclick = () => document.getElementById('historyModal').classList.add('hidden');
document.getElementById('copyBtn').onclick = () => {
  navigator.clipboard.writeText(playerId).then(() => alert('식별자가 복사되었습니다.'));
};

(function init() {
  for(let i=1; i<=3; i++) {
    const r = document.getElementById('reel'+i);
    r.innerHTML = '';
    for(let j=0; j<40; j++) {
      const d = document.createElement('div');
      d.className = 'symbol';
      d.textContent = CONFIG.SYMBOLS[Math.floor(Math.random()*5)];
      r.appendChild(d);
    }
  }
  loadData();
})();
