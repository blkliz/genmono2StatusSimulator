type:データソース仕様書
# スプレッドシート運用

このプロジェクトでは、一部データを Google Spreadsheet で管理している。
特にステータスシミュレータ・理論値一覧は既に公開済みの「ステシミュ用公開用マスターコピー」のデータがマスターの複製のため、新規シートにコピーして以下抽出関数を用いれば移植は簡単なはずです。

---

## 幻獣データ MASTER

| 項目 | 内容 |
|------|------|
| 生成ファイル | `genjyu_data.js` |
| 使用箇所 | ステータスシミュレータ、理論値一覧表 |

**列構成**

| 列 | 項目 | フィールド |
|----|------|------------|
| A | 図鑑番号 | `genjyuId` |
| B | 幻獣名 | `genjyuName` |
| C | 属性 | `genjyuType` |
| D | クラス | `genjyuClass` |
| E | 変化アイテム | `evolutionItem.eItemName` |
| F | レアリティ | `evolutionItem.eItemRarity` |
| G | 固有S | `statusMultipliers.staminaFactor` |
| H | 固有A | `statusMultipliers.attackFactor` |
| I | 固有D | `statusMultipliers.defenseFactor` |
| J | 固有L | `statusMultipliers.luckFactor` |
| K | 親(変化元図鑑番号) | `parentIds` |

**生成方式**  
スプレッドシート関数で JS オブジェクト文字列を生成し、出力列をコピーして JS へ貼り付け。

<details>
<summary>使用関数例</summary>

```
IF(A2="", "",
  "  { ""genjyuId"": " & A2 &
  ", ""genjyuName"": """ & B2 &
  """, ""genjyuType"": """ & C2 &
  """, ""genjyuClass"": """ & D2 &
  """, ""statusMultipliers"": { ""staminaFactor"": " & G2 &
  ", ""attackFactor"": " & H2 &
  ", ""defenseFactor"": " & I2 &
  ", ""luckFactor"": " & J2 &
  " }, ""evolutionItem"": { ""eItemName"": """ & E2 &
  """, ""eItemRarity"": " & F2 &
  " }, ""parentIds"": [" &
  SUBSTITUTE(SUBSTITUTE(IF(AND(K2<>"", K2<>",,"), K2, ""), ",,", ""), ",,", "") &
  "], ""variantIds"": [] },"
)
```

</details>

---

## 討伐リスト MASTER

| 項目 | 内容 |
|------|------|
| 生成ファイル | `battle_data.js` |
| 使用箇所 | 討伐シミュレータ |

**列構成**

| 列 | 項目 | フィールド |
|----|------|------------|
| A | Lv | `lv`（可変敵は `"LVUP"`） |
| B | 名前 | `name` |
| C | 受注 | `category` |
| D | 属性 | `attr` |
| E | アビ | `abi` |
| F | S | `hp` |
| G | A | `atk` |
| H | D | `def` |

**生成方式**  
スプレッドシート関数で JS オブジェクト文字列を生成し、出力列をコピーして JS へ貼り付け。

<details>
<summary>使用関数例</summary>

```
" { lv: "&IF(A2="LVUP","'LVUP'",A2)&",name: '"&B2&"',category: '("&C2&")', attr: '"&SUBSTITUTE(D2,".","")&"', abi: '"&E2&"', hp: "&IF(OR(F2="?", F2=""), 0, F2)&", atk: "&IF(OR(G2="?", G2=""), 0, G2)&", def: "&IF(OR(H2="?", H2=""), 0, H2)&" },"
```

</details>

---

## 武器 MASTER・防具 MASTER

| 項目 | 内容 |
|------|------|
| 生成ファイル | `item_data.js` |
| 使用箇所 | 討伐シミュレータ |

**列構成（武器 MASTER）**

| 列 | 項目 | フィールド |
|----|------|------------|
| A | 名前 | `name` |
| B | アビリティ | `abi` |
| C | 装備必要 Lv | （未使用） |
| D | Attack 加算値 | `atk` |
| E | Grade | `grade` |

**列構成（防具 MASTER）**

| 列 | 項目 | フィールド |
|----|------|------------|
| A | 名前 | `name` |
| B | アビリティ | `abi` |
| C | 装備必要 Lv | （未使用） |
| D | Defense 加算値 | `def` |
| E | Grade | `grade` |

**生成方式**  
スプレッドシート関数で JS オブジェクト文字列を生成し、出力列をコピーして JS へ貼り付け。

<details>
<summary>使用関数例</summary>

武器 MASTER
```
"  { name: '"&A29&"', abi: '"&B29&"', atk: "&D29&", grade: "&E29&", kind: 1 },"
```

防具 MASTER
```
"  { name: '"&A37&"', abi: '"&B37&"', def: "&D37&", grade: "&E37&", kind: 2 },"
```

</details>

---

## 武器アビリティ MASTER・防具アビリティ MASTER

| 項目 | 内容 |
|------|------|
| 生成ファイル | `ability_data.js` |
| 使用箇所 | 討伐シミュレータ |

**列構成（武器アビリティ MASTER）**

| 列 | 項目 | フィールド |
|----|------|------------|
| A | （カテゴリ等） | （未使用） |
| B | アビリティ名 | `name` |
| 〜 | 表記・乱闘・闘技場・ダメージ倍率・効果・説明 | （未使用） |
| カード列 | カード | 抽出条件（`○` のみ対象） |

**列構成（防具アビリティ MASTER）**

| 列 | 項目 | フィールド |
|----|------|------------|
| A | アビリティ名 | （未使用） |
| B | 表記 | `name` |
| 〜 | 乱闘・闘技場・説明 | （未使用） |
| カード列 | カード | 抽出条件（`○` のみ対象） |

> カード列が `○` の行のみをフィルタリングしてから抽出する。

**生成方式**  
スプレッドシート関数で JS オブジェクト文字列を生成し、出力列をコピーして JS へ貼り付け。

<details>
<summary>使用関数例</summary>

武器アビリティ MASTER
```
"  { name: '"&B3&"', kind: 1 },"
```

防具アビリティ MASTER
```
"  { name: '"&B2&"', kind: 2 },"
```

</details>