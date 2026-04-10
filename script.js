const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzQtB2pdgdblOpevAcE2R_rM2iPZC-7rdGp8SVOn7uxYwOrlOZxvsUHt9U7f5SVMIa21w/exec';

const CONFIG = {
  TARGET_RTP: 92, 
  BASE_WIN_RATE: 0.4, 
  SYMBOLS_DATA: {
    // ♠ 잭팟: 약 0.01% (배당은 서버 적립금)
    '♠': { name: '잭팟', weight: 0.00025, payout: 0 }, 
    
    // 7 럭키 세븐: 2.8% 확률 (15배 - 이 구간이 환수율을 견인함)
    '7': { name: '럭키 세븐', weight: 0.07, payout: 15 }, 
    
    // ♥ 트리플: 6% 확률 (5배)
    '♥': { name: '트리플', weight: 0.15, payout: 5 },    
    
    // ♦ 더블: 11.2% 확률 (2배)
    '♦': { name: '더블', weight: 0.28, payout: 2 },      
    
    // ♣ 하프-백: 20% 확률 (0.5배 - 유저 요청 반영)
    // 당첨되어도 시드의 절반만 돌려받으므로 가중치를 적절히 분산함
    '♣': { name: '하프-백', weight: 0.49975, payout: 0.5 } 
  }
};

// const CONFIG = {
//   TARGET_RTP: 100,
//   BASE_WIN_RATE: 1,
//   SYMBOLS_DATA: {
//     '♠': { name: '잭팟', weight: 1, payout: 50 },
//     '7': { name: '럭키 세븐', weight: 0, payout: 15 },
//     '♥': { name: '트리플', weight: 0, payout: 5 },
//     '♦': { name: '더블', weight: 0, payout: 2 },
//     '♣': { name: '하프-백', weight: 0, payout: 0.5 }
//   }
// };

const SYMBOLS = Object.keys(CONFIG.SYMBOLS_DATA);
const REEL_SYMBOL_COUNT = 40;

const reels = [document.getElementById('reel1'), document.getElementById('reel2'), document.getElementById('reel3')];
const spinBtn = document.getElementById('spin-btn');
const spinText = document.getElementById('spinCountText');
const resultLabel = document.getElementById('result');
const mainCard = document.getElementById('main-card');
const historyContainer = document.getElementById('history');

let remainingSpins = 0;
let isSpinning = false;

// 실시간 통계 변수
let stats = {
  totalSpent: 0, 
  totalWon: 0
};

// 유저 ID 초기화
let playerId = localStorage.getItem('playerId') || Math.random().toString(36).substring(2, 9);
localStorage.setItem('playerId', playerId);
document.getElementById('playerIdText').textContent = playerId;

// 통계 UI 업데이트
function updateStatsUI() {
  const actualRtp = stats.totalSpent === 0 ? 0 : (stats.totalWon / stats.totalSpent) * 100;
  const diff = actualRtp - CONFIG.TARGET_RTP;

  document.getElementById('actualRtp').textContent = actualRtp.toFixed(1) + '%';
  
  const diffEl = document.getElementById('rtpDiff');
  diffEl.textContent = (diff > 0 ? '+' : '') + diff.toFixed(1) + '%';
  diffEl.className = 'value ' + (diff > 0 ? 'diff-plus' : 'diff-minus');

  const probList = document.getElementById('probList');
  probList.innerHTML = Object.entries(CONFIG.SYMBOLS_DATA).map(([sym, data]) => {
    const realProb = (CONFIG.BASE_WIN_RATE * data.weight * 100).toFixed(2);
    return `<span class="prob-tag">${sym} ${realProb}%</span>`;
  }).join('');
}

// 가중치 기반 심볼 뽑기
function pickWeightedSymbol() {
  const data = CONFIG.SYMBOLS_DATA;
  let r = Math.random();
  let acc = 0;
  for (const sym of SYMBOLS) {
    acc += data[sym].weight;
    if (r <= acc) return sym;
  }
  return '♣';
}

function initReels() {
  reels.forEach(reel => {
    reel.innerHTML = '';
    for (let i = 0; i < REEL_SYMBOL_COUNT; i++) {
      const div = document.createElement('div');
      div.className = 'symbol';
      div.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      reel.appendChild(div);
    }
  });
}

async function postResult(rewardText) {
  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `id=${playerId}&result=${encodeURIComponent(rewardText)}`
    });
  } catch (e) { console.error('전송 실패'); }
}

async function spin() {
  if (isSpinning || remainingSpins <= 0) return;

  isSpinning = true;
  remainingSpins--;
  stats.totalSpent += 1; // 1회 스핀 소모 가중치
  
  spinText.textContent = remainingSpins;
  spinBtn.disabled = true;
  mainCard.classList.remove('win-normal', 'win-high', 'win-jackpot');
  resultLabel.textContent = "결과 확인 중...";

  // 결과 미리 결정
  const isWin = Math.random() < CONFIG.BASE_WIN_RATE;
  let finalSymbols = [];
  let rewardData = { name: '꽝', payout: 0, sym: '' };

  if (isWin) {
    const s = pickWeightedSymbol();
    finalSymbols = [s, s, s];
    rewardData = { name: CONFIG.SYMBOLS_DATA[s].name, payout: CONFIG.SYMBOLS_DATA[s].payout, sym: s };
  } else {
    do {
      finalSymbols = [SYMBOLS[Math.floor(Math.random()*5)], SYMBOLS[Math.floor(Math.random()*5)], SYMBOLS[Math.floor(Math.random()*5)]];
    } while (finalSymbols[0] === finalSymbols[1] && finalSymbols[1] === finalSymbols[2]);
  }

  // 릴 애니메이션
  reels.forEach((reel, i) => {
    reel.lastElementChild.textContent = finalSymbols[i];
    reel.style.transition = 'none';
    reel.style.transform = 'translateY(0)';
    setTimeout(() => {
      const duration = 2 + (i * 0.4); 
      reel.style.transition = `transform ${duration}s cubic-bezier(0.1, 0, 0.1, 1)`;
      reel.style.transform = `translateY(-${(REEL_SYMBOL_COUNT - 1) * 140}px)`;
    }, 50);
  });

  // 애니메이션 종료 후 처리
  setTimeout(() => {
    stats.totalWon += rewardData.payout;
    resultLabel.textContent = rewardData.name;
    
    if (rewardData.payout > 0) {
      const flash = document.getElementById('flash');
      flash.classList.add('active');
      setTimeout(() => flash.classList.remove('active'), 400);
      
      if (rewardData.sym === '♠') mainCard.classList.add('win-jackpot');
      else if (rewardData.sym === '7') mainCard.classList.add('win-high');
      else mainCard.classList.add('win-normal');
    }

    updateStatsUI();
    postResult(rewardData.name);
    addHistory(finalSymbols.join(' '), rewardData.name, rewardData.payout > 0);

    isSpinning = false;
    spinBtn.disabled = (remainingSpins <= 0);
  }, 3200);
}

function addHistory(symbols, reward, isWin) {
  const div = document.createElement('div');
  div.className = `entry ${isWin ? 'win' : ''}`;
  div.innerHTML = `<span>${symbols}</span><span style="font-size:13px; color:#aaa;">${reward}</span>`;
  historyContainer.prepend(div);
}

async function loadData() {
  spinBtn.disabled = true;
  spinBtn.textContent = "데이터 불러오는 중...";
  try {
    const res = await fetch(`${SCRIPT_URL}?id=${playerId}`);
    const data = await res.json();
    remainingSpins = data.spins || 0;
    spinText.textContent = remainingSpins;
    spinBtn.textContent = "SPIN";
    spinBtn.disabled = (remainingSpins <= 0);
  } catch (e) { spinBtn.textContent = "연결 오류"; }
}

// 이벤트 리스너
spinBtn.onclick = spin;
document.getElementById('copyBtn').onclick = () => {
  navigator.clipboard.writeText(playerId);
};
document.getElementById('history-btn').onclick = () => document.getElementById('historyModal').classList.remove('hidden');
document.getElementById('closeHistory').onclick = () => document.getElementById('historyModal').classList.add('hidden');

initReels();
updateStatsUI();
loadData();
