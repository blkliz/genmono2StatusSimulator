/**
 * theory_calc.js - 理論値計算エンジン v1.7
 */

let currentTarget = 'a';
let sortKey = 'a';
let sortDesc = true;
const LV_SP = 498;
const TRANS_BONUS = 110; 

let memoPathBonus = {};

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
    // 自身の情報をノードとして定義
// 自身の情報をノードとして定義
    const thisNode = { 
        name: genjyu.genjyuName, 
        // genjyu.evolutionItem が存在する場合のみ、その中の eItemName を取得する
        item: (genjyu.evolutionItem && genjyu.evolutionItem.eItemName) ? genjyu.evolutionItem.eItemName : "-" 
    };

    if (!genjyu.parentIds || genjyu.parentIds.length === 0) {
        return { pt: 0, path: [thisNode] };
    }

let bestParent = { pt: 0, path: [] };
    genjyu.parentIds.forEach(pId => {
        if (pId !== null && pId !== undefined) {
            const res = getMaxPathBonus(pId, type);
            
            // 1. 理論値が純粋に高い場合は、文句なしに更新
            const isBetterPt = res.pt > bestParent.pt;

            // 2. 同値の場合の判定
            const isSamePt = (res.pt === bestParent.pt && res.pt > 0);
            
            // 暫定ベストが季節モノ（【あり）か判定
            const bestIsVariant = bestParent.path.length > 0 && 
                                  bestParent.path[bestParent.path.length - 1].name.includes("【");
            
            // 新しい候補がオリジナル（【なし）か判定
            const resIsOriginal = res.path.length > 0 && 
                                 !res.path[res.path.length - 1].name.includes("【");

            // 更新条件：
            // A. 新しい候補の方がポイントが高い
            // B. ポイントが同じで、かつ「今のベストが季節モノ」かつ「新しい候補がオリジナル」の時だけ入れ替える
            if (isBetterPt || (isSamePt && bestIsVariant && resIsOriginal)) {
                bestParent = res;
            }
            // ※「同値で両方オリジナル」「同値で新しい方が季節モノ」などの場合は、
            //    条件に合致しないため、最初に見つけたオリジナル（または先にいた方）が維持されます。
        }
    });

    const result = {
        pt: thisBonus + bestParent.pt,
        path: [...bestParent.path, thisNode] // オブジェクトの配列を構築
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
    
    const globalMax = {
        s: findGlobalMaxPathBonus('s'),
        a: findGlobalMaxPathBonus('a'),
        d: findGlobalMaxPathBonus('d')
    };

    let list = GENJYU_DATA.filter(g => g.genjyuId > 1).map(g => {
        const sm = g.statusMultipliers;
        const res = { 
            id: g.genjyuId, 
            name: g.genjyuName, 
            class: g.genjyuClass, 
            type: g.genjyuType,
            routePaths: {} 
        };

        ['s', 'a', 'd', 'l'].forEach(type => {
            const isTarget = (type === currentTarget);
            const pathInfo = getMaxPathBonus(g.genjyuId, type);
            const totalPt = calcTheoryPt(globalMax[type] || 0, pathInfo.pt, isTarget);
            const fKey = type==='s'?'staminaFactor':type==='a'?'attackFactor':type==='d'?'defenseFactor':'luckFactor';
            
            res[type] = getFinalStatus(totalPt, sm[fKey]);
            res[type + '_this'] = pathInfo.pt;
            res[type + '_total'] = totalPt;
            res.routePaths[type] = pathInfo.path;
        });
        return res;
    });

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
            <td style="text-align:left; font-weight:bold;">${g.name}</td>
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

function closeModal() {
    document.getElementById('route-modal').style.display = 'none';
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