/* main.js v0.4.16 */

// --- 定数・マスタ参照 ---

/*
 * 【KB-GEN2-006 / KB-GEN2-004: 定数ファイル分離済み】
 * 以下の定数・ロジックは sim_constants.js に移管しました。
 * StatusSimulator.html にて sim_constants.js を本ファイルより先にロードしてください。
 *   - REINC_BONUS_MAP, TRANS_BONUS  (KB-GEN2-004: 転生ボーナス関連)
 *   - LV_LIMIT_NORMAL, LV_LIMIT_HIGH, LV_LIMIT_THRESHOLD  (KB-GEN2-004: レベル上限関連)
 *   - EVOLUTION_COEFF, EVOLUTION_S_DIVISOR  (KB-GEN2-005: 進化係数関連)
 */


let genjyuMaster = (typeof GENJYU_DATA !== 'undefined') ? GENJYU_DATA : [];

const MANUAL_NAME_MAX_LEN = 120;

// --- 入力検証・サニタイズ ---

function toSafeNonNegInt(v, fallback) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    const t = Math.trunc(n);
    return t < 0 ? fallback : t;
}

function isValidGenjyuId(id) {
    return genjyuMaster.some(g => g.genjyuId === id);
}

/**
 * ローカルストレージ経由の不正JSON・プロトタイプ汚染を避けるため、許可キーのみ・型を検証する。
 */
function sanitizeStateSnapshot(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = toSafeNonNegInt(raw.id, NaN);
    const lv = toSafeNonNegInt(raw.lv, 1);
    if (!isValidGenjyuId(id)) return null;
    const reincCount = Math.min(255, Math.max(0, toSafeNonNegInt(raw.reincCount, 0)));
    const limit = reincCount >= 8 ? 250 : 200;
    const out = {
        id,
        lv: Math.min(Math.max(1, lv), limit),
        pointS: Math.max(0, toSafeNonNegInt(raw.pointS, 5)),
        pointA: Math.max(0, toSafeNonNegInt(raw.pointA, 5)),
        pointD: Math.max(0, toSafeNonNegInt(raw.pointD, 5)),
        pointL: Math.max(0, toSafeNonNegInt(raw.pointL, 5)),
        remainPt: Math.max(0, toSafeNonNegInt(raw.remainPt, 0)),
        reincCount
    };
    return out;
}

function sanitizeSlotPayload(parsed) {
    if (!parsed || typeof parsed !== 'object') return null;
    const state = sanitizeStateSnapshot(parsed.state);
    if (!state) return null;
    let hist = parsed.history;
    if (!Array.isArray(hist)) hist = [];
    if (hist.length > MAX_HISTORY * 4) return null;
    const history = [];
    for (let i = 0; i < hist.length; i++) {
        const snap = sanitizeStateSnapshot(hist[i]);
        if (!snap) return null;
        history.push(snap);
    }
    return { state, history };
}

function sanitizeManualGenjyuName(name) {
    if (typeof name !== 'string') return '';
    const t = name.trim().replace(/\0/g, '');
    return t.length > MANUAL_NAME_MAX_LEN ? t.slice(0, MANUAL_NAME_MAX_LEN) : t;
}

// --- アプリ状態 ---

let currentState = {
    id: 0, 
    lv: 1, 
    pointS: 5, pointA: 5, pointD: 5, pointL: 5,
    remainPt: 0, 
    reincCount: 0 
};

let historyStack = [];
const MAX_HISTORY = 15;
const SAVE_SLOT_COUNT = 20;

// --- 永続化（localStorage） ---

function getSaveSlotOptionLabel(slotNum) {
    const prefix = `スロット ${slotNum}`;
    const raw = localStorage.getItem(`genjyu_sim_slot_${slotNum}`);
    if (!raw) return prefix;
    try {
        const parsed = JSON.parse(raw);
        const id = parsed?.state?.id;
        if (id === undefined || id === null) return prefix;
        const g = genjyuMaster.find(x => x.genjyuId === id);
        return g ? `${prefix}: ${g.genjyuName}` : prefix;
    } catch {
        return prefix;
    }
}

function updateSaveSlotSelect() {
    const select = document.getElementById('save-slot-select');
    if (!select) return;
    const cur = select.value;
    select.innerHTML = '';
    for (let n = 1; n <= SAVE_SLOT_COUNT; n++) {
        const opt = document.createElement('option');
        opt.value = String(n);
        opt.textContent = getSaveSlotOptionLabel(n);
        select.appendChild(opt);
    }
    if (cur && Number(cur) >= 1 && Number(cur) <= SAVE_SLOT_COUNT) {
        select.value = cur;
    }
}

// --- UI初期化 ---

function init() {
    if (!genjyuMaster || genjyuMaster.length === 0) return;
    setupDatalist();
    applyInitialSetup();
    updateSaveSlotSelect();
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

// --- 状態初期化・手動入力 ---

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
    const nameInput = sanitizeManualGenjyuName(document.getElementById('manual-name').value);
    let lvInput = Math.max(1, parseInt(document.getElementById('manual-lv').value, 10) || 1);
    const sInput = Math.max(0, parseInt(document.getElementById('manual-s').value, 10) || 0);
    const aInput = Math.max(0, parseInt(document.getElementById('manual-a').value, 10) || 0);
    const dInput = Math.max(0, parseInt(document.getElementById('manual-d').value, 10) || 0);
    const lInput = Math.max(0, parseInt(document.getElementById('manual-l').value, 10) || 0);
    const ptInput = Math.max(0, parseInt(document.getElementById('manual-pt').value, 10) || 0);
    const reincInput = Math.max(0, parseInt(document.getElementById('manual-reinc').value, 10) || 0);

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

// --- 永続化（クイックセーブ・ロード） ---

function quickSave() {
    const slot = document.getElementById('save-slot-select').value;
    const saveData = { state: currentState, history: historyStack, savedAt: new Date().toLocaleString() };
    localStorage.setItem(`genjyu_sim_slot_${slot}`, JSON.stringify(saveData));
    updateSaveSlotSelect();
    alert(`スロット ${slot} に保存しました。`);
}

function quickLoad() {
    const slot = document.getElementById('save-slot-select').value;
    const rawData = localStorage.getItem(`genjyu_sim_slot_${slot}`);
    if (!rawData) { alert("データがありません。"); return; }
    if (!confirm("ロードしますか？")) return;
    let parsed;
    try {
        parsed = JSON.parse(rawData);
    } catch {
        alert("セーブデータの形式が壊れています。");
        return;
    }
    const cleaned = sanitizeSlotPayload(parsed);
    if (!cleaned) {
        alert("セーブデータが不正か、対応する幻獣が見つかりません。");
        return;
    }
    currentState = cleaned.state;
    historyStack = cleaned.history;
    render();
}

// --- ゲームルール（転生・Lv・進化・ポイント） ---

//転生ボーナス
/**
 * 転生回数に応じた転生ボーナスpt（SP）の取得
 * * 【仕様ノート】
 * 配列 bonusMap のインデックスがそのまま転生回数（0〜8転生目）に対応しています。
 * 現在のゲーム環境では、9転生時の110ptが最大値として設定されています。
 * * 【将来の改修指針】
 * 将来的に10転生目が解放され、最大ボーナスが120pt等に引き上げられた場合は、以下2点を修正します：
 * 1. bonusMap の末尾に「110」（9転生目の値）を追加する。
 * 2. 三項演算子の条件を「(count >= 10) ? 120 : ...」のように引き上げる。
 * * @param {number} count 転生回数
 * @returns {number} 該当する転生ボーナスpt
 */
function getReincBonusSp(count) {
    // REINC_BONUS_MAP ・ TRANS_BONUS は sim_constants.js で定義
    return (count >= 9) ? TRANS_BONUS : (REINC_BONUS_MAP[count] || 0);
}

// --- 履歴（Undo） ---

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
        /*
         * 【仕様解説・将来の定数化方針（KB-GEN2-005）】
         * 【KB-GEN2-005: 進化ステータス上昇式の定数化済み】
         * 進化時の各種ボーナス計算において使用していたマジックナンバー `1.111` および `3` を、
         * sim_constants.js の `EVOLUTION_COEFF` / `EVOLUTION_S_DIVISOR` として定数化・分離しました。
         */
        currentState.pointA += Math.ceil(nm.attackFactor * EVOLUTION_COEFF);
        currentState.pointD += Math.ceil(nm.defenseFactor * EVOLUTION_COEFF);
        currentState.pointS += Math.ceil((nm.staminaFactor / EVOLUTION_S_DIVISOR) * EVOLUTION_COEFF);
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

function getLevelLimit() { return (currentState.reincCount >= LV_LIMIT_THRESHOLD) ? LV_LIMIT_HIGH : LV_LIMIT_NORMAL; }

// --- UI部品 ---

function createEvolutionButton(genjyu, isSpecial = false) {
    const btn = document.createElement('button');
    btn.className = 'evolve-btn';
    btn.style.margin = "4px";
    btn.style.padding = "6px 12px";
    btn.style.textAlign = "center";
    btn.style.lineHeight = "1.2";
    const titleDiv = document.createElement('div');
    titleDiv.style.fontWeight = 'bold';
    titleDiv.textContent = genjyu.genjyuName;
    btn.appendChild(titleDiv);
    const subDiv = document.createElement('div');
    subDiv.style.fontSize = '0.75em';
    subDiv.style.opacity = '0.8';
    subDiv.style.marginTop = '2px';
    if (genjyu.evolutionItem && genjyu.evolutionItem.eItemName) {
        subDiv.textContent = `[${genjyu.evolutionItem.eItemName}]`;
    } else if (isSpecial) {
        subDiv.textContent = `(${genjyu.genjyuId === 0 ? "初期化" : "転生"})`;
    }
    if (subDiv.textContent) btn.appendChild(subDiv);
    return btn;
}

// --- UI描画 ---

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

// --- エントリポイント ---

window.onload = init;