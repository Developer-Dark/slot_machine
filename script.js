// [배포된 URL로 변경 필수]
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzy_vS1mHaLfj3DinkFxR3i9azJlYC8AOecbaEBmZMmYkP1LYvOalWyMILjgoyCgAou2A/exec';

const CONFIG = {
  TARGET_RTP: 92.0,
  BASE_WIN_RATE: 0.42, 
  SYMBOLS_DATA: {
    '♠': { name: '잭팟', weight: 0.004, payout: 50, class: 'jackpot' },
    '7': { name: '럭키 세븐', weight: 0.031, payout: 15, class: 'high' },
    '♥': { name: '트리플', weight: 0.115, payout: 5, class: 'normal' },
    '♦': { name: '더블', weight: 0.25, payout: 2, class: 'normal' },
    '♣': { name: '하프-백', weight: 0.60, payout: 0.5, class: 'low' }
  }
};

const SYMBOLS = Object.keys(CONFIG.SYMBOLS_DATA);
let stats = { totalSpent: 0, totalWon: 0 };
let remainingSpins = 0;
let isSpinning = false;

// ID 설정
let playerId = localStorage.getItem('playerId') || Math.random().toString(36).substring(2, 9);
localStorage.setItem('playerId', playerId);
document.getElementById('playerIdText').textContent = playerId;

// RTP UI 업데이트
function updateStatsUI() {
  const actualRtp = stats.totalSpent === 0 ? 0 : (stats.totalWon / stats.totalSpent) * 100;
  const diff = actualRtp - CONFIG.TARGET_RTP;
  
  document.getElementById('actualRtp').textContent = actualRtp.toFixed(1) + '%';
  const diffEl = document.getElementById('rtpDiff');
  diffEl.textContent = (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
  
  diffEl.className = ''; // 초기화
  if (Math.abs(diff) > 1.5) {
    diffEl.classList.add(diff > 0 ? 'diff-plus' : 'diff-minus');
  }
}

async function spin() {
  if (isSpinning || remainingSpins <= 0) return;
  isSpinning = true;
  remainingSpins--;
  stats.totalSpent += 1;
  
  document.getElementById('spinCountText').textContent = remainingSpins;
  document.getElementById('spin-btn').disabled = true;
  document.getElementById('result').textContent = "행운을 빕니다!";
  
  // 연출 초기화
  document.body.classList.remove('celebrate');
  document.getElementById('main-card').classList.remove('win-jackpot', 'win-normal');

  const isWin = Math.random() < CONFIG.BASE_WIN_RATE;
  let finalSymbols = [], reward = { name: '꽝', payout: 0, sym: '', class: '' };

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

  // 릴 돌리기
  for(let i=1; i<=3; i++) {
    const reel = document.getElementById('reel' + i);
    reel.lastElementChild.textContent = finalSymbols[i-1];
    reel.style.transition = 'none';
    reel.style.transform = 'translateY(0)';
    setTimeout(() => {
      reel.style.transition = `transform ${0.8 + (i-1)*0.2}s cubic-bezier(0.4, 0, 0.2, 1)`;
      reel.style.transform = `translateY(-3510px)`; // (40-1)*90px
    }, 20);
  }

  // 결과 처리 (시간 단축)
  setTimeout(async () => {
    stats.totalWon += reward.payout;
    document.getElementById('result').textContent = reward.name;
    updateStatsUI();
    addHistory(finalSymbols.join(' '), reward.name, reward.payout > 0);
    
    // ★ 화려한 당첨 연출 로직 ★
    if (reward.payout > 0) {
      document.body.classList.add('celebrate'); // 배경 어둡게
      
      if (reward.class === 'jackpot') {
        document.getElementById('main-card').classList.add('win-jackpot'); // 네온 효과
      } else if (reward.payout >= 5) {
        document.getElementById('main-card').classList.add('win-normal'); // 진동 효과
      }
      
      // 2.5초 후 연출 종료
      setTimeout(() => {
        document.body.classList.remove('celebrate');
      }, 2500);
    }

    // 데이터 전송 (비동기)
    fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: `id=${playerId}&result=${encodeURIComponent(reward.name)}`
    });

    isSpinning = false;
    document.getElementById('spin-btn').disabled = (remainingSpins <= 0);
  }, 1300); 
}

function addHistory(symbols, reward, isWin) {
  const div = document.createElement('div');
  div.className = 'entry';
  let rewardHtml = isWin ? `<strong>${reward}</strong>` : reward;
  div.innerHTML = `<span>${symbols}</span>${rewardHtml}`;
  document.getElementById('history').prepend(div);
}

async function loadData() {
  const btn = document.getElementById('spin-btn');
  try {
    const res = await fetch(`${SCRIPT_URL}?id=${playerId}&t=${Date.now()}`);
    const data = await res.json();
    remainingSpins = data.spins || 0;
    document.getElementById('spinCountText').textContent = remainingSpins;
    btn.textContent = "스핀 돌리기";
    btn.disabled = (remainingSpins <= 0);
  } catch (e) { btn.textContent = "연결 오류"; }
}

// 이벤트
document.getElementById('spin-btn').onclick = spin;
document.getElementById('history-btn').onclick = () => document.getElementById('historyModal').classList.remove('hidden');
document.getElementById('closeHistory').onclick = () => document.getElementById('historyModal').classList.add('hidden');
document.getElementById('copyBtn').onclick = () => {
  navigator.clipboard.writeText(playerId).then(() => alert('ID가 복사되었습니다.'));
};

// 초기화
(function init() {
  for(let i=1; i<=3; i++) {
    const r = document.getElementById('reel'+i);
    r.innerHTML = '';
    for(let j=0; j<40; j++) {
      const d = document.createElement('div');
      d.className = 'symbol';
      d.textContent = SYMBOLS[Math.floor(Math.random()*5)];
      r.appendChild(d);
    }
  }
  loadData();
  updateStatsUI();
})();
