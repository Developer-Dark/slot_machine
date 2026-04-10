const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx5fXtx23w-17rK-7_qb9WKH3XjHmMxOrPhfO28blTx25d-FLwaZpMBRKTeB9aIP8-W5g/exec'; // GAS 배포 주소 입력
const CONFIG = {
  SYMBOLS: ['♠', '7', '♥', '♦', '♣'],
  PAYOUTS: { '♠': 100.0, '7': 25.0, '♥': 10.0, '♦': 5.0, '♣': 1.0 }
};

let balance = 0.0, remainingSpins = 0, totalSpent = 0, totalWon = 0, isSpinning = false;
let rtpHistory = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 그래프 데이터셋

// Chart.js 초기화
const ctx = document.getElementById('rtpChart').getContext('2d');
const rtpChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['', '', '', '', '', '', '', '', '', ''],
    datasets: [{
      label: 'Actual RTP',
      data: rtpHistory,
      borderColor: '#3182f6',
      borderWidth: 2,
      pointRadius: 0,
      fill: true,
      backgroundColor: 'rgba(49, 130, 246, 0.1)',
      tension: 0.4
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { display: false, min: 0, max: 200 } }
  }
});

let playerId = localStorage.getItem('playerId') || "ANA-" + Math.random().toString(36).substring(2, 8).toUpperCase();
localStorage.setItem('playerId', playerId);
document.getElementById('playerIdText').textContent = playerId;

async function spin() {
  if (isSpinning || remainingSpins <= 0) return;
  isSpinning = true;
  
  remainingSpins--;
  totalSpent += 1;
  document.getElementById('spinCountText').textContent = remainingSpins;
  document.getElementById('totalSpentText').textContent = totalSpent;
  document.getElementById('spin-btn').disabled = true;
  
  document.body.classList.remove('jackpot-win');

  const isWin = Math.random() < 0.4;
  let resSyms = [], payout = 0, rewardKey = '꽝';

  if (isWin) {
    const r = Math.random();
    if (r < 0.03) { payout = 100; rewardKey = '잭팟'; resSyms = ['♠','♠','♠']; }
    else if (r < 0.12) { payout = 25; rewardKey = '럭키 세븐'; resSyms = ['7','7','7']; }
    else { payout = 5; rewardKey = '더블'; resSyms = ['♦','♦','♦']; }
  } else {
    resSyms = ['♣', '♠', '♥']; // 예시 꽝
  }

  // 애니메이션 (심플화)
  const symH = 110;
  for(let i=1; i<=3; i++) {
    const r = document.getElementById('reel' + i);
    r.style.transition = `transform ${1.5 + i*0.2}s cubic-bezier(0.4, 0, 0.2, 1)`;
    r.style.transform = `translateY(-${30 * symH}px)`;
  }

  setTimeout(() => {
    totalWon += payout;
    balance += payout;
    
    // RTP 계산 및 그래프 업데이트
    const currentRtp = (totalWon / totalSpent) * 100;
    document.getElementById('actualRtpText').textContent = currentRtp.toFixed(1) + '%';
    document.getElementById('totalWonText').textContent = totalWon;
    document.getElementById('balanceText').textContent = balance.toFixed(2);

    rtpHistory.push(currentRtp);
    rtpHistory.shift();
    rtpChart.update();

    if (payout >= 25) document.body.classList.add('jackpot-win');

    // 서버 전송
    fetch(SCRIPT_URL, { 
      method: 'POST', 
      mode: 'no-cors',
      body: `id=${playerId}&result=${encodeURIComponent(rewardKey)}` 
    });

    isSpinning = false;
    document.getElementById('spin-btn').disabled = (remainingSpins <= 0);
  }, 2200);
}

// 초기 데이터 로드 (이전과 동일)
async function loadData() {
  try {
    const res = await fetch(`${SCRIPT_URL}?id=${playerId}&t=${Date.now()}`);
    const data = await res.json();
    remainingSpins = data.spins || 0;
    balance = data.balance || 0;
    document.getElementById('spinCountText').textContent = remainingSpins;
    document.getElementById('balanceText').textContent = balance.toFixed(2);
    document.getElementById('spin-btn').disabled = (remainingSpins <= 0);
    document.getElementById('spin-btn').textContent = "데이터 분석 시작";
  } catch (e) {
    document.getElementById('spin-btn').textContent = "ERROR: RECONNECTING";
  }
}

document.getElementById('spin-btn').onclick = spin;
loadData();
