/**
 * 詳細設計: アプリケーションのロジック
 * 役割の異なる関数に分割し、可読性とメンテナンス性を向上させる
 */

// DOMContentLoadedイベントリスナー: HTMLの読み込み完了後にスクリプトを実行
document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM要素の取得 ---
    const form = document.getElementById('simulation-form');
    const resultContainer = document.getElementById('results');
    const resultTitle = document.getElementById('result-title');
    const tableBody = document.getElementById('result-table-body');

    // --- イベントリスナーの設定 ---
    form.addEventListener('submit', (event) => {
        event.preventDefault(); // フォームのデフォルト送信をキャンセル
        run();
    });

    // 初期表示時に一度シミュレーションを実行
    run();

    /**
     * メイン実行関数
     * 入力値を取得し、シミュレーションを実行し、UIを更新する
     */
    function run() {
        const initialValues = getInitialValues();
        const settings = getSimulationSettings();
        
        const simulationResults = runSimulation(initialValues, settings);
        
        updateUI(simulationResults, initialValues.name);
    }

    /**
     * UIから初期値を取得する関数
     * @returns {object} 初期値のオブジェクト
     */
    function getInitialValues() {
        return {
            name: document.getElementById('name').value,
            startMonth: document.getElementById('startMonth').value,
            startLeftPt: parseFloat(document.getElementById('startLeftPt').value),
            startRightPt: parseFloat(document.getElementById('startRightPt').value),
            directLeft: parseInt(document.getElementById('directLeft').value, 10),
            directRight: parseInt(document.getElementById('directRight').value, 10),
            simulationMonths: parseInt(document.getElementById('simulationMonths').value, 10)
        };
    }

    /**
     * UIからシミュレーション変数を取得する関数
     * @returns {object} シミュレーション変数のオブジェクト
     */
    function getSimulationSettings() {
        return {
            referralRate: parseFloat(document.getElementById('referralRate').value),
            referralsPerPerson: parseFloat(document.getElementById('referralsPerPerson').value),
            pointMultiplier: parseFloat(document.getElementById('pointMultiplier').value),
            mobilizationRate: parseFloat(document.getElementById('mobilizationRate').value)
        };
    }

    /**
     * シミュレーション結果を元にUI（テーブル）を更新する関数
     * @param {Array<object>} results - シミュレーション結果の配列
     * @param {string} name - 利用者の名前
     */
    function updateUI(results, name) {
        tableBody.innerHTML = ''; // 既存のテーブル内容をクリア

        results.forEach(res => {
            const row = `
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
            tableBody.innerHTML += row;
        });

        resultTitle.innerText = name ? `【${name}様】のシミュレーション結果` : 'シミュレーション結果';
        resultContainer.classList.remove('hidden');
    }
});


// --- 計算ロジック（詳細設計）---

/**
 * 0.5単位で四捨五入するヘルパー関数
 * @param {number} number - 対象の数値
 * @param {number} multiple - 丸める単位
 * @returns {number} 丸められた数値
 */
function mround(number, multiple) {
    if (multiple === 0) return number;
    return Math.round(number / multiple) * multiple;
}

/**
 * 新しい報酬ルールに基づいてコミッションを計算する関数
 * @param {number} points - 対象となる累計ポイント
 * @returns {number} 計算された報酬額
 */
function calculateCommission(points) {
    const cyclePoint = 50;
    const cycleCommission = 10000; // (1500 * 5) + 2500

    const fullCycles = Math.floor(points / cyclePoint);
    const commissionFromCycles = fullCycles * cycleCommission;

    const remainingPoints = points % cyclePoint;
    
    let commissionFromRemainder = 0;
    if (remainingPoints >= 40) commissionFromRemainder = 7500; // 1500 * 5
    else if (remainingPoints >= 30) commissionFromRemainder = 6000; // 1500 * 4
    else if (remainingPoints >= 20) commissionFromRemainder = 4500; // 1500 * 3
    else if (remainingPoints >= 10) commissionFromRemainder = 3000; // 1500 * 2
    else if (remainingPoints >= 5) commissionFromRemainder = 1500; // 1500 * 1

    return commissionFromCycles + commissionFromRemainder;
}

/**
 * シミュレーションの主計算エンジン
 * @param {object} initialValues - 初期値
 * @param {object} settings - シミュレーション変数
 * @returns {Array<object>} 月ごとの計算結果の配列
 */
function runSimulation(initialValues, settings) {
    let results = [];
    
    // 左右の組織の状態をオブジェクトで管理
    let left = {
        totalPt: initialValues.startLeftPt,
        prevMonthIncreaseNum: 0 
    };
    let right = {
        totalPt: initialValues.startRightPt,
        prevMonthIncreaseNum: 0 
    };
    
    const startDate = new Date(initialValues.startMonth + '-01T00:00:00');

    for (let i = 0; i < initialValues.simulationMonths; i++) {
        const currentDate = new Date(startDate);
        currentDate.setMonth(startDate.getMonth() + i);
        const monthStr = `${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/20`;

        // --- 月次の計算サイクル ---
        [left, right] = calculateMonth(left, right, i, initialValues, settings);
        
        // --- 付随情報の計算 ---
        const commissionLeft = calculateCommission(left.totalPt);
        const commissionRight = calculateCommission(right.totalPt);
        const mobilizationLeft = Math.floor(left.totalPt * (settings.mobilizationRate / 100));
        const mobilizationRight = Math.floor(right.totalPt * (settings.mobilizationRate / 100));

        // --- 結果の格納 ---
        results.push({
            month: monthStr,
            leftPt: left.totalPt,
            rightPt: right.totalPt,
            totalPt: left.totalPt + right.totalPt,
            mobilizationLeft: mobilizationLeft,
            mobilizationRight: mobilizationRight,
            totalMobilization: mobilizationLeft + mobilizationRight,
            totalCommission: commissionLeft + commissionRight,
        });
    }
    return results;
}

/**
 * 1ヶ月分のポイント増加を計算する関数
 * @param {object} leftState - 現在の左組織の状態
 * @param {object} rightState - 現在の右組織の状態
 * @param {number} monthIndex - 現在が何ヶ月目か (0から始まる)
 * @param {object} initialValues - 初期値
 * @param {object} settings - シミュレーション変数
 * @returns {Array<object>} 更新された左右の組織の状態
 */
function calculateMonth(leftState, rightState, monthIndex, initialValues, settings) {
    const newLeft = { ...leftState };
    const newRight = { ...rightState };

    // --- 左組織 ---
    const startPtLeft = (monthIndex === 0) ? mround(initialValues.startLeftPt, 0.5) : newLeft.totalPt;
    let currentIncreaseNumLeft;
    if (monthIndex === 0) {
        currentIncreaseNumLeft = initialValues.directLeft;
    } else {
        const introducersLeft = Math.floor(newLeft.prevMonthIncreaseNum * (settings.referralRate / 100));
        currentIncreaseNumLeft = introducersLeft * settings.referralsPerPerson;
    }
    const monthlyIncreasePtLeft = mround(currentIncreaseNumLeft * settings.pointMultiplier, 0.5);
    newLeft.totalPt = mround(startPtLeft + monthlyIncreasePtLeft, 0.5);
    newLeft.prevMonthIncreaseNum = currentIncreaseNumLeft;

    // --- 右組織 ---
    const startPtRight = (monthIndex === 0) ? mround(initialValues.startRightPt, 0.5) : newRight.totalPt;
    let currentIncreaseNumRight;
    if (monthIndex === 0) {
        currentIncreaseNumRight = initialValues.directRight;
    } else {
        const introducersRight = Math.floor(newRight.prevMonthIncreaseNum * (settings.referralRate / 100));
        currentIncreaseNumRight = introducersRight * settings.referralsPerPerson;
    }
    const monthlyIncreasePtRight = mround(currentIncreaseNumRight * settings.pointMultiplier, 0.5);
    newRight.totalPt = mround(startPtRight + monthlyIncreasePtRight, 0.5);
    newRight.prevMonthIncreaseNum = currentIncreaseNumRight;

    return [newLeft, newRight];
}

