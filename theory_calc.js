/**
 * theory_calc.js - 理論値計算エンジン v1.7
 */

let currentTarget = 'a';
let sortKey = 'a';
let sortDesc = true;
const LV_SP = 498;
const TRANS_BONUS = 110; 

let memoPathBonus = {};
let basePointsForCarryOver = { s: 0, a: 0, d: 0 };

let modalHistory = ""; // 履歴保存用

function getFinalStatus(pt, factor) {
    return Math.floor(Math.floor(pt * (factor * 10)) / 10);
}

function calculateSingleBonus(genjyu, type) {
    const sm = genjyu.statusMultipliers;
    if (type === 's') return Math.ceil((sm.staminaFactor / 3) * 1.111);
    if (type === 'a') return Math.ceil(sm.attackFactor * 1.111);
    if (type === 'd') return Math.ceil(sm.defenseFactor * 1.111);
    return 0;
}

/**
 * 当世ボーナスとルートを再帰的に計算
 * 返り値: { pt: 数値, path: [{name: "...", item: "..."}] }
 */
function getMaxPathBonus(genjyuId, type) {
    if (type === 'l') return { pt: 0, path: [] };
    const cacheKey = `${genjyuId}-${type}`;
    if (memoPathBonus[cacheKey] !== undefined) return memoPathBonus[cacheKey];

    const genjyu = GENJYU_DATA.find(g => g.genjyuId === genjyuId);
    if (!genjyu) return { pt: 0, path: [] };

    const thisBonus = calculateSingleBonus(genjyu, type);
    const thisNode = { 
        name: genjyu.genjyuName, 
        item: (genjyu.evolutionItem && genjyu.evolutionItem.eItemName) ? genjyu.evolutionItem.eItemName : "-" 
    };

    if (!genjyu.parentIds || genjyu.parentIds.length === 0) {
        return { pt: 0, path: [thisNode] };
    }

    let bestParent = { pt: 0, path: [] };
    genjyu.parentIds.forEach(pId => {
        if (pId !== null && pId !== undefined) {
            const res = getMaxPathBonus(pId, type);
            
            const isBetterPt = res.pt > bestParent.pt;
            const isSamePt = (res.pt === bestParent.pt && res.pt > 0);
            
            // --- ここから追加：同値の時のサブステータス比較 ---
            let isBetterSub = false;
            if (isSamePt) {
                const subTypes = ['s', 'a', 'd'].filter(t => t !== type);
                const getScore = (p) => {
                    return p.path.reduce((sum, node) => {
                        const gx = GENJYU_DATA.find(x => x.genjyuName === node.name);
                        if (!gx) return sum;
                        return sum + subTypes.reduce((s, t) => s + calculateSingleBonus(gx, t), 0);
                    }, 0);
                };
                isBetterSub = getScore(res) > getScore(bestParent);
            }
            // --- ここまで追加 ---

            const bestIsVariant = bestParent.path.length > 0 && 
                                  bestParent.path[bestParent.path.length - 1].name.includes("【");
            
            const resIsOriginal = res.path.length > 0 && 
                                 !res.path[res.path.length - 1].name.includes("【");

            // 更新条件に isBetterSub を追加
            // A. 純粋に高い
            // B. 同値で、かつサブステータス(A+D)が高い
            // C. 同値かつサブも同値（または低い）が、今のベストが季節モノで新しいのがオリジナル
            if (isBetterPt || 
               (isSamePt && isBetterSub) || 
               (isSamePt && !isBetterSub && bestIsVariant && resIsOriginal)) {
                bestParent = res;
            }
        }
    });

    const result = {
        pt: thisBonus + bestParent.pt,
        path: [...bestParent.path, thisNode]
    };
    memoPathBonus[cacheKey] = result;
    return result;
}

function findGlobalMaxPathBonus(type) {
    if (type === 'l') return 0;
    let max = 0;
    GENJYU_DATA.forEach(g => {
        const res = getMaxPathBonus(g.genjyuId, type);
        if (res.pt > max) max = res.pt;
    });
    return max;
}

/**
 * 修正版：getDetailPathVariants
 * 一覧の理論値(getMaxPathBonus)を「目標値」として、その値に到達する全ルートを正しく探索する
 */
function getDetailPathVariants(genjyuId, type) {
    const genjyu = GENJYU_DATA.find(g => g.genjyuId === genjyuId);
    if (!genjyu || type === 'l') return { paths: [[]] };

    const thisBonus = calculateSingleBonus(genjyu, type);
    const thisNode = { 
        name: genjyu.genjyuName, 
        item: (genjyu.evolutionItem && genjyu.evolutionItem.eItemName) ? genjyu.evolutionItem.eItemName : "-" 
    };

    // 1. 一覧側でのこの幻獣の理論値（目標pt）を取得
    const targetTotal = getMaxPathBonus(genjyuId, type).pt;

    // 2. 終着点（親なし）の場合
    if (!genjyu.parentIds || genjyu.parentIds.length === 0) {
        return { paths: [[thisNode]] };
    }

    // 3. 親を探索
    let allPaths = [];
    const requiredParentPt = targetTotal - thisBonus;

    genjyu.parentIds.forEach(pId => {
        if (pId === null || pId === undefined) return;
        
        // その親が「目標pt」に到達できるルートを持っているか確認
        const parentMax = getMaxPathBonus(pId, type);
        if (parentMax.pt === requiredParentPt) {
            // 条件を満たす親なら、さらにその親のバリエーションを取得
            const res = getDetailPathVariants(pId, type);
            res.paths.forEach(p => {
                allPaths.push([...p, thisNode]);
            });
        }
    });

    // 4. 万が一ルートが見つからない場合の安全策
    if (allPaths.length === 0) {
        allPaths = [[thisNode]];
    }

    return { paths: allPaths };
}

function calcTheoryPt(routeBonus, finalPathBonus, isTarget) {
    const sp = isTarget ? (TRANS_BONUS + LV_SP) : 0;
    let currentPt = 5 + routeBonus + sp;
    for (let i = 0; i < 4; i++) {
        let carryOver = Math.ceil(currentPt / 10);
        currentPt = 5 + routeBonus + sp + carryOver;
    }
    let finalCarryOver = Math.ceil(currentPt / 10);
    return 5 + finalPathBonus + sp + finalCarryOver;
}

function updateTypeFilterOptions() {
    const typeSelect = document.getElementById('filter-type');
    if (!typeSelect) return;
    const types = [...new Set(GENJYU_DATA.map(g => g.genjyuType).filter(t => t))];
    typeSelect.innerHTML = '<option value="">全属性</option>';
    types.forEach(t => {
        const opt = document.createElement('option');
        opt.value = opt.textContent = t;
        typeSelect.appendChild(opt);
    });
}

function render() {
    memoPathBonus = {}; 
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    const searchName = document.getElementById('search-name').value.toLowerCase();
    const filterClass = document.getElementById('filter-class').value;
    const filterType = document.getElementById('filter-type').value; 
    
    // 1. 現在の「極 (currentTarget)」において、全幻獣の中で最も高い当世ptを持つ個体を特定
    // (例: S極なら、Sptが最大となる王盛ノームなどの情報を取得)
    let maxGenjyuForTarget = null;
    let maxTargetPt = -1;

    GENJYU_DATA.forEach(g => {
        const res = getMaxPathBonus(g.genjyuId, currentTarget);
        if (res.pt > maxTargetPt) {
            maxTargetPt = res.pt;
            maxGenjyuForTarget = g;
        }
    });

    // 2. その「極の王」が各ステータスで持っている当世ptを算出。これを転生繰り越しのベースにする
    //const basePointsForCarryOver = { s: 0, a: 0, d: 0 };
    if (maxGenjyuForTarget) {
        const kingRoute = getMaxPathBonus(maxGenjyuForTarget.genjyuId, currentTarget);
        ['s', 'a', 'd'].forEach(t => {
            basePointsForCarryOver[t] = kingRoute.path.reduce((sum, node) => {
                const gx = GENJYU_DATA.find(x => x.genjyuName === node.name);
                return sum + (gx ? calculateSingleBonus(gx, t) : 0);
            }, 0);
        });
    }

    let list = GENJYU_DATA.filter(g => g.genjyuId > 1).map(g => {
        const sm = g.statusMultipliers;
        const res = { 
            id: g.genjyuId, 
            name: g.genjyuName, 
            class: g.genjyuClass, 
            type: g.genjyuType,
            routePaths: {} 
        };

        // 3. この幻獣の「現在の極」におけるルートを一本に固定
        const fixedRoute = getMaxPathBonus(g.genjyuId, currentTarget);

        ['s', 'a', 'd', 'l'].forEach(type => {
            const isTarget = (type === currentTarget);
            
            let pathPt = 0;
            if (type === 'l') {
                pathPt = 0;
            } else if (isTarget) {
                pathPt = fixedRoute.pt;
            } else {
                // 固定されたルート上の他ステータスptを再集計
                pathPt = fixedRoute.path.reduce((sum, node) => {
                    const gx = GENJYU_DATA.find(x => x.genjyuName === node.name);
                    return sum + (gx ? calculateSingleBonus(gx, type) : 0);
                }, 0);
            }

            // 4. 前世として「極の王」の該当ステータスpt（basePointsForCarryOver）を渡して算出
            const totalPt = calcTheoryPt(
                basePointsForCarryOver[type] || 0, 
                pathPt, 
                isTarget
            );
            
            const fKey = type==='s'?'staminaFactor':type==='a'?'attackFactor':type==='d'?'defenseFactor':'luckFactor';
            res[type] = getFinalStatus(totalPt, sm[fKey]);
            res[type + '_this'] = pathPt;
            res[type + '_total'] = totalPt;
            res.routePaths[type] = fixedRoute.path;
        });
        return res;
    });

    // --- フィルタ・ソート・描画処理 (変更なし) ---
    list = list.filter(g => {
        return g.name.toLowerCase().includes(searchName) && 
               (!filterClass || g.class === filterClass) &&
               (!filterType || g.type === filterType);
    });

    const classPriority = { "SS": 7, "S": 6, "A": 5, "B": 4, "C": 3, "D": 2, "F": 1 };
    list.sort((a, b) => {
        let valA = a[sortKey], valB = b[sortKey];
        if (sortKey === 'class') { valA = classPriority[valA] || 0; valB = classPriority[valB] || 0; }
        if (typeof valA === 'string') return sortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        return sortDesc ? valB - valA : valA - valB;
    });

    tbody.innerHTML = list.map(g => `
        <tr>
            <td>${g.id}</td>
            <td style="text-align:left; font-weight:bold;">
    <a href="javascript:void(0)" onclick="openDetailModal(${g.id})" style="color:inherit; text-decoration:underline;">${g.name}</a>
</td>
            <td>${g.class}</td>
            <td>${g.type || '-'}</td>
            <td class="val-cell ${currentTarget==='s'?'highlight':''}">${g.s}</td><td class="pt-this">${g.s_this}</td><td class="pt-total">${g.s_total}</td>
            <td class="val-cell ${currentTarget==='a'?'highlight':''}">${g.a}</td><td class="pt-this">${g.a_this}</td><td class="pt-total">${g.a_total}</td>
            <td class="val-cell ${currentTarget==='d'?'highlight':''}">${g.d}</td><td class="pt-this">${g.d_this}</td><td class="pt-total">${g.d_total}</td>
            <td class="val-cell ${currentTarget==='l'?'highlight':''}">${g.l}</td><td class="pt-this">${g.l_this}</td><td class="pt-total">${g.l_total}</td>
            <td><button class="route-btn" onclick="openRouteModal('${g.name}', '${currentTarget}', ${JSON.stringify(g.routePaths[currentTarget]).replace(/"/g, '&quot;')})">R</button></td>
        </tr>
    `).join('');
}

function openRouteModal(name, type, pathArray) {
    const modal = document.getElementById('route-modal');
    const title = document.getElementById('modal-title');
    const content = document.getElementById('modal-content');
    
    title.innerText = `${name} (${type.toUpperCase()}極ルート)`;
    
    // スタイルに「スクロール対応」と「注釈」を追加
    let tableHtml = `
        <p style="font-size: 0.75rem; color: #666; margin-bottom: 10px;">※参考ルート一例</p>
        <div style="max-height: 60vh; overflow-y: auto; border: 1px solid #eee;">
            <table class="route-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="position: sticky; top: 0; background: #f4f4f4; z-index: 1;">
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 0.8rem;">幻獣名</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 0.8rem;">変化アイテム</th>
                    </tr>
                </thead>
                <tbody>`;
    
    if (pathArray && pathArray.length > 0) {
        pathArray.forEach(node => {
            tableHtml += `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px; font-size: 0.85rem;">${node.name}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; font-size: 0.85rem;">${node.item}</td>
                </tr>`;
        });
    } else {
        tableHtml += `<tr><td colspan="2" style="padding: 8px; text-align: center;">ルート情報がありません。</td></tr>`;
    }
    
    tableHtml += `</tbody></table></div>`;
    
    content.innerHTML = tableHtml;
    modal.style.display = 'block';
}

function openDetailModal(genjyuId) {
    const genjyu = GENJYU_DATA.find(g => g.genjyuId === genjyuId);
    if (!genjyu) return;

    // --- 追加：検証モードの徹底 ---
    // 計算前に一度キャッシュをクリアし、現在のターゲットに基づいた
    // 正しい getMaxPathBonus の計算を保証します
    memoPathBonus = {};

    const modal = document.getElementById('route-modal');
    const content = document.getElementById('modal-content');
    const title = document.getElementById('modal-title');
    title.innerText = `${genjyu.genjyuName} - 理論値ルート候補一覧 (${currentTarget.toUpperCase()}極)`;

    const res = getDetailPathVariants(genjyuId, currentTarget);
    
    let variantList = res.paths.map(path => {
        const rowData = { path: path };
        const sm = genjyu.statusMultipliers;

        ['s', 'a', 'd', 'l'].forEach(type => {
            const isTarget = (type === currentTarget);
            let pathPt = 0;
            if (type !== 'l') {
                pathPt = path.reduce((sum, node) => {
    // 「生まれ変わる者」はボーナス計算の対象外（常に0）にする
    if (node.name === "生まれ変わる者") return sum;

    const gx = GENJYU_DATA.find(x => x.genjyuName === node.name);
    return sum + (gx ? calculateSingleBonus(gx, type) : 0);
}, 0);
            }

            // グローバルの basePointsForCarryOver を使用（renderと同期）
            const totalPt = calcTheoryPt(basePointsForCarryOver[type] || 0, pathPt, isTarget);

            const fKey = type==='s'?'staminaFactor':type==='a'?'attackFactor':type==='d'?'defenseFactor':'luckFactor';
            rowData[type] = getFinalStatus(totalPt, sm[fKey]);
            rowData[type + '_this'] = pathPt;
            rowData[type + '_total'] = totalPt;
        });
        return rowData;
    });

    // 数値が同じルートが複数あれば、ここで全て表示されます（多様性の維持）
    variantList.sort((a, b) => {
        if (b[currentTarget] !== a[currentTarget]) return b[currentTarget] - a[currentTarget];
        return (b.a + b.d + b.s) - (a.a + a.d + a.s);
    });

    let html = `
        <div style="margin-bottom: 15px;">
            <button onclick="closeModal()" style="padding: 5px 15px; cursor: pointer;">閉じる</button>
        </div>
        <div style="overflow-x: auto;">
            <table class="modal-table">
                <thead>
                    <tr>
                        <th rowspan="2">候補</th>
                        <th colspan="3">Stamina</th><th colspan="3">Attack</th><th colspan="3">Defense</th><th colspan="3">Luck</th><th rowspan="2">Route</th>
                    </tr>
                    <tr>
                        <th>実数値</th><th>Spt</th><th>計</th><th>実数値</th><th>Apt</th><th>計</th><th>実数値</th><th>Dpt</th><th>計</th><th>実数値</th><th>Lpt</th><th>計</th>
                    </tr>
                </thead>
                <tbody>
                    ${variantList.map((v, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td style="font-weight:bold; background:#fffcf0;">${v.s}</td><td>${v.s_this}</td><td>${v.s_total}</td>
                            <td style="font-weight:bold; background:#fffcf0;">${v.a}</td><td>${v.a_this}</td><td>${v.a_total}</td>
                            <td style="font-weight:bold; background:#fffcf0;">${v.d}</td><td>${v.d_this}</td><td>${v.d_total}</td>
                            <td style="font-weight:bold; background:#fffcf0;">${v.l}</td><td>${v.l_this}</td><td>${v.l_total}</td>
                            <td><button class="route-btn" onclick='openRouteFromDetail("${genjyu.genjyuName}", "${currentTarget}", ${JSON.stringify(v.path).replace(/"/g, '&quot;')})'>R</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;

    modalHistory = html;
    content.innerHTML = html;
    modal.style.display = 'block';
}

/**
 * 詳細一覧モーダルから呼ばれる「変化ルート表示」
 */
function openRouteFromDetail(name, type, pathArray) {
    const content = document.getElementById('modal-content');
    
    let tableHtml = `
        <div style="margin-bottom: 15px;">
            <button onclick="restoreModalDetail()" style="padding: 5px 15px; cursor: pointer;">← 候補一覧に戻る</button>
        </div>
        <p style="font-size: 0.9rem; font-weight: bold; margin-bottom: 10px;">${name} の変化ルート</p>
        <div style="max-height: 50vh; overflow-y: auto; border: 1px solid #eee;">
            <table class="route-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f4f4f4;">
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">幻獣名</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">変化アイテム</th>
                    </tr>
                </thead>
                <tbody>`;

    pathArray.forEach(node => {
        tableHtml += `
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${node.name}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${node.item}</td>
            </tr>`;
    });

    tableHtml += `</tbody></table></div>`;
    content.innerHTML = tableHtml;
}

/**
 * 保存しておいた詳細一覧画面に戻す
 */
function restoreModalDetail() {
    if (modalHistory) {
        document.getElementById('modal-content').innerHTML = modalHistory;
    }
}


function closeModal() {
    document.getElementById('route-modal').style.display = 'none';
}

function restoreModal() {
    if (modalHistory) {
        document.getElementById('modal-content').innerHTML = modalHistory;
    }
}

function changeTarget(t) {
    currentTarget = t;
    sortKey = t;
    document.querySelectorAll('.mode-selector button').forEach(b => b.classList.remove('active-mode'));
    const targetBtn = document.getElementById('btn-' + t);
    if (targetBtn) targetBtn.classList.add('active-mode');
    render();
}

function setSort(key) {
    if (sortKey === key) sortDesc = !sortDesc;
    else { sortKey = key; sortDesc = true; }
    render();
}

window.onload = () => {
    updateTypeFilterOptions();
    changeTarget('a');
};