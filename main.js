/* main.js v0.3.0-p16 */

let genjyuMaster = (typeof GENJYU_DATA !== 'undefined') ? GENJYU_DATA : [];

let currentState = {
    id: 0, 
    lv: 1, 
    pointS: 5, pointA: 5, pointD: 5, pointL: 5,
    remainPt: 0, 
    reincCount: 0 
};

let historyStack = [];
const MAX_HISTORY = 15;

function init() {
    if (!genjyuMaster || genjyuMaster.length === 0) return;
    setupDatalist();
    applyInitialSetup();
    render();
}

function setupDatalist() {
    const datalist = document.getElementById('genjyu-names');
    if (!datalist) return;
    const names = [...new Set(genjyuMaster.map(g => g.genjyuName))];
    names.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        datalist.appendChild(option);
    });
}

function applyInitialSetup() {
    currentState.id = 0;
    currentState.lv = 1;
    currentState.pointS = 5;
    currentState.pointA = 5;
    currentState.pointD = 5;
    currentState.pointL = 5;
    currentState.remainPt = 0;
    currentState.reincCount = 0;
    historyStack = []; 
}

function systemReset() {
    if (confirm("すべてのステータスと転生回数を完全にリセットしますか？")) {
        applyInitialSetup();
        render();
    }
}

function applyManualInput() {
    const nameInput = document.getElementById('manual-name').value.trim();
    let lvInput = Math.max(1, parseInt(document.getElementById('manual-lv').value) || 1);
    const sInput = Math.max(0, parseInt(document.getElementById('manual-s').value) || 0);
    const aInput = Math.max(0, parseInt(document.getElementById('manual-a').value) || 0);
    const dInput = Math.max(0, parseInt(document.getElementById('manual-d').value) || 0);
    const lInput = Math.max(0, parseInt(document.getElementById('manual-l').value) || 0);
    const ptInput = Math.max(0, parseInt(document.getElementById('manual-pt').value) || 0);
    const reincInput = Math.max(0, parseInt(document.getElementById('manual-reinc').value) || 0);

    const targetGenjyu = genjyuMaster.find(g => g.genjyuName === nameInput);
    if (!targetGenjyu) {
        alert("指定された幻獣名が見つかりません。");
        return;
    }

    const limit = (reincInput >= 8) ? 250 : 200;
    if (lvInput > limit) {
        alert(`転生回数 ${reincInput} の上限Lvは ${limit} です。`);
        lvInput = limit;
    }

    currentState.id = targetGenjyu.genjyuId;
    currentState.lv = lvInput;
    currentState.pointS = sInput;
    currentState.pointA = aInput;
    currentState.pointD = dInput;
    currentState.pointL = lInput;
    currentState.remainPt = ptInput;
    currentState.reincCount = reincInput;

    saveHistory();
    render();
    alert("反映しました。");
}

function quickSave() {
    const slot = document.getElementById('save-slot-select').value;
    const saveData = { state: currentState, history: historyStack, savedAt: new Date().toLocaleString() };
    localStorage.setItem(`genjyu_sim_slot_${slot}`, JSON.stringify(saveData));
    alert(`スロット ${slot} に保存しました。`);
}

function quickLoad() {
    const slot = document.getElementById('save-slot-select').value;
    const rawData = localStorage.getItem(`genjyu_sim_slot_${slot}`);
    if (!rawData) { alert("データがありません。"); return; }
    if (!confirm("ロードしますか？")) return;
    const saveData = JSON.parse(rawData);
    currentState = saveData.state;
    historyStack = saveData.history || [];
    render();
}

function getReincBonusSp(count) {
    const bonusMap = [0, 30, 40, 50, 60, 70, 80, 90, 100];
    return (count >= 9) ? 110 : (bonusMap[count] || 0);
}

function saveHistory() {
    const historyItem = JSON.parse(JSON.stringify(currentState));
    historyStack.push(historyItem);
    if (historyStack.length > MAX_HISTORY) historyStack.shift();
}

function rollbackTo(index) {
    if (confirm("この時点に戻しますか？")) {
        currentState = JSON.parse(JSON.stringify(historyStack[index]));
        historyStack = historyStack.slice(0, index + 1);
        render();
    }
}

function evolveTo(targetId) {
    const nextGenjyu = genjyuMaster.find(g => g.genjyuId === targetId);
    if (!nextGenjyu) return;

// --- 転生制限ガード ---
// --- 転生制限ガード（不具合検知用） ---
    const curGenjyu = genjyuMaster.find(g => g.genjyuId === currentState.id);
    
    if (currentState.reincCount === 0 && curGenjyu?.genjyuClass === "S") {
        if (nextGenjyu.genjyuClass === "S" || nextGenjyu.genjyuClass === "SS") {
            // 本来 render() でボタンが消えているはずなので、ここに来るのは異常
            alert("【システムエラー】未転生Sクラスからの不正な進化を検知しました。お手数ですが、現在の状況を開発者へ報告してください。");
            console.error("Evolution Blocked: Un-reincarnated Class S to S/SS is not allowed.");
            return; 
        }
    }
    // -------------------


//ターゲットID1=生まれ変わる者
    if (targetId === 1) {
        currentState.pointS = 5 + Math.ceil(currentState.pointS / 10);
        currentState.pointA = 5 + Math.ceil(currentState.pointA / 10);
        currentState.pointD = 5 + Math.ceil(currentState.pointD / 10);
        currentState.pointL = 5 + Math.ceil(currentState.pointL / 10);
        currentState.reincCount += 1;
        currentState.lv = 1;
        currentState.remainPt = getReincBonusSp(currentState.reincCount);
        currentState.id = targetId;
} else if (targetId === 0) {
        // --- さなぎ（特殊変化/初期化）の処理 ---
        
        // 1. レベルを1に戻す
        currentState.lv = 1;
        
        // 2. 転生回数はそのまま維持する（applyInitialSetupを使わない理由）
        // currentState.reincCount = currentState.reincCount; // 何もしない
        
        // 3. 全ステータスポイントを初期値（5）に戻す
        currentState.pointS = 5;
        currentState.pointA = 5;
        currentState.pointD = 5;
        currentState.pointL = 5;
        
        // 4. SPを一度0にしてから、+5ptする
        currentState.remainPt = 5; 
        
        // 5. IDをさなぎ(0)に設定
        currentState.id = 0;
    } else {
        const lvAdd = (nextGenjyu.genjyuClass === 'S' || nextGenjyu.genjyuClass === 'SS') ? 20 : 5;
        const maxLv = getLevelLimit();
        const prevLv = currentState.lv;
        currentState.lv = Math.min(currentState.lv + lvAdd, maxLv);
        currentState.remainPt += ((currentState.lv - prevLv) * 2);
        const nm = nextGenjyu.statusMultipliers;
        currentState.pointA += Math.ceil(nm.attackFactor * 1.111);
        currentState.pointD += Math.ceil(nm.defenseFactor * 1.111);
        currentState.pointS += Math.ceil((nm.staminaFactor / 3) * 1.111);
        currentState.id = targetId;
    }
    saveHistory();
    render();
}

function changeVal(type, diff) {
    if (type === 'lv') {
        const maxLv = getLevelLimit();
        let nextLv = Math.max(1, Math.min(currentState.lv + diff, maxLv));
        currentState.remainPt += ((nextLv - currentState.lv) * 2);
        currentState.lv = nextLv;
    } else {
        const targetPt = 'point' + type.toUpperCase();
        if (diff > 0) {
            const actualAdd = Math.min(diff, currentState.remainPt);
            currentState[targetPt] += actualAdd;
            currentState.remainPt -= actualAdd;
        } else {
            const actualSub = Math.min(Math.abs(diff), currentState[targetPt] - 1);
            currentState[targetPt] -= actualSub;
            currentState.remainPt += actualSub;
        }
    }
    render();
}

function getLevelLimit() { return (currentState.reincCount >= 8) ? 250 : 200; }

function createEvolutionButton(genjyu, isSpecial = false) {
    const btn = document.createElement('button');
    btn.className = 'evolve-btn';
    btn.style.margin = "4px";
    btn.style.padding = "6px 12px";
    btn.style.textAlign = "center";
    btn.style.lineHeight = "1.2";
    let html = `<div style="font-weight: bold;">${genjyu.genjyuName}</div>`;
    if (genjyu.evolutionItem && genjyu.evolutionItem.eItemName) {
        html += `<div style="font-size: 0.75em; opacity: 0.8; margin-top: 2px;">[${genjyu.evolutionItem.eItemName}]</div>`;
    } else if (isSpecial) {
        html += `<div style="font-size: 0.75em; opacity: 0.8; margin-top: 2px;">(${genjyu.genjyuId === 0 ? "初期化" : "転生"})</div>`;
    }
    btn.innerHTML = html;
    return btn;
}

function render() {
    try {
        const curGenjyu = genjyuMaster.find(g => g.genjyuId === currentState.id);
        if (!curGenjyu) return;

        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        setText('cur-name', curGenjyu.genjyuName);
        setText('cur-class', curGenjyu.genjyuClass);
        setText('cur-type', curGenjyu.genjyuType);
	// --- 転生回数とボーナスの表示更新 ---
	const rCount = currentState.reincCount || 0;
	const bCount = Math.min(rCount, 9);
	const reincText = `${rCount}転生(${bCount})`;
	
	// setText関数ではなく直接IDを指定して確実に書き換えます
	const reincEl = document.getElementById('cur-reinc-display');
	if (reincEl) {
	    reincEl.textContent = reincText;
	}
        
        const itemName = (curGenjyu.evolutionItem && curGenjyu.evolutionItem.eItemName) 
                         ? curGenjyu.evolutionItem.eItemName : "-";
        setText('r-item-name', itemName);

        // ★ ここを修正：数字ではなく●で表示
        const rarityArea = document.getElementById('r-item-rarity-area');
        if (rarityArea) {
            const rNum = curGenjyu.evolutionItem?.eItemRarity || 0;
            rarityArea.textContent = rNum > 0 ? "●".repeat(rNum) : "";
        }

        setText('disp-lv', currentState.lv);
        setText('max-lv', getLevelLimit());

const sm = curGenjyu.statusMultipliers;
// 1. 先に10倍して整数化してから計算
// 2. その結果（35300）を10で割る（3530.0）
// 3. 最後にもう一度 Math.floor で囲って確実に整数にする
        setText('cur-s', Math.floor(Math.floor(currentState.pointS * (sm.staminaFactor * 10)) / 10));

        // A: 攻撃
        setText('cur-a', Math.floor(Math.floor(currentState.pointA * (sm.attackFactor * 10)) / 10));

        // D: 防御（ここを修正しました）
        setText('cur-d', Math.floor(Math.floor(currentState.pointD * (sm.defenseFactor * 10)) / 10));

        // L: 幸運
        setText('cur-l', Math.floor(Math.floor(currentState.pointL * (sm.luckFactor * 10)) / 10));
        
        const ptElements = document.querySelectorAll('.stat-pt');
        if (ptElements.length >= 4) {
            ptElements[0].textContent = `(${currentState.pointS}pt)`;
            ptElements[1].textContent = `(${currentState.pointA}pt)`;
            ptElements[2].textContent = `(${currentState.pointD}pt)`;
            ptElements[3].textContent = `(${currentState.pointL}pt)`;
        }
        setText('remain-pt', currentState.remainPt);

        const evolutionListEl = document.getElementById('evolution-list'); 
        if (evolutionListEl) {
            evolutionListEl.innerHTML = '';
            [0, 1].forEach(spId => {
                const spG = genjyuMaster.find(g => g.genjyuId === spId);
                if (spG) {
                    const btn = createEvolutionButton(spG, true);
                    let can = (spId === 1) ? (currentState.lv >= 100) : (currentState.lv >= 10);
                    if (can) { btn.onclick = () => evolveTo(spId); } else { btn.disabled = true; btn.style.opacity = "0.5"; }
                    evolutionListEl.appendChild(btn);
                }
            });

/*
            genjyuMaster.filter(g => g.parentIds?.includes(currentState.id) && g.genjyuId > 1)
                .forEach(next => {
                    const btn = createEvolutionButton(next);
                    btn.onclick = () => evolveTo(next.genjyuId);
                    evolutionListEl.appendChild(btn);
                });
*/
genjyuMaster.filter(g => {
    // 1. 基本条件：親IDが今の幻獣か、かつIDが特殊（0,1）以外か
    const isNext = g.parentIds?.includes(currentState.id) && g.genjyuId > 1;
    if (!isNext) return false;

    // 2. 追加条件：転生制限のチェック
    // 今が「未転生(0)」かつ「Class S」の場合、進化先が「S」または「SS」なら非表示にする
    if (currentState.reincCount === 0 && curGenjyu.genjyuClass === "S") {
        if (g.genjyuClass === "S" || g.genjyuClass === "SS") {
            return false; // 条件に一致するので、変化リストに含めない
        }
    }

    return true; // それ以外は表示
})
.forEach(next => {
    const btn = createEvolutionButton(next);
    btn.onclick = () => evolveTo(next.genjyuId);
    evolutionListEl.appendChild(btn);
});

        }

        const historyListEl = document.getElementById('history-list');
        if (historyListEl) {
            historyListEl.innerHTML = '';
            historyStack.forEach((h, i) => {
                const hG = genjyuMaster.find(g => g.genjyuId === h.id);
                if (hG) {
                    const btn = createEvolutionButton(hG, [0, 1].includes(h.id));
                    btn.onclick = () => rollbackTo(i);
                    historyListEl.appendChild(btn);
                }
            });
        }
    } catch (e) { console.error(e); }
}

window.onload = init;