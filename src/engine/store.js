/**
 * Մոդուլի սեփական պահոց (նախատիպում՝ բրաուզերի localStorage)։
 * Այստեղ են պահվում կանոնների կազմաձևը, կառուցիչի կանոնները, փոփոխականների արժեքները, մասնագետի
 * ճշգրտումները (DEC-10), ձեռքով ռիսկային նշումները (COM-20), եզրակացությունները, արտաքին աղբյուրների
 * «անհասանելիության» սիմուլյացիան և ընտրված դերը։ EPD-ի տվյալները երբեք չեն փոխվում (NFR-04)։
 */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { createElement } from 'react';
import { evaluateAll } from './evaluator.js';
import { finalizeRecord, demoPenalties } from '../data/penalties.js';
import { autoEvaluations, snapshotOf, withStored } from './evaluations.js';

const KEY = 'cpc-risk-prototype-state-v1';

export const INITIAL_STATE = {
  role: 'analyst',
  variables: {}, // key → history[] (վերագրում է VARIABLE_DEFS-ի լռելյայն արժեքները)
  variableDefOverrides: {}, // նախասահմանված փոփոխականների փոխված բնութագրեր. key → { label, unit, note, directions, hidden }
  customVariableDefs: [], // մասնագետի ստեղծած համակարգային փոփոխականներ. { key, direction, label, type, unit, note }
  ruleConfig: {}, // ruleId → { enabled, weight, params: { key: {var}|{value} } }
  customRules: [], // կառուցիչի կանոններ և կրկնօրինակներ
  formulaOverrides: {}, // 4.1-ի բարդ փոփոխականների փոխված բանաձևեր. key → { expression, label }
  derivedVars: [], // մասնագետի սահմանած բարդ փոփոխականներ. { key, direction, level?, label, expression }
  corrections: {}, // rowId → { _declaration, _table, field: value, _by, _at }
  manualFlags: [], // { id, direction, unitId, weight, note, by, at }
  conclusions: {}, // `${direction}:${unitId}` → { status, text, by, at }
  outages: {}, // service → true
  demoApplied: false,
  // վարչական տույժեր (COM-11). { records: [...], imports: [{ fileName, at, by, added, replaced }] }. null՝ տվյալներ չկան.
  // լռելյայն՝ ցուցադրական տվյալներ (mock EPD-ի անձանց համար), որպեսզի DEC-R3/DEC-R4-ի օրինակները երևան
  penalties: { records: demoPenalties(), imports: [{ fileName: 'Ցուցադրական տվյալներ', at: null, by: null, added: demoPenalties().length, replaced: true }] },
  penaltiesSeeded: true, // ցուցադրական տույժերն արդեն ավելացվել են (օգտատիրոջ ջնջումից հետո կրկին չեն ավելացվում)
  declEvaluations: {}, // հայտարարագրերի պահված գնահատումներ (վերագնահատում). unitId → { at, by, auto, sig, localSig, score, risky, scopes }
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return INITIAL_STATE;
    const saved = JSON.parse(raw);
    const st = { ...INITIAL_STATE, ...saved };
    // նախորդ տարբերակում պահված վիճակ՝ առանց ցուցադրական տույժերի
    if (!saved.penaltiesSeeded && !saved.penalties) st.penalties = INITIAL_STATE.penalties;
    // տույժերի գրառումներ առանց id-ի (նախորդ տարբերակ)
    if (st.penalties?.records) st.penalties = { ...st.penalties, records: st.penalties.records.map((r) => finalizeRecord(r)) };
    return st;
  } catch {
    return INITIAL_STATE;
  }
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, setState] = useState(load);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* պահոցը հասանելի չէ */ }
  }, [state]);
  const update = useCallback((fn) => setState((s) => ({ ...s, ...(typeof fn === 'function' ? fn(s) : fn) })), []);
  const reset = useCallback(() => setState({ ...INITIAL_STATE, role: state.role }), [state.role]);
  // «Կենդանի» գնահատում (ամեն փոփոխությունից հետո). նվերներ, կուսակցություններ, բարեվարքություն և կառուցիչի փորձարկում
  const { variables, variableDefOverrides, customVariableDefs, ruleConfig, customRules, formulaOverrides, derivedVars, corrections, manualFlags, outages, penalties } = state;
  const live = useMemo(() => evaluateAll({ variables, variableDefOverrides, customVariableDefs, ruleConfig, customRules, formulaOverrides, derivedVars, corrections, manualFlags, outages, penalties }), [variables, variableDefOverrides, customVariableDefs, ruleConfig, customRules, formulaOverrides, derivedVars, corrections, manualFlags, outages, penalties]);
  // Հայտարարագրեր. ցուցադրվում է պահված արդյունքը (վերագնահատում). նոր հայտարարագրերը և տեղական գործողությունները՝ ավտոմատ
  useEffect(() => {
    const patch = autoEvaluations(live.declarations, state.declEvaluations, { at: new Date().toISOString(), by: ROLES[state.role] });
    if (Object.keys(patch).length) setState((s) => ({ ...s, declEvaluations: { ...(s.declEvaluations || {}), ...patch } }));
  }, [live, state.declEvaluations, state.role]);
  const results = useMemo(() => ({ ...live, declarations: live.declarations.map((u) => withStored(u, state.declEvaluations?.[u.id])) }), [live, state.declEvaluations]);
  /** Վերագնահատում. նշված հայտարարագրերի պահված արդյունքը փոխարինվում է ընթացիկ գնահատմամբ */
  const reevaluate = useCallback((ids) => {
    const at = new Date().toISOString();
    const by = ROLES[state.role];
    const byId = new Map(live.declarations.map((u) => [u.id, u]));
    setState((s) => ({ ...s, declEvaluations: { ...(s.declEvaluations || {}), ...Object.fromEntries(ids.filter((id) => byId.has(id)).map((id) => [id, snapshotOf(byId.get(id), { at, by })])) } }));
  }, [live, state.role]);
  const value = useMemo(() => ({ state, update, reset, results, reevaluate }), [state, update, reset, results, reevaluate]);
  return createElement(Ctx.Provider, { value }, children);
}

export const useStore = () => useContext(Ctx);

// ── Դերեր և իրավունքներ (NFR-02). նախատիպում դերը ընտրվում է վերևի ցանկից
export const ROLES = {
  analyst: 'Վերլուծաբան / մասնագետ',
  rules_officer: 'Կանոնների պատասխանատու',
  manager: 'Ղեկավար',
  admin: 'Ադմինիստրատոր',
};
const PERMS = {
  analyst: ['view_docs', 'conclude', 'manual_flag', 'correct', 'view_rules', 'export'],
  rules_officer: ['view_docs', 'view_rules', 'edit_rules', 'edit_variables', 'external'],
  manager: ['view_docs', 'dashboard', 'view_rules', 'export'],
  admin: ['users', 'external', 'view_rules'],
};
export const can = (role, perm) => (PERMS[role] || []).includes(perm) || (perm === 'dashboard' && role !== 'admin');

export const newId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();
