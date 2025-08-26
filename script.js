// --- 設定値（スプレッドシートの「シミュレーション変数」に相当）---
const settings = {
    referralRate: 0.50,      // 紹介者を出す割合
    referralsPerPerson: 3,   // 1人あたりの紹介人数
    pointMultiplier: 1.5,    // ポイント倍率
    mobilizationRate: 0.15,  // 会場動員率
    commissionUnitPt: 5,     // 報酬計算の単位(pt)
    commissionPerUnit: 1500  // 単位あたりの報酬額（円）
};

// --- MROUND関数の再現 ---
function mround(number, multiple) {
    return Math.round(number / multiple) * multiple;
}

// --- FLOOR関数の再現 ---
function floor(number, significance) {
    return Math.floor(number / significance) * significance;
}

// --- メインの計算ロジック ---
function runSimulation(initialValues) {
    let results = [];

    let left = {
        monthlyIncreaseNum: 0,
        totalPt: initialValues.startLeftPt,
        mobilization: 0,
        commission: 0
    };
    let right = {
        monthlyIncreaseNum: 0,
        totalPt: initialValues.startRightPt,
        mobilization: 0,
        commission: 0
    };

    for (let i = 0; i < initialValues.simulationMonths; i++) {
        const currentDate = new Date();
        currentDate.setMonth(currentDate.getMonth() + i);
        const monthStr = `${currentDate.getFullYear()}/${currentDate.getMonth() + 1}`;

        let startPtLeft = (i === 0) ? mround(initialValues.startLeftPt, 0.5) : left.totalPt;
        let calculationBaseLeft = (i === 0) ? 0 : left.mobilization;

        let introducersLeft = calculationBaseLeft * settings.referralRate;
        left.monthlyIncreaseNum = (i === 0) ? initialValues.directLeft : introducersLeft * settings.referralsPerPerson;

        let monthlyIncreasePtLeft = mround(left.monthlyIncreaseNum * settings.pointMultiplier, 0.5);
        left.totalPt = mround(startPtLeft + monthlyIncreasePtLeft, 0.5);
        left.mobilization = left.totalPt * settings.mobilizationRate;
        left.commission = floor(left.totalPt / settings.commissionUnitPt, 1) * settings.commissionPerUnit;

        let startPtRight = (i === 0) ? mround(initialValues.startRightPt, 0.5) : right.totalPt;
        let calculationBaseRight = (i === 0) ? 0 : right.mobilization;

        let introducersRight = calculationBaseRight * settings.referralRate;
        right.monthlyIncreaseNum = (i === 0) ? initialValues.directRight : introducersRight * settings.referralsPerPerson;

        let monthlyIncreasePtRight = mround(right.monthlyIncreaseNum * settings.pointMultiplier, 0.5);
        right.totalPt = mround(startPtRight + monthlyIncreasePtRight, 0.5);
        right.mobilization = right.totalPt * settings.mobilizationRate;
        right.commission = floor(right.totalPt / settings.commissionUnitPt, 1) * settings.commissionPerUnit;

        results.push({
            month: monthStr,
            leftPt: left.totalPt,
            rightPt: right.totalPt,
            totalPt: left.totalPt + right.totalPt,
            leftCommission: left.commission,
            rightCommission: right.commission,
            totalCommission: left.commission + right.commission,
        });
    }
    return results;
}

// --- HTMLとの連携部分 ---
document.getElementById('calculate-button').addEventListener('click', () => {
    const userInputs = {
        name: document.getElementById('name').value,
        startLeftPt: parseFloat(document.getElementById('startLeftPt').value),
        startRightPt: parseFloat(document.getElementById('startRightPt').value),
        directLeft: parseInt(document.getElementById('directLeft').value),
        directRight: parseInt(document.getElementById('directRight').value),
        simulationMonths: parseInt(document.getElementById('simulationMonths').value)
    };

    const simulationResults = runSimulation(userInputs);

    const tableBody = document.getElementById('result-table-body');
    tableBody.innerHTML = ''; 

    simulationResults.forEach(res => {
        const row = `
            <tr>
                <td>${res.month}</td>
                <td>${res.leftPt.toLocaleString()} pt</td>
                <td>${res.rightPt.toLocaleString()} pt</td>
                <td>${res.totalPt.toLocaleString()} pt</td>
                <td>&yen;${res.leftCommission.toLocaleString()}</td>
                <td>&yen;${res.rightCommission.toLocaleString()}</td>
                <td>&yen;${res.totalCommission.toLocaleString()}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });

    const resultContainer = document.getElementById('result-container');
    const resultTitle = document.getElementById('result-title');
    resultTitle.innerText = userInputs.name ? `【${userInputs.name}様】のシミュレーション結果` : 'シミュレーション結果';
    resultContainer.classList.remove('hidden');
});
