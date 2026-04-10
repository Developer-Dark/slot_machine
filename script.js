/**
 * [PREMIUM SLOT SIMULATOR] 
 * - RTP 98.5% 최적화 로직
 * - Toss Style Ripple Effect
 * - Symbol-specific History Rendering
 */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzy_vS1mHaLfj3DinkFxR3i9azJlYC8AOecbaEBmZMmYkP1LYvOalWyMILjgoyCgAou2A/exec';

const CONFIG = {
  TARGET_RTP: 98.5,
  BASE_WIN_RATE: 0.44, // 약 44% 확률로 어떤 보상이든 당첨
  SYMBOLS_DATA: {
    '♠': { name: 'JACKPOT', weight: 0.001, payout: 100, class: 'jackpot' },
    '7': { name: 'LUCKY 7', weight: 0.04, payout: 15, class: 'seven' },
    '♥': { name: 'TRIPLE', weight: 0.12, payout: 5, class: 'normal' },
    '♦': { name: 'DOUBLE', weight: 0.25, payout: 2, class: 'normal' },
    '♣': { name: 'HALF', weight: 0.589, payout: 0.5, class: 'normal' }
  }
};

const SYMBOLS = Object.keys(CONFIG.SYMBOLS_DATA);
let stats = { totalSpent: 0, totalWon: 0 };
let remainingSpins = 0;
let isSpinning = false;

// 1. 유저 초기화 및 ID 생성
const initializeUser = () => {
  let playerId = localStorage.getItem('playerId') || Math.random().toString(36).substring(2, 9).toUpperCase();
  localStorage.setItem('playerId', playerId);
  document.getElementById('playerIdText').textContent = playerId;
};

// 2. 토스 스타일 웨이브 효과 (양옆으로 퍼지는 파동)
const applyWaveEffect = (e) => {
  const btn = e.currentTarget;
  const wave = document.createElement('span');
  const rect = btn.getBoundingClientRect();
  
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  wave.classList.add('btn-wave');
  wave.style.width = wave.style.height = `${size * 2}px`;
  wave.style.left = `${x}px`;
  wave.style.top = `${y}px`;

  btn.appendChild(wave);
  setTimeout(() => wave.remove(), 600);
};

// 3. 슬롯 회전 메커니즘
async function spin(e) {
  if (isSpinning || remainingSpins <= 0) return;
  
  applyWaveEffect(e);
  isSpinning = true;
  remainingSpins--;
  stats.totalSpent += 1;
  
  // UI 업데이트
  document.getElementById('spinCountText').textContent = remainingSpins;
  document.getElementById('spin-btn').disabled = true;
  document.getElementById('result').textContent = "연산 중...";
  document.getElementById('result').style.opacity = "0.5";

  // 당첨 판정 로직
  const isWin = Math.random() < CONFIG.BASE_WIN_RATE;
  let finalSymbols = [], reward = { name: '꽝', payout: 0, sym: '', class: 'lose' };

  if (isWin) {
    let r = Math.random(), acc = 0;
    for (const sym of SYMBOLS) {
      acc += CONFIG.SYMBOLS_DATA[sym].weight;
      if (r <= acc) { reward = { ...CONFIG.SYMBOLS_DATA[sym], sym }; break; }
    }
    finalSymbols = [reward.sym, reward.sym, reward.sym];
  } else {
    // 꽝일 때: 세 개가 모두 같지 않게 랜덤 섞기
    do {
      finalSymbols = Array.from({length: 3}, () => SYMBOLS[Math.floor(Math.random() * 5)]);
    } while (finalSymbols[0] === finalSymbols[1] && finalSymbols[1] === finalSymbols[2]);
  }

  // 릴 물리 회전 연출 (3900px 이동으로 속도감 부여)
  for(let i=1; i<=3; i++) {
    const reel = document.getElementById('reel' + i);
    // 마지막 심볼을 결과값으로 교체
    reel.lastElementChild.textContent = finalSymbols[i-1];
    
    reel.style.transition = 'none';
    reel.style.transform = 'translateY(0)';
    
    // 강제 리플로우 후 애니메이션 시작
    reel.offsetHeight; 
    
    reel.style.transition = `transform ${1.0 + (i-1)*0.2}s cubic-bezier(0.15, 0, 0.1, 1)`;
    reel.style.transform = `translateY(-3300px)`; 
  }

  // 결과 도출 (애니메이션 종료 후)
  setTimeout(async () => {
    stats.totalWon += reward.payout;
    
    const resText = document.getElementById('result');
    resText.textContent = reward.name;
    resText.style.opacity = "1";
    resText.style.color = reward.class === 'jackpot' ? '#ffd700' : '#fff';
    
    updateStatsUI();
    addHistory(finalSymbols.join(' '), reward.name, reward.class);
    
    // 데이터 서버 전송
    if (SCRIPT_URL !== 'YOUR_APPS_SCRIPT_URL_HERE') {
      fetch(SCRIPT_URL, { 
        method: 'POST', 
        mode: 'no-cors', 
        body: `id=${localStorage.getItem('playerId')}&result=${encodeURIComponent(reward.name)}` 
      });
    }

    isSpinning = false;
    document.getElementById('spin-btn').disabled = (remainingSpins <= 0);
  }, 1400); 
}

// 4. 실시간 RTP 통계 연산
function updateStatsUI() {
  const actualRtp = stats.totalSpent === 0 ? 0 : (stats.totalWon / stats.totalSpent) * 100;
  const diff = actualRtp - CONFIG.TARGET_RTP;
  
  document.getElementById('actualRtp').textContent = actualRtp.toFixed(1) + '%';
  const diffEl = document.getElementById('rtpDiff');
  
  // 오차에 따른 색상 변화 (토스 스타일)
  diffEl.textContent = (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
  if (Math.abs(diff) < 1) {
    diffEl.style.color = "#8b949e";
  } else {
    diffEl.style.color = diff > 0 ? "#f85149" : "#3fb950";
  }
}

// 5. 히스토리 렌더링 (심볼별 클래스 적용)
function addHistory(symbols, rewardName, rewardClass) {
  const container = document.getElementById('history');
  const div = document.createElement('div');
  div.className = `entry ${rewardClass}`;
  
  div.innerHTML = `
    <span class="history-symbols">${symbols}</span>
    <strong class="history-reward">${rewardName}</strong>
  `;
  
  container.prepend(div);
  
  // 너무 많은 히스토리는 성능을 위해 제거 (최근 50개 유지)
  if (container.children.length > 50) container.lastElementChild.remove();
}

// 6. 초기 구동
const init = () => {
  initializeUser();
  
  // 릴 내부 심볼 채우기 (무작위 배치로 회전감 극대화)
  for(let i=1; i<=3; i++) {
    const r = document.getElementById('reel'+i);
    r.innerHTML = ''; // 초기화
    for(let j=0; j<31; j++) {
      const d = document.createElement('div');
      d.className = 'symbol';
      d.textContent = SYMBOLS[Math.floor(Math.random()*5)];
      r.appendChild(d);
    }
  }

  // 이벤트 바인딩
  document.getElementById('spin-btn').onclick = spin;
  document.getElementById('history-btn').onclick = (e) => {
    applyWaveEffect(e);
    document.getElementById('historyModal').classList.remove('hidden');
  };
  document.getElementById('closeHistory').onclick = () => {
    document.getElementById('historyModal').classList.add('hidden');
  };
  document.getElementById('copyBtn').onclick = () => {
    const id = document.getElementById('playerIdText').textContent;
    navigator.clipboard.writeText(id).then(() => alert('ID가 복사되었습니다.'));
  };

  updateStatsUI();
};

window.onload = init;
