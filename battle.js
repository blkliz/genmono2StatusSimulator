window.onload = () => {
    const searchInput = document.getElementById('enemy-search');
    const dataList = document.getElementById('enemy-names');

    if (typeof enemies === 'undefined') {
        console.error("battle_data.js が読み込まれた状態で実行してください.");
    } else if (dataList) {
        dataList.innerHTML = ""; 
        enemies.forEach(enemy => {
            const option = document.createElement('option');
            option.value = enemy.name;
            dataList.appendChild(option);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('change', function() {
            const selectedEnemy = enemies.find(enemy => enemy.name === this.value);
            if (selectedEnemy) {
                document.getElementById('selected-enemy-name').textContent = selectedEnemy.name;
                document.getElementById('enemy-s').value = selectedEnemy.hp;
                document.getElementById('enemy-a').value = selectedEnemy.atk;
                document.getElementById('enemy-d').value = selectedEnemy.def;
                
                const typeTd = document.getElementById('enemy-type');
                if (typeTd) {
                    typeTd.innerHTML = `<span class="badge">${selectedEnemy.attr}</span>`;
                }
                
                const abiTd = document.getElementById('enemy-ability');
                if (abiTd) {
                    abiTd.textContent = selectedEnemy.abi;
                }
            }
        });
    }

    const unit1 = document.getElementById('unit-1');
    if (unit1) {
        const templateSource = unit1.querySelector('.unit-inner');
        if (templateSource) {
            const baseHtml = templateSource.innerHTML;
            for (let i = 2; i <= 4; i++) {
                const targetContainer = document.getElementById(`unit-inner-${i}`);
                if (targetContainer) {
                    targetContainer.innerHTML = baseHtml.replace(/-1/g, `-${i}`);
                }
            }
        }
        
        initEquipDatalists();
        for (let i = 1; i <= 4; i++) {
            initEquipAndCards(i);
            setupValidation(i);
            setupSaveLoad(i);
            updateRealStatus(i);
        }
    }
};

const armorAbilityOrder = [
    "成長", "持久", "底力", "生存", "雲竜", "勇将", "闘争", "虎咆", "猛将", "猛皇",
    "浪漫", "強固", "頑固", "鉄壁", "防衛", "護鶴", "賢将", "賢皇", "激運", "天運",
    "加護", "天佑", "覇王", "大帝", "修羅", "一八", "才華", "博打", "誘惑", "悪戯",
    "砕身", "瞑想", "改命", "遊戯", "慈恵", "戦略", "威風", "早熟", "強欲",
    "獣属", "魔属", "霊属", "地属", "龍属", "無属"
];

const weaponAbilityOrder = [
    "強打", "五雨", "粉砕", "大撃", "不乱", "壮健", "高揚", "紅舞", "凍結", "突風",
    "猛突", "疾風", "一斉", "盟旗", "回復", "癒唄", "爽活", "福音", "天晴",
    "獣属", "魔属", "霊属", "地属", "龍属", "無属", "和属"
];

const abilityBaseRates = {
    "強打": 38, "凍結": 38, "高揚": 38, "回復": 38,
    "獣属": 38, "魔属": 38, "霊属": 38, "地属": 38, "無属": 38, "龍属": 38,
    "五雨": 28, "突風": 28, "猛突": 28, "粉砕": 28, "盟旗": 28,
    "一斉": 18, "大撃": 18, "不乱": 18, "壮健": 18, "紅舞": 18, "疾風": 18, "癒唄": 18, "爽活": 18, "福音": 18, "和属": 18,
    "天晴": 12
};

const attributeCompatibility = {
    "獣": { "魔": 1.4, "霊": 0.7 },
    "魔": { "霊": 1.4, "獣": 0.7 },
    "霊": { "獣": 1.4, "魔": 0.7 },
    "無": { "地": 1.4, "龍": 0.7 },
    "地": { "龍": 1.4, "無": 0.7 },
    "龍": { "無": 1.4, "地": 0.7 }
};

const fukuinTable = [
    [400,600,800,1000,1200,1400,1600,1800,2000,2200],
    [410,600,800,1000,1210,1400,1610,1810,2020,2220],
    [420,610,820,1030,1240,1440,1650,1860,2060,2270],
    [440,640,860,1080,1300,1510,1730,1950,2160,2380],
    [470,690,920,1160,1400,1620,1860,2090,2330,2560],
    [520,760,1020,1280,1540,1790,2050,2310,2570,2820],
    [580,860,1150,1440,1740,2010,2310,2600,2890,3180],
    [670,990,1320,1650,1990,2310,2650,2980,3310,3650],
    [770,1140,1520,1910,2300,2670,3060,3440,3830,4210],
    [890,1330,1780,2220,2670,3110,3560,4010,4450,4900],
    [1040,1550,2070,2590,3110,3620,4150,4670,5190,5700],
    [1210,1810,2410,3020,3630,4220,4840,5440,6040,6650],
    [1410,2100,2800,3510,4220,4910,5620,6320,7020,7730],
    [1630,2430,3250,4060,4880,5690,6510,7320,8140,8950],
    [1880,2810,3750,4690,5630,6560,7510,8450,9380,10320],
    [2160,3230,4300,5380,6470,7530,8620,9700,10770,11850],
    [2470,3690,4920,6150,7390,8610,9850,11080,12310,13550],
    [2800,4200,5600,7000,8400,9800,11200,12600,14000,15400],
    [3170,4740,6330,7910,9500,11080,12670,14250,15840,17420],
    [3570,5350,7130,8920,10710,12480,14270,16060,17840,19620],
    [4000,6000,8000,10000,12000,14000,16000,18000,20000,22000]
];

// 天晴す陽光（天晴）回復量テーブル
// 縦軸: 強化値(+0〜+20) / 横軸: グレード(G1〜G10)
//グレード10以外のグレードはダミーデータ
const tenharasuTable = [
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000], // +0
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2010], // +1
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2020], // +2
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2070], // +3
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2150], // +4
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2290], // +5
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2490], // +6
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2780], // +7
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 3160], // +8
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 3650], // +9
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 4250], // +10
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 5000], // +11
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 5890], // +12
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 6950], // +13
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 8180], // +14
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 9600], // +15
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 11220], // +16
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 13060], // +17
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 15130], // +18
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 17440], // +19
    [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 20000]  // +20
];

function initEquipDatalists() {
    const wList = document.getElementById('weapon-names');
    const aList = document.getElementById('armor-names');
    if (typeof weapons !== 'undefined' && wList) {
        wList.innerHTML = "";
        weapons.filter(w => weaponAbilityOrder.includes(w.abi))
               .sort((a, b) => weaponAbilityOrder.indexOf(a.abi) - weaponAbilityOrder.indexOf(b.abi))
               .forEach(w => wList.appendChild(new Option(`${w.name} [${w.abi || 'なし'}]`, w.name)));
    }
    if (typeof armors !== 'undefined' && aList) {
        aList.innerHTML = "";
        armors.filter(a => armorAbilityOrder.includes(a.abi))
              .sort((a, b) => armorAbilityOrder.indexOf(a.abi) - armorAbilityOrder.indexOf(b.abi))
              .forEach(a => aList.appendChild(new Option(`${a.name} [${a.abi || 'なし'}]`, a.name)));
    }
}

function initEquipAndCards(id) {
    const wp = document.getElementById(`weapon-plus-${id}`);
    const ap = document.getElementById(`armor-plus-${id}`);
    const wc = document.getElementById(`weapon-ability-select-${id}`);
    const ac = document.getElementById(`armor-ability-select-${id}`);
    if (wp) { wp.innerHTML = ""; for (let p = 0; p <= 20; p++) wp.add(new Option(`+${p}`, p)); }
    if (ap) { ap.innerHTML = ""; for (let p = 0; p <= 20; p++) ap.add(new Option(`+${p}`, p)); }
    if (typeof weaponCardAbilities !== 'undefined' && wc) {
        wc.innerHTML = '<option value="">武器カード選択</option>';
        weaponCardAbilities.filter(abi => weaponAbilityOrder.includes(abi.name))
                          .sort((a, b) => weaponAbilityOrder.indexOf(a.name) - weaponAbilityOrder.indexOf(b.name))
                          .forEach(abi => wc.add(new Option(abi.name, abi.name)));
    }
    if (typeof armorCardAbilities !== 'undefined' && ac) {
        ac.innerHTML = '<option value="">防具カード選択</option>';
        armorCardAbilities.filter(abi => armorAbilityOrder.includes(abi.name))
                         .sort((a, b) => armorAbilityOrder.indexOf(a.name) - armorAbilityOrder.indexOf(b.name))
                         .forEach(abi => ac.add(new Option(abi.name, abi.name)));
    }
}

function setupValidation(id) {
    const inputs = [`base-s-${id}`, `base-a-${id}`, `base-d-${id}`, `base-l-${id}`, `weapon-plus-${id}`, `armor-plus-${id}`, `weapon-ability-select-${id}`, `armor-ability-select-${id}`, `manual-type-${id}`, `weapon-select-${id}`, `armor-select-${id}`, `manual-name-${id}`, `unit-join-${id}`];
    inputs.forEach(tid => {
        const el = document.getElementById(tid);
        if (el) el.addEventListener('input', () => {
            if (tid.includes('base-')) {
                if (el.value < 0) el.value = 0;
                el.value = Math.floor(el.value);
            }
            if (tid === `manual-name-${id}`) {
                const span = id === 1 ? document.querySelector('#unit-1 .display-unit-name') : document.getElementById(`display-name-${id}`);
                if (span) span.textContent = el.value || "未設定";
            }
            updateRealStatus(id);
        });
    });
}

function setupSaveLoad(id) {
    const slotSelect = document.getElementById(`save-slot-${id}`);
    if (!slotSelect) return;
    const container = slotSelect.parentElement;
    const saveBtn = container.querySelector('.btn-plus');
    const delBtn = container.querySelector('.btn-delete');
    if (saveBtn) saveBtn.onclick = () => saveUnitData(id);
    if (delBtn) delBtn.onclick = () => deleteUnitData(id);
    slotSelect.onchange = function() {
        if (this.value === "") resetUnitData(id);
        else loadUnitData(id, this.value);
    };
    updateLoadSelect(id);
}

function resetUnitData(id) {
    const fields = [`manual-name-${id}`, `manual-type-${id}`, `base-s-${id}`, `base-a-${id}`, `base-d-${id}`, `base-l-${id}`, `weapon-select-${id}`, `weapon-plus-${id}`, `weapon-ability-select-${id}`, `armor-select-${id}`, `armor-plus-${id}`, `armor-ability-select-${id}`];
    fields.forEach(f => { const el = document.getElementById(f); if (el) { if (el.tagName === "SELECT") el.selectedIndex = 0; else el.value = ""; } });
    const span = id === 1 ? document.querySelector('#unit-1 .display-unit-name') : document.getElementById(`display-name-${id}`);
    if (span) span.textContent = "未設定";
    updateRealStatus(id);
}

function saveUnitData(id) {
    const nameInput = document.getElementById(`manual-name-${id}`);
    if (!nameInput || !nameInput.value) return alert("幻獣名を入力してください。");
    const name = nameInput.value;
    const data = {
        name, type: document.getElementById(`manual-type-${id}`).value,
        s: document.getElementById(`base-s-${id}`).value, a: document.getElementById(`base-a-${id}`).value,
        d: document.getElementById(`base-d-${id}`).value, l: document.getElementById(`base-l-${id}`).value,
        weapon: document.getElementById(`weapon-select-${id}`).value, wPlus: document.getElementById(`weapon-plus-${id}`).value, wCard: document.getElementById(`weapon-ability-select-${id}`).value,
        armor: document.getElementById(`armor-select-${id}`).value, aPlus: document.getElementById(`armor-plus-${id}`).value, aCard: document.getElementById(`armor-ability-select-${id}`).value
    };
    localStorage.setItem(`bs_genjyu_savedata_${name}`, JSON.stringify(data));
    for (let i = 1; i <= 4; i++) updateLoadSelect(i);
    alert("保存しました。");
}

function deleteUnitData(id) {
    const key = document.getElementById(`save-slot-${id}`).value;
    if (!key) return alert("削除するスロットを選択してください。");
    if (confirm("データを削除しますか？")) {
        localStorage.removeItem(key);
        for (let i = 1; i <= 4; i++) updateLoadSelect(i);
        resetUnitData(id);
    }
}

function loadUnitData(id, key) {
    const dataStr = localStorage.getItem(key);
    if (!dataStr) return;
    const data = JSON.parse(dataStr);
    const fields = {
        name: `manual-name-${id}`, type: `manual-type-${id}`, s: `base-s-${id}`, a: `base-a-${id}`, d: `base-d-${id}`, l: `base-l-${id}`,
        weapon: `weapon-select-${id}`, wPlus: `weapon-plus-${id}`, wCard: `weapon-ability-select-${id}`,
        armor: `armor-select-${id}`, aPlus: `armor-plus-${id}`, aCard: `armor-ability-select-${id}`
    };
    Object.keys(fields).forEach(k => { const el = document.getElementById(fields[k]); if (el) el.value = data[k]; });
    const span = id === 1 ? document.querySelector('#unit-1 .display-unit-name') : document.getElementById(`display-name-${id}`);
    if (span) span.textContent = data.name;
    updateRealStatus(id);
}

function updateLoadSelect(id) {
    const select = document.getElementById(`save-slot-${id}`);
    if (!select) return;
    const cur = select.value;
    select.innerHTML = '<option value="">スロットを選択...</option>';
    let keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('bs_genjyu_savedata_')) keys.push(k);
    }
    keys.sort().forEach(k => {
        const dStr = localStorage.getItem(k);
        if (dStr) { const d = JSON.parse(dStr); select.add(new Option(d.name, k)); }
    });
    select.value = cur;
}

function updateRealStatus(id) {
    const getV = (eid) => Math.max(0, Math.floor(Number(document.getElementById(eid)?.value) || 0));
    let s_raw = getV(`base-s-${id}`), a_raw = getV(`base-a-${id}`), d_raw = getV(`base-d-${id}`), l_raw = getV(`base-l-${id}`);
    let s = s_raw, a = a_raw, d = d_raw, l = l_raw;

    const wName = document.getElementById(`weapon-select-${id}`)?.value;
    const aName = document.getElementById(`armor-select-${id}`)?.value;
    const wPlus = Number(document.getElementById(`weapon-plus-${id}`)?.value || 0);
    const aPlus = Number(document.getElementById(`armor-plus-${id}`)?.value || 0);
    const wCard = document.getElementById(`weapon-ability-select-${id}`)?.value;
    const aCard = document.getElementById(`armor-ability-select-${id}`)?.value;

    const wData = typeof weapons !== 'undefined' ? weapons.find(w => w.name === wName) : null;
    const aData = typeof armors !== 'undefined' ? armors.find(a => a.name === aName) : null;
    
    if (aData) {
		//Math.floor→Math.ceilへ修正
        d = Math.ceil(d * (1 + 0.01 * aData.grade));
        let tempBaseA = { s, a, d, l };
        let res = applyAbilityEffect(aData.abi, s, a, d, l, aPlus, tempBaseA);
        s = res.s; a = res.a; d = res.d; l = res.l;
        if (aCard) {
            let tempBaseC = { s, a, d, l };
            let resC = applyAbilityEffect(aCard, s, a, d, l, aPlus, tempBaseC);
            s = resC.s; a = resC.a; d = resC.d; l = resC.l;
        }
    }
    if (wData) {
        let rate = wPlus <= 10 ? wPlus * (20 + wData.grade) : wPlus * (30 + wData.grade);
        a += Math.ceil(wData.atk * (1 + rate / 100));
    }
    if (aData) {
        let rate = aPlus <= 10 ? aPlus * (20 + aData.grade) : aPlus * (30 + aData.grade);
        d += Math.ceil(aData.def * (1 + rate / 100));
    }

    const rs = document.getElementById(`real-s-${id}`);
    const ra = document.getElementById(`real-a-${id}`);
    const rd = document.getElementById(`real-d-${id}`);
    const rl = document.getElementById(`real-l-${id}`);
//Math.floor→Math.ceilへ
    if (rs) rs.textContent = Math.ceil(s);
    if (ra) ra.textContent = Math.ceil(a);
    if (rd) rd.textContent = Math.ceil(d);
    if (rl) rl.textContent = Math.ceil(l);
}

function applyAbilityEffect(abi, s, a, d, l, plus, base) {
    let res = { s, a, d, l };
    if (!abi || abi === "なし") return res;
    let diff = 0;
    switch (abi) {
		//Math.floor→Math.ceilへ
        case "成長": res.s += 300; break;
        case "持久": res.s += Math.ceil(base.s * 0.15); break;
        case "底力": res.s += Math.ceil(base.s * 0.20); break;
        case "生存": res.s += Math.ceil(base.s * (plus * 0.05)); break;
        case "雲竜": res.l += 100; res.s += Math.ceil(base.s * (plus * 0.06)); break;
        case "勇将": res.s += Math.ceil(base.s * (plus * 0.075)); break;
        case "闘争": res.a += Math.ceil(base.a * (plus * 0.01)); break;
        case "虎咆": res.l += 100; res.a += Math.ceil(base.a * (plus * 0.0125)); break;
        case "猛将": res.a += Math.ceil(base.a * (plus * 0.02)); break;
        case "猛皇": res.a += Math.ceil(base.a * (plus * 0.04)); break;
        case "強固": res.d += 50; break;
        case "頑固": res.d += Math.ceil(base.d * 0.10); break;
        case "鉄壁": res.d += Math.ceil(base.d * 0.15); break;
        case "防衛": res.d += Math.ceil(base.d * (plus * 0.01)); break;
        case "護鶴": res.l += 100; res.d += Math.ceil(base.d * (plus * 0.0125)); break;
        case "賢将": res.d += Math.ceil(base.d * (plus * 0.02)); break;
        case "賢皇": res.d += Math.ceil(base.d * (plus * 0.04)); break;
        case "激運": res.l += 50; break;
        case "天運": res.l += (plus * 5); break;
        case "加護": res.s += Math.ceil(base.s * 0.10); res.a += Math.ceil(base.a * 0.10); res.d += Math.ceil(base.d * 0.10); break;
        case "天佑": res.s += Math.ceil(base.s * 0.12); res.a += Math.ceil(base.a * 0.12); res.d += Math.ceil(base.d * 0.12); res.l += Math.ceil(base.l * 0.12); break;
        case "覇王": res.a += Math.ceil(base.a * 0.15); res.d += Math.ceil(base.d * 0.15); break;
        case "大帝": res.s += Math.ceil(base.s * 0.45); res.a += Math.ceil(base.a * 0.15); break;
        case "修羅": res.a += Math.ceil(base.a * (plus * 0.015)); res.d += Math.ceil(base.d * (plus * 0.015)); res.s += Math.ceil(base.s * (plus * 0.04)); break;
        case "一八": res.a += Math.ceil(base.a * (plus * 0.01)); res.d += Math.ceil(base.d * (plus * 0.01)); res.s += Math.ceil(base.s * (plus * 0.03)); break;
        case "才華": diff = Math.ceil(res.l * 0.50); res.l -= diff; res.s += Math.ceil(diff * 7.5); res.a += Math.ceil(diff * 7.5); res.d += Math.ceil(diff * 7.5); break;
        case "誘惑": diff = Math.ceil(res.s * 0.20); res.s -= diff; res.a += diff; break;
        case "悪戯": diff = Math.ceil(res.d * 0.20); res.d -= diff; res.s += diff; res.a += diff; break;
        case "砕身": diff = Math.ceil(res.d * 0.15); res.d -= diff; res.s += Math.ceil(diff / 2); res.a += Math.ceil(diff * 4); break;
        case "瞑想": diff = Math.ceil(res.d * 0.15); res.d -= diff; res.s += Math.ceil(diff * 8); res.l += Math.ceil(diff * 0.15); break;
        case "改命": diff = Math.ceil(res.d * 0.10); res.d -= diff; res.s += Math.ceil(diff * 15); res.l += Math.ceil(diff * 0.12); break;
        case "遊戯": diff = Math.ceil(res.a * 0.20); res.a -= diff; res.s += diff; res.d += diff; break;
        case "慈恵": diff = Math.ceil(res.a * 0.15); res.a -= diff; res.s += Math.ceil(diff / 2); res.d += Math.ceil(diff * 4); break;
        case "戦略": diff = Math.ceil(res.a * 0.15); res.a -= diff; res.s += Math.ceil(diff * 8); res.l += Math.ceil(diff * 0.15); break;
        case "威風": diff = Math.ceil(res.a * 0.10); res.a -= diff; res.s += Math.ceil(diff * 15); res.l += Math.ceil(diff * 0.12); break;
        case "早熟": case "強欲": res.s = Math.ceil(res.s * 0.20); res.a = Math.ceil(res.a * 0.20); res.d = Math.ceil(res.d * 0.20); break;
    }
    return res;
}

function getUnitState(id) {
    const isJoined = document.getElementById(`unit-join-${id}`)?.checked;
    const manualName = document.getElementById(`manual-name-${id}`)?.value.trim();
    if (!isJoined || !manualName) return null;

    let s = Number(document.getElementById(`real-s-${id}`).textContent);
    let a = Number(document.getElementById(`real-a-${id}`).textContent);
    let d = Number(document.getElementById(`real-d-${id}`).textContent);
    let l = Number(document.getElementById(`real-l-${id}`).textContent);

    const wName = document.getElementById(`weapon-select-${id}`).value;
    const wData = (typeof weapons !== 'undefined') ? weapons.find(w => w.name === wName) : null;
    const wPlus = Number(document.getElementById(`weapon-plus-${id}`).value);
    const wCardName = document.getElementById(`weapon-ability-select-${id}`).value;

    const typeMap = ["", "獣", "魔", "霊", "無", "地", "龍"];
    let attr = typeMap[document.getElementById(`manual-type-${id}`).value];
    
    const aName = document.getElementById(`armor-select-${id}`).value;
    const aData = (typeof armors !== 'undefined') ? armors.find(ar => ar.name === aName) : null;
    const aAbi = aData?.abi;
    const aCard = document.getElementById(`armor-ability-select-${id}`).value;
    const attrAbis = ["獣属", "魔属", "霊属", "地属", "龍属", "無属"];
    if (attrAbis.includes(aAbi)) attr = aAbi.replace("属", "");
    if (attrAbis.includes(aCard)) attr = aCard.replace("属", "");

    return {
        id, name: manualName, s: s, maxS: s, atk: a, def: d, luck: l, attr,
        currentAtk: a, currentDef: d,
        weaponAbi: wData?.abi || "なし",
        weaponCardAbi: wCardName || "なし",
        wPlus, wGrade: wData?.grade || 0,
        isDead: false,
        damageReduction: 1.0
    };
}

function getComp(atkAttr, defAttr) {
    return attributeCompatibility[atkAttr]?.[defAttr] || 1.0;
}

//ここはMath.floorで正しい。
function getRandomFactor() {
    return 1.0 + (Math.floor(Math.random() * 101) / 1000); 
}

function calculateDamage(atkUnit, enemy, isAllyAtk, allUnits = []) {
    let selectedAbi = null;
    let resObj = { dmg: 0, abi: null, heal: 0, revive: false, buff: null, debuff: null, attrMatch: false, debugInfo: "" };

    if (isAllyAtk) {
        const checkAbi = (name) => {
            if (!name || name === "なし") return null;
            let baseProb = abilityBaseRates[name] || 0;
            let luckAdd = Math.min(25, atkUnit.luck * 0.05);
            let plusAdd = atkUnit.wPlus >= 10 ? 7 + (atkUnit.wPlus - 10) * 1.8 : 0;
            let gradeAdd = atkUnit.wGrade * 1.1;
            const prob = baseProb + luckAdd + plusAdd + gradeAdd;
            const hit = Math.random() * 100 < prob;
            resObj.debugInfo += `[${name}判定: ${prob.toFixed(2)}% -> ${hit?'○':'×'}] `;
            return hit ? name : null;
        };

        selectedAbi = checkAbi(atkUnit.weaponAbi);
        if (!selectedAbi) {
            selectedAbi = checkAbi(atkUnit.weaponCardAbi);
        }
        resObj.abi = selectedAbi;

        if (selectedAbi === "一斉") {
            let total = 0;
            allUnits.forEach(u => {
                if (!u.isDead) {
                    let baseSub = Math.max(1, u.currentAtk - enemy.def);
                    let val = Math.ceil(baseSub * getComp(u.attr, enemy.attr));
                    total += val;
                }
            });
            resObj.dmg = Math.ceil(total * getRandomFactor());
            return resObj;
        }

        let weaponAbiMultiplier = 1.0;
        let calcAtk = atkUnit.currentAtk;
        let sRatio = Math.floor((atkUnit.s / atkUnit.maxS) * 100); 

        switch (selectedAbi) {
            case "強打": weaponAbiMultiplier = 1.3; break;
            case "五雨": weaponAbiMultiplier = 1.6; break;
            case "粉砕": weaponAbiMultiplier = 1.4; resObj.debuff = { target: "enemy", stat: "def", rate: 0.8 }; break;
            case "大撃": weaponAbiMultiplier = 2.0; break;
            case "不乱": 
                if (sRatio >= 61) weaponAbiMultiplier = 2.0;
                else if (sRatio <= 10) weaponAbiMultiplier = 3.0;
                else weaponAbiMultiplier = 2.0 + (60 - sRatio) * 0.02;
                break;
            case "壮健":
                if (sRatio <= 50) weaponAbiMultiplier = 2.0;
                else if (sRatio >= 100) weaponAbiMultiplier = 2.5;
                else weaponAbiMultiplier = 2.0 + (sRatio - 50) * 0.01;
                break;
            case "和属": weaponAbiMultiplier = 1.2; break;
            case "高揚": 
                calcAtk = Math.ceil(calcAtk * 1.1);
                resObj.buff = { target: "self", stat: "atk", rate: 1.1 }; 
                break;
			case "紅舞": 
			    atkUnit.currentAtk = Math.ceil(atkUnit.currentAtk * 1.08);
			    // ダメージ計算用の変数も更新後の値に合わせる
			    calcAtk = atkUnit.currentAtk; 
			    weaponAbiMultiplier = 2.0; 
			    resObj.buff = { target: "all_except_self", stat: "atk", rate: 1.08 }; 
			    break;
            case "凍結": atkUnit.damageReduction = 0.7; break;
            case "突風": atkUnit.damageReduction = 0.5; break;
            case "猛突": weaponAbiMultiplier = 1.7; atkUnit.damageReduction = 0.7; break;
            case "疾風": weaponAbiMultiplier = 1.7; resObj.debuff = { target: "enemy_temp", stat: "atk", rate: 0.5 }; break;
            case "盟旗": 
                resObj.buff = { target: "all", stat: "atk", rate: 1.1 }; 
                break;
            case "回復": resObj.heal = Math.ceil(atkUnit.maxS * 0.15); break;
            case "癒唄": resObj.heal = Math.ceil(atkUnit.maxS * 0.30); break;
            case "爽活": resObj.heal = Math.ceil(atkUnit.maxS * 0.20); resObj.revive = true; break;
            case "福音": resObj.heal = fukuinTable[atkUnit.wPlus][atkUnit.wGrade-1] || 400; resObj.revive = true; break;
            case "天晴":
				resObj.heal = tenharasuTable[atkUnit.wPlus][atkUnit.wGrade - 1] || 2000;                resObj.revive = true; 
                resObj.buff = { target: "all", stat: "atk", rate: 1.06 }; 
                break;
        }

        const noDmgAbis = ["盟旗", "回復", "癒唄", "爽活", "福音", "天晴"];
        if (noDmgAbis.includes(selectedAbi)) {
            resObj.dmg = 0;
            resObj.debugInfo += `(行動:${selectedAbi})`;
        } else {
            let baseSub = Math.max(1, calcAtk - enemy.def);
            let val = Math.ceil(baseSub * weaponAbiMultiplier);
            resObj.debugInfo += `(${atkUnit.attr}A:${calcAtk} vs ${enemy.attr}D:${enemy.def} = ${baseSub}×倍:${weaponAbiMultiplier})`;

            if (selectedAbi === "和属") {
                allUnits.forEach(u => {
                    if (!u.isDead) {
                        let c = getComp(u.attr, enemy.attr);
                        val = val * c;
                        resObj.debugInfo += `×味${u.id}:${c}`;
                    }
                });
                let selfC = getComp(atkUnit.attr, enemy.attr);
                val = Math.ceil(val * selfC);
                resObj.debugInfo += `×自:${selfC}`;
            } else {
                let comp = getComp(atkUnit.attr, enemy.attr);
                val = Math.ceil(val * comp);
                resObj.debugInfo += `×相性:${comp}`;

                const targetAbis = ["獣属", "魔属", "霊属", "地属", "龍属", "無属"];
                if (selectedAbi && targetAbis.includes(selectedAbi)) {
                    const abiAttr = selectedAbi.replace("属", "");
                    if (atkUnit.attr === abiAttr) {
                        let matchBonus = getComp(atkUnit.attr, enemy.attr) === 1.4 ? 1.4 : 1.2;
                        val = Math.ceil(val * matchBonus);
                        resObj.attrMatch = true;
                        resObj.debugInfo += `×一致:${matchBonus}`;
                    }
                }
            }
            resObj.dmg = Math.ceil(val * getRandomFactor());
        }
        return resObj;
    } else {
        const checkEnemyAbi = (name) => {
            if (!name || name === "なし") return null;
            let prob = abilityBaseRates[name] || 0;
            const hit = Math.random() * 100 < prob;
            resObj.debugInfo += `[敵${name}判定: ${prob}% -> ${hit?'○':'×'}] `;
            return hit ? name : null;
        };

        selectedAbi = checkEnemyAbi(enemy.abi);
        resObj.abi = selectedAbi;

        let enemyAbiMultiplier = 1.0;
        let calcEnemyAtk = enemy.atk;

        if (selectedAbi) {
            switch (selectedAbi) {
                case "強打": enemyAbiMultiplier = 1.3; break;
                case "高揚": 
                    calcEnemyAtk = Math.ceil(calcEnemyAtk * 1.1);
                    break;
                case "粉砕": 
                    enemyAbiMultiplier = 1.4; 
                    resObj.debuff = { target: "unit_target", stat: "def", rate: 0.8 }; 
                    break;
            }
        }

        let comp = getComp(enemy.attr, atkUnit.attr);
        let baseSub = Math.max(1, Math.ceil(calcEnemyAtk * enemyAbiMultiplier) - atkUnit.currentDef);
        
        // Defenseによる軽減率の計算 (1 - 込みD/100000)
        let defenseReductionRate = Math.max(0, 1 - (atkUnit.def / 100000));
        
        // 基本計算に軽減率を適用
        let finalDmg = Math.ceil(baseSub * comp * getRandomFactor() * defenseReductionRate);
        
        // 既存のダメージ軽減（凍結・突風等）を適用
        resObj.dmg = Math.max(1, Math.ceil(finalDmg * atkUnit.damageReduction));
        
        resObj.debugInfo += `(敵A:${Math.ceil(calcEnemyAtk * enemyAbiMultiplier)} vs 味D:${atkUnit.currentDef} = ${baseSub} ×相性:${comp} ×D軽減:${defenseReductionRate.toFixed(4)})`;
        return resObj;
    }
}

function runBattle(count) {
    const logEl = document.getElementById('battle-log');
    if (logEl) { logEl.innerHTML = "討伐準備中..."; logEl.style.fontFamily = "inherit"; }

    const selectedEnemyFullName = document.getElementById('selected-enemy-name').textContent;
    const enemyRaw = {
        name: selectedEnemyFullName,
        s: Number(document.getElementById('enemy-s').value),
        maxS: Number(document.getElementById('enemy-s').value),
        atk: Number(document.getElementById('enemy-a').value),
        def: Number(document.getElementById('enemy-d').value),
        attr: document.getElementById('enemy-type').textContent.trim(),
        abi: document.getElementById('enemy-ability').textContent
    };
    if (!enemyRaw.name || enemyRaw.name === "---" || enemyRaw.s <= 0) return alert("敵を選択してください");

    let simpleEnemyName = enemyRaw.name.split(/[：:]/)[1] || enemyRaw.name;
    simpleEnemyName = simpleEnemyName.split('(')[0];

    let winCount = 0;
	let totalTurns = 0; // 追加：全試行の合計ターン数
    let failReasonMap = { "全滅": 0, "ターンオーバー": 0 };
    let lastBattleLog = "";

    for (let c = 0; c < count; c++) {
        let units = [];
        for (let i = 1; i <= 4; i++) {
            let u = getUnitState(i);
            if (u) units.push(u);
        }
        if (units.length === 0) return;

        let limit = 20; 
        if (units.length <= 2) limit = 16;
        else if (units.length === 3) limit = 18;
        else if (units.length === 4) limit = 20;

        let enemy = { ...enemyRaw };
        let currentTurn = 0;
        let isWin = false;
        let battleSummary = "";
        let endReason = "";
        const needDetail = (count === 1 || c === count - 1);

        battleLoop: while (currentTurn < limit) {
            for (let i = 0; i < units.length; i++) {
                let u = units[i];
                if (u.isDead) continue;
                currentTurn++; 
                u.damageReduction = 1.0;
                let tempEnemyAtk = enemy.atk;
                let resE = calculateDamage(u, enemy, true, units);
                
                if (resE.debuff && resE.debuff.target === "enemy_temp") tempEnemyAtk *= resE.debuff.rate;
                if (resE.debuff && resE.debuff.target === "enemy" && resE.debuff.stat === "def") {
                    enemy.def = Math.ceil(enemy.def * resE.debuff.rate);
                }
		// 1. まず蘇生・回復を先行させる
		if (resE.heal > 0) {
		    units.forEach(un => {
		        if (!un.isDead) {
		            // 生存者は通常通り回復
		            un.s = Math.min(un.maxS, un.s + resE.heal);
		        } else if (resE.revive) {
		            // 死亡者はここで蘇生（バフ判定の前に isDead を false にする）
		            un.isDead = false;
		            // 天晴ならテーブル値、それ以外は1
		            un.s = (resE.abi === "天晴") ? resE.heal : 1;
		        }
		    });
		}
		
		// 2. 全員の状態が確定してからバフを適用
		if (resE.buff) {
		    if (resE.buff.target === "self") u.currentAtk = Math.ceil(u.currentAtk * resE.buff.rate);
		    if (resE.buff.target === "all") {
		        units.forEach(un => {
		            // 蘇生直後のユニットも isDead が false なのでここでバフが乗る
		            if (!un.isDead) un.currentAtk = Math.ceil(un.currentAtk * resE.buff.rate);
		        });
		    }
		    if (resE.buff.target === "all_except_self") {
		        units.forEach(un => {
		            if (!un.isDead && un.id !== u.id) un.currentAtk = Math.ceil(un.currentAtk * resE.buff.rate);
		        });
		    }
		}
                enemy.s -= resE.dmg;
                if (needDetail) {
                    battleSummary += `<small style="color:#888">${resE.debugInfo}</small><br>`;
                    if (resE.heal > 0) {
                        const statusList = units.filter(un => un).map(un => `${un.name} ${Math.floor(un.s)}/${un.maxS}`).join(',');
                        battleSummary += `[T${currentTurn}] ${u.name}の${resE.abi}: (${statusList})<br>`;
                    } else {
                        battleSummary += `[T${currentTurn}] ${u.name}の${resE.abi || "攻撃"}: ${resE.dmg}(残り:${Math.max(0, enemy.s)})<br>`;
                    }
                }
                if (enemy.s <= 0) { isWin = true; endReason = "討伐成功"; break battleLoop; }
                
                let resU = calculateDamage(u, { ...enemy, atk: tempEnemyAtk }, false);
                u.s -= resU.dmg;

                if (resU.debuff && resU.debuff.target === "unit_target") {
                    u.currentDef = Math.ceil(u.currentDef * resU.debuff.rate);
                }
                if (resU.abi === "高揚") {
                    enemy.atk = Math.ceil(enemy.atk * 1.1);
                }

                if (needDetail) {
                    battleSummary += `<small style="color:#888">${resU.debugInfo}</small><br>`;
                    battleSummary += `&nbsp;&nbsp;反撃: ${simpleEnemyName}${resU.abi ? 'の' + resU.abi : ''}: ${u.name}に${resU.dmg}(残り:${Math.max(0, u.s)})<br>`;
                }
                if (u.s <= 0) {
                    u.s = 0; u.isDead = true; 
                }
                // 1. まず全滅を判定（反撃の結果、全員死んだなら全滅優先）
                if (units.every(un => un.isDead)) { 
                    endReason = "全滅"; 
                    break battleLoop; 
                }
                // 2. 生き残っているが、規定ターンに達したならターンオーバー
                if (currentTurn >= limit) { 
                    endReason = "ターンオーバー"; 
                    break battleLoop; 
                }
            }
        }

		totalTurns += currentTurn; // 追加：このバトルの経過ターンを加算

        if (isWin) winCount++;
        else failReasonMap[endReason || "ターンオーバー"]++;
        if (needDetail) lastBattleLog = `【詳細ログ】<br>${battleSummary}結果: ${endReason}<br>`;
    }
		if (logEl) {
        	let avgTurns = (totalTurns / count).toFixed(2); // 追加：平均の算出
        	let stats = `【統計】試行:${count} / 勝利:${winCount} / 勝率:${(winCount/count*100).toFixed(2)}% / 平均T:${avgTurns}<br>敗因: 全滅${failReasonMap["全滅"]} / ターンオーバー${failReasonMap["ターンオーバー"]}<hr>`;
	        logEl.innerHTML = stats + lastBattleLog;
	    }

}

function systemReset() { if (confirm("入力をリセットしますか？")) location.reload(); }

function exportToFile() {
    const allData = {};
    // LocalStorage内を走査して、このアプリのデータだけを抽出
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith("bs_genjyu_savedata_")) {
            allData[key] = localStorage.getItem(key);
        }
    }

    if (Object.keys(allData).length === 0) return alert("保存されているデータがありません。");

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `genjyu_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function importFromFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            let overwriteCount = 0;

            // 同名チェック
            for (const key in importedData) {
                if (localStorage.getItem(key)) overwriteCount++;
            }

            if (overwriteCount > 0) {
                if (!confirm(`${overwriteCount}件の同名データが既に存在します。上書きしますか？`)) {
                    input.value = ""; // リセット
                    return;
                }
            }

            // 保存処理
            for (const key in importedData) {
                localStorage.setItem(key, importedData[key]);
            }

            // UIのセレクトボックスを更新
            for (let i = 1; i <= 4; i++) updateLoadSelect(i);
            
            alert("読み込みが完了しました。");
            input.value = ""; // リセット
        } catch (err) {
            alert("ファイルの形式が正しくありません。");
        }
    };
    reader.readAsText(file);
}