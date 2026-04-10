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
let playerId = localStorage.getItem('playerId') || Math.random().toString(36).substring(2, 9);
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
  document.getElementById('result-text').textContent = "행운을 빌어요!";
  document.body.classList.remove('celebrate');
  document.getElementById('main-card').classList.remove('jackpot-active');

  // 당첨 로직
  const isWin = Math.random() < CONFIG.BASE_WIN_RATE;
  let resultSymbols = [], payout = 0, winSymbol = '';

  if (isWin) {
    const r = Math.random();
    if (r < 0.01) winSymbol = '♠';
    else if (r < 0.05) winSymbol = '7';
    else if (r < 0.2) winSymbol = '♥';
    else if (r < 0.5) winSymbol = '♦';
    else winSymbol = '♣';
    resultSymbols = [winSymbol, winSymbol, winSymbol];
    payout = CONFIG.PAYOUTS[winSymbol];
  } else {
    do {
      resultSymbols = [0,0,0].map(() => CONFIG.SYMBOLS[Math.floor(Math.random()*5)]);
    } while (resultSymbols[0] === resultSymbols[1] && resultSymbols[1] === resultSymbols[2]);
  }

  // ★ 스핀 애니메이션 핵심 수정 ★
  const symbolHeight = 110; // CSS와 반드시 일치
  const totalSymbols = 40;  
  
  for(let i=1; i<=3; i++) {
    const reel = document.getElementById('reel' + i);
    // 마지막 심볼(결과값) 교체
    reel.lastElementChild.textContent = resultSymbols[i-1];
    
    // 트랜지션 초기화
    reel.style.transition = 'none';
    reel.style.transform = 'translateY(0)';
    
    // 리플로우 강제 발생 (브라우저가 위치 초기화를 인식하게 함)
    reel.offsetHeight; 
    
    // 애니메이션 실행
    reel.style.transition = `transform ${1.2 + i*0.2}s cubic-bezier(0.45, 0.05, 0.55, 0.95)`;
    reel.style.transform = `translateY(-${(totalSymbols - 1) * symbolHeight}px)`;
  }

  // 결과 처리
  setTimeout(() => {
    stats.totalWon += payout;
    const resultMsg = payout > 0 ? (winSymbol === '♠' ? "JACKPOT! 🎉" : "당첨되었습니다!") : "아쉬워요!";
    document.getElementById('result-text').textContent = resultMsg;
    updateStatsUI();
    
    if (payout > 0) {
      document.body.classList.add('celebrate');
      if (winSymbol === '♠' || winSymbol === '7') document.getElementById('main-card').classList.add('jackpot-active');
    }

    // 기록 추가
    const div = document.createElement('div');
    div.style.cssText = "display:flex; justify-content:space-between; padding:15px; border-bottom:1px solid #2c2d31; font-size:15px;";
    div.innerHTML = `<span>${resultSymbols.join(' ')}</span> <b style="color:${payout > 0 ? '#3182f6':'#8b949e'}">${payout > 0 ? payout : '꽝'}</b>`;
    document.getElementById('history').prepend(div);

    fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: `id=${playerId}&result=${payout}` });
    
    isSpinning = false;
    document.getElementById('spin-btn').disabled = (remainingSpins <= 0);
  }, 2000); // i=3일 때 애니메이션이 1.8초에 끝나므로 2초 대기
}

async function loadData() {
  try {
    const res = await fetch(`${SCRIPT_URL}?id=${playerId}&t=${Date.now()}`);
    const data = await res.json();
    remainingSpins = data.spins || 0;
    document.getElementById('spinCountText').textContent = remainingSpins;
    document.getElementById('spin-btn').textContent = "스핀 돌리기";
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
    r.innerHTML = ''; // 초기화
    for(let j=0; j<40; j++) {
      const d = document.createElement('div');
      d.className = 'symbol';
      d.textContent = CONFIG.SYMBOLS[Math.floor(Math.random()*5)];
      r.appendChild(d);
    }
  }
  loadData();
})();
