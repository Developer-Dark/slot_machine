const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzy_vS1mHaLfj3DinkFxR3i9azJlYC8AOecbaEBmZMmYkP1LYvOalWyMILjgoyCgAou2A/exec';

const CONFIG = {
  TARGET_RTP: 92.0,
  BASE_WIN_RATE: 0.42, 
  SYMBOLS_DATA: {
    '♠': { name: '잭팟', weight: 0.002, payout: 50 },
    '7': { name: '럭키 세븐', weight: 0.033, payout: 15 },
    '♥': { name: '트리플', weight: 0.115, payout: 5 },
    '♦': { name: '더블', weight: 0.25, payout: 2 },
    '♣': { name: '하프-백', weight: 0.60, payout: 0.5 }
  }
};

const SYMBOLS = Object.keys(CONFIG.SYMBOLS_DATA);
let stats = { totalSpent: 0, totalWon: 0 };
let remainingSpins = 0;
let isSpinning = false;

// 웨이브(Ripple) 효과 함수
function createRipple(event) {
  const button = event.currentTarget;
  const circle = document.createElement("span");
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
  circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
  circle.classList.add("ripple");

  const ripple = button.getElementsByClassName("ripple")[0];
  if (ripple) { ripple.remove(); }
  button.appendChild(circle);
}

// 확률 리스트 그리기
function renderProbList() {
  const container = document.getElementById('probList');
  container.innerHTML = '';
  SYMBOLS.forEach(sym => {
    const data = CONFIG.SYMBOLS_DATA[sym];
    const row = document.createElement('div');
    row.className = 'prob-row';
    row.innerHTML = `<span>${sym} ${data.name}</span><b>x${data.payout}</b>`;
    container.appendChild(row);
  });
}

// 기존 spin, updateStatsUI 등 로직 유지...
async function spin(e) {
  createRipple(e); // 클릭 시 웨이브 효과 실행
  if (isSpinning || remainingSpins <= 0) return;
  
  isSpinning = true;
  remainingSpins--;
  stats.totalSpent += 1;
  document.getElementById('spinCountText').textContent = remainingSpins;
  document.getElementById('spin-btn').disabled = true;
  document.getElementById('result').textContent = "결과 대기 중...";

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

  for(let i=1; i<=3; i++) {
    const reel = document.getElementById('reel' + i);
    reel.lastElementChild.textContent = finalSymbols[i-1];
    reel.style.transition = 'none';
    reel.style.transform = 'translateY(0)';
    setTimeout(() => {
      reel.style.transition = `transform ${0.8 + (i-1)*0.2}s cubic-bezier(0.25, 0.1, 0.25, 1)`;
      reel.style.transform = `translateY(-3500px)`; 
    }, 20);
  }

  setTimeout(async () => {
    stats.totalWon += reward.payout;
    document.getElementById('result').textContent = reward.name;
    updateStatsUI();
    addHistory(finalSymbols.join(' '), reward.name, reward.payout > 0);
    
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
  diffEl.style.color = Math.abs(diff) < 2 ? '#8b949e' : (diff > 0 ? '#3fb950' : '#f85149');
}

function addHistory(symbols, reward, isWin) {
  const div = document.createElement('div');
  div.style.cssText = "background:#0d1117; padding:12px; border-radius:10px; margin-bottom:8px; display:flex; justify-content:space-between; border-left:4px solid #30363d;";
  if(isWin) div.style.borderLeftColor = "#58a6ff";
  div.innerHTML = `<span>${symbols}</span><strong>${reward}</strong>`;
  document.getElementById('history').prepend(div);
}

// 초기 로딩 및 버튼 바인딩
document.getElementById('spin-btn').addEventListener('click', spin);
document.getElementById('history-btn').addEventListener('click', (e) => {
  createRipple(e);
  document.getElementById('historyModal').classList.remove('hidden');
});
document.getElementById('closeHistory').addEventListener('click', () => {
  document.getElementById('historyModal').classList.add('hidden');
});
document.getElementById('copyBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(playerId).then(() => alert('아이디가 복사되었습니다.'));
});

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

(function init() {
  renderProbList();
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
