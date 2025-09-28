/**
 * 詳細設計: アプリケーションのロジック
 * スプレッドシートの計算ロジックを忠実に再現
 */

document.addEventListener('DOMContentLoaded', () => {
    
    const form = document.getElementById('simulation-form');
    
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        runApplication();
    });

    // 初期表示時に一度シミュレーションを実行
    runApplication();
});

/**
 * アプリケーションのメインコントローラー
 */
function runApplication() {
    const uiInputs = getInputsFromUI();
    
    const leftSimulationData = runDetailedSimulation(uiInputs.initial, uiInputs.settings, 'left');
    const rightSimulationData = runDetailedSimulation(uiInputs.initial, uiInputs.settings, 'right');

    // ★修正点: generateFinalResults に settings も渡すように変更
    const finalResults = generateFinalResults(leftSimulationData, rightSimulationData, uiInputs.initial, uiInputs.settings);

    updateResultsTable(finalResults);
}

/**
 * UIから全入力値を取得
 */
function getInputsFromUI() {
    return {
        initial: {
            startMonth: document.getElementById('startMonth').value,
            startLeftPt: parseFloat(document.getElementById('startLeftPt').value),
            startRightPt: parseFloat(document.getElementById('startRightPt').value),
            directLeft: parseInt(document.getElementById('directLeft').value, 10),
            directRight: parseInt(document.getElementById('directRight').value, 10),
            simulationMonths: parseInt(document.getElementById('simulationMonths').value, 10),
        },
        settings: {
            referralRate: parseFloat(document.getElementById('referralRate').value),
            referralsPerPerson: parseFloat(document.getElementById('referralsPerPerson').value),
            pointMultiplier: parseFloat(document.getElementById('pointMultiplier').value),
            mobilizationRate: parseFloat(document.getElementById('mobilizationRate').value)
        }
    };
}

/**
 * 左右どちらかの詳細シミュレーションを実行するエンジン
 */
function runDetailedSimulation(initial, settings, side) {
    let detailedResults = [];
    let startPt = (side === 'left') ? initial.startLeftPt : initial.startRightPt;
    let directReferrals = (side === 'left') ? initial.directLeft : initial.directRight;

    let monthlyState = {
        endOfMonthPt: 0,
        currentIncreaseNum: 0,
    };

    for (let i = 0; i < initial.simulationMonths; i++) {
        const newState = {};
        const startOfMonthPt = (i === 0) ? mround(startPt, 0.5) : monthlyState.endOfMonthPt;
        const prevMonthIncreaseNum = (i === 0) ? 0 : monthlyState.currentIncreaseNum;

        if (i === 0) {
            newState.currentIncreaseNum = directReferrals;
        } else {
            const introducers = Math.floor(prevMonthIncreaseNum * (settings.referralRate / 100));
            newState.currentIncreaseNum = introducers * settings.referralsPerPerson;
        }

        const increasePt = mround(newState.currentIncreaseNum * settings.pointMultiplier, 0.5);
        newState.endOfMonthPt = mround(startOfMonthPt + increasePt, 0.5);
        
        detailedResults.push(newState);
        monthlyState = newState;
    }
    return detailedResults;
}

/**
 * 左右の詳細シミュレーション結果を統合し、最終的な表示用データを作成
 * ★修正点: settings パラメータを追加
 */
function generateFinalResults(leftData, rightData, initial, settings) {
    const finalResults = [];
    const startDate = new Date(initial.startMonth + '-01T00:00:00');

    for (let i = 0; i < initial.simulationMonths; i++) {
        const leftMonth = leftData[i];
        const rightMonth = rightData[i];

        const currentDate = new Date(startDate);
        currentDate.setMonth(startDate.getMonth() + i);
        const monthStr = `${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/20`;
        
        // ★修正点: settings.mobilizationRate を使用
        const mobilizationLeft = Math.floor(leftMonth.endOfMonthPt * (settings.mobilizationRate / 100));
        const mobilizationRight = Math.floor(rightMonth.endOfMonthPt * (settings.mobilizationRate / 100));

        const commissionLeft = calculateCommission(leftMonth.endOfMonthPt);
        const commissionRight = calculateCommission(rightMonth.endOfMonthPt);

        finalResults.push({
            month: monthStr,
            leftPt: leftMonth.endOfMonthPt,
            rightPt: rightMonth.endOfMonthPt,
            totalPt: leftMonth.endOfMonthPt + rightMonth.endOfMonthPt,
            mobilizationLeft: mobilizationLeft,
            mobilizationRight: mobilizationRight,
            totalMobilization: mobilizationLeft + mobilizationRight,
            totalCommission: commissionLeft + commissionRight,
        });
    }
    return finalResults;
}

/**
 * 最終結果をHTMLテーブルに描画
 */
function updateResultsTable(results) {
    const tableBody = document.getElementById('result-table-body');
    const resultContainer = document.getElementById('results');
    const resultTitle = document.getElementById('result-title');
    const nameInput = document.getElementById('name').value;

    tableBody.innerHTML = ''; 

    results.forEach(res => {
        tableBody.innerHTML += `
            <tr>
                <td>${res.month}</td>
                <td>${res.leftPt.toLocaleString()} pt</td>
                <td>${res.rightPt.toLocaleString()} pt</td>
                <td>${res.totalPt.toLocaleString()} pt</td>
                <td>${res.mobilizationLeft.toLocaleString()} 人</td>
                <td>${res.mobilizationRight.toLocaleString()} 人</td>
                <td>${res.totalMobilization.toLocaleString()} 人</td>
                <td>&yen;${res.totalCommission.toLocaleString()}</td>
            </tr>
        `;
    });

    resultTitle.innerText = nameInput ? `【${nameInput}様】のシミュレーション結果` : 'シミュレーション結果';
    resultContainer.classList.remove('hidden');
}

// --- ヘルパー関数 ---

function mround(number, multiple) {
    if (multiple === 0) return number;
    return Math.round(number / multiple) * multiple;
}

function calculateCommission(points) {
    const cyclePoint = 50;
    const cycleCommission = 10000;

    const fullCycles = Math.floor(points / cyclePoint);
    const commissionFromCycles = fullCycles * cycleCommission;

    const remainingPoints = points % cyclePoint;
    
    let commissionFromRemainder = 0;
    if (remainingPoints >= 40) commissionFromRemainder = 7500;
    else if (remainingPoints >= 30) commissionFromRemainder = 6000;
    else if (remainingPoints >= 20) commissionFromRemainder = 4500;
    else if (remainingPoints >= 10) commissionFromRemainder = 3000;
    else if (remainingPoints >= 5) commissionFromRemainder = 1500;

    return commissionFromCycles + commissionFromRemainder;
}


