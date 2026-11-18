/**
 * Մոդուլի սեփական պահոց (նախատիպում՝ բրաուզերի localStorage)։
 * Այստեղ են պահվում կանոնների կազմաձևը, կառուցիչի կանոնները, փոփոխականների արժեքները, մասնագետի
 * ճշգրտումները (DEC-10), ձեռքով ռիսկային նշումները (COM-20), եզրակացությունները, արտաքին աղբյուրների
 * «անհասանելիության» սիմուլյացիան և ընտրված դերը։ EPD-ի տվյալները երբեք չեն փոխվում (NFR-04)։
 */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { createElement } from 'react';
import { evaluateAll } from './evaluator.js';

const KEY = 'cpc-risk-prototype-state-v1';

export const INITIAL_STATE = {
  role: 'analyst',
  variables: {}, // key → history[] (վերագրում է VARIABLE_DEFS-ի լռելյայն արժեքները)
  ruleConfig: {}, // ruleId → { enabled, weight, params: { key: {var}|{value} } }
  customRules: [], // կառուցիչի կանոններ և կրկնօրինակներ
  corrections: {}, // rowId → { _declaration, _table, field: value, _by, _at }
  manualFlags: [], // { id, direction, unitId, weight, note, by, at }
  conclusions: {}, // `${direction}:${unitId}` → { status, text, by, at }
  outages: {}, // service → true
  demoApplied: false,
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...INITIAL_STATE, ...JSON.parse(raw) } : INITIAL_STATE;
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
  // Գնահատումը կատարվում է ամեն փոփոխությունից հետո (տվյալների ծավալը փոքր է)
  const results = useMemo(() => evaluateAll(state), [state]);
  const value = useMemo(() => ({ state, update, reset, results }), [state, update, reset, results]);
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
