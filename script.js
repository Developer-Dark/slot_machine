const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzy_vS1mHaLfj3DinkFxR3i9azJlYC8AOecbaEBmZMmYkP1LYvOalWyMILjgoyCgAou2A/exec';

const CONFIG = {
  TARGET_RTP: 92.0,
  BASE_WIN_RATE: 0.42, 
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

// 유저 ID 설정
let playerId = localStorage.getItem('playerId') || Math.random().toString(36).substring(2, 9);
localStorage.setItem('playerId', playerId);
document.getElementById('playerIdText').textContent = playerId;

// 통계 UI 업데이트 (한국어)
function updateStatsUI() {
  const actualRtp = stats.totalSpent === 0 ? 0 : (stats.totalWon / stats.totalSpent) * 100;
  const diff = actualRtp - CONFIG.TARGET_RTP;
  document.getElementById('actualRtp').textContent = actualRtp.toFixed(1) + '%';
  const diffEl = document.getElementById('rtpDiff');
  diffEl.textContent = (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
  diffEl.style.color = Math.abs(diff) < 2 ? '#fff' : (diff > 0 ? '#f85149' : '#3fb950');
}

async function spin() {
  if (isSpinning || remainingSpins <= 0) return;
  isSpinning = true;
  remainingSpins--;
  stats.totalSpent += 1;
  
  document.getElementById('spinCountText').textContent = remainingSpins;
  document.getElementById('spin-btn').disabled = true;
  document.getElementById('result').textContent = "행운을 빕니다!";

  const isWin = Math.random() < CONFIG.BASE_WIN_RATE;
  let finalSymbols = [], reward = { name: '꽝', payout: 0, sym: '' };

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

  // 릴 회전 애니메이션 속도 향상
  for(let i=1; i<=3; i++) {
    const reel = document.getElementById('reel' + i);
    reel.lastElementChild.textContent = finalSymbols[i-1];
    reel.style.transition = 'none';
    reel.style.transform = 'translateY(0)';
    setTimeout(() => {
      // 대기 시간을 1.2초 정도로 단축
      reel.style.transition = `transform ${0.8 + (i-1)*0.2}s cubic-bezier(0.25, 0.1, 0.25, 1)`;
      reel.style.transform = `translateY(-3510px)`; 
    }, 20);
  }

  // 결과 처리 시간 단축 (총 1.5초 대기)
  setTimeout(async () => {
    stats.totalWon += reward.payout;
    document.getElementById('result').textContent = reward.name;
    updateStatsUI();
    
    // 기록 추가 (한국어)
    addHistory(finalSymbols.join(' '), reward.name, reward.payout > 0);
    
    // 데이터 전송
    fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: `id=${playerId}&result=${encodeURIComponent(reward.name)}`
    });

    isSpinning = false;
    document.getElementById('spin-btn').disabled = (remainingSpins <= 0);
  }, 1500); 
}

function addHistory(symbols, reward, isWin) {
  const div = document.createElement('div');
  div.className = `entry ${isWin ? 'win' : ''}`;
  div.style.cssText = "background:#0d1117; padding:12px; border-radius:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; border-left:4px solid #30363d;";
  if(isWin) div.style.borderLeftColor = "#f9c33d";
  div.innerHTML = `<span>${symbols}</span><strong>${reward}</strong>`;
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
  } catch (e) { 
    btn.textContent = "연결 오류"; 
  }
}

document.getElementById('spin-btn').onclick = spin;
document.getElementById('history-btn').onclick = () => document.getElementById('historyModal').classList.remove('hidden');
document.getElementById('closeHistory').onclick = () => document.getElementById('historyModal').classList.add('hidden');
document.getElementById('copyBtn').onclick = () => {
  navigator.clipboard.writeText(playerId).then(() => alert('아이디가 복사되었습니다.'));
};

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
  loadData();
  updateStatsUI();
})();
