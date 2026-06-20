/**
 * sim_constants.js - ステータスシミュレータ共通定数
 *
 * main.js / theory_calc.js の両方から参照するゲームルール定数を一元管理します。
 * このファイルは StatusSimulator.html / TheoryValues.html で当該JSより前にロードしてください。
 *
 * KB-GEN2-004: レベル上限・転生ボーナス関連の共通化
 * KB-GEN2-005: 進化ステータス上昇式のマジックナンバー定数化
 */

// --- レベル上限 (KB-GEN2-004) ---

/** 転生回数がLV_LIMIT_THRESHOLDに達した場合の上限レベル */
const LV_LIMIT_HIGH = 250;

/** 通常の上限レベル */
const LV_LIMIT_NORMAL = 200;

/** 上限レベルが切り替わる転生回数（この値以上でLV_LIMIT_HIGH が適用される） */
const LV_LIMIT_THRESHOLD = 8;

// --- 理論値計算用SP上限 (KB-GEN2-004) ---

/** LvUpによるポイント加算上限（+249 Lv × 2pt = 498） */
const LV_SP = 498;

/** 転生ボーナスの最大上限ポイント（9転生以上で110pt固定） */
const TRANS_BONUS = 110;

/** 転生回数ごとのボーナスポイントテーブル（インデックス=転生回数、9以上はTRANS_BONUSを参照） */
const REINC_BONUS_MAP = [0, 30, 40, 50, 60, 70, 80, 90, 100];

// --- 進化ステータス計算係数 (KB-GEN2-005) ---

/** 進化時ステータス上昇の乗算係数（本家ゲームの進化ボーナス再現値） */
const EVOLUTION_COEFF = 1.111;

/** 進化時スタミナ（S）上昇値の除数（staminaFactorをこの値で割ってから係数を掛ける） */
const EVOLUTION_S_DIVISOR = 3;
