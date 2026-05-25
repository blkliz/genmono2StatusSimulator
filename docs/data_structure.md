# データ構造

## genjyu_data.js

```js
{
  genjyuId: number,
  genjyuName: string,
  genjyuType: string,
  genjyuClass: string,
  statusMultipliers: {
    staminaFactor: number,
    attackFactor: number,
    defenseFactor: number,
    luckFactor: number
  },
  evolutionItem: {
    eItemName: string,
    eItemRarity: number
  },
  parentIds: number[],
  variantIds: number[]
}
```

| フィールド | 説明 |
|------------|------|
| `parentIds` | 進化元 ID 配列 |
| `variantIds` | 派生幻獣 ID 配列 |

---

## battle_data.js

```js
{
  lv: number | "LVUP",
  name: string,
  category: string,
  attr: string,
  abi: string,
  hp: number,
  atk: number,
  def: number
}
```

| フィールド | 説明 |
|------------|------|
| `lv` | 通常敵は数値。レベル可変敵は `"LVUP"` を使用 |

---

## item_data.js

### weapons

```js
{
  name: string,
  abi: string,
  atk: number,
  grade: number,
  kind: 1
}
```

### armors

```js
{
  name: string,
  abi: string,
  def: number,
  grade: number,
  kind: 2
}
```

---

## ability_data.js

### weaponCardAbilities

```js
{
  name: string,
  kind: 1
}
```

### armorCardAbilities

```js
{
  name: string,
  kind: 2
}
```