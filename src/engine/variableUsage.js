/**
 * Համակարգային փոփոխականի օգտագործում (COM-03). որ կանոններն ու բարդ փոփոխականներն են կախված var.<key>-ից՝ ուղղությամբ։
 * Հաշվի են առնվում. նախասահմանված կանոնների պարամետրերի կապերը (լռելյայն և կարգավորված), կառուցիչով փոխարինված
 * պայմանները, կրկնօրինակները, կառուցիչով ստեղծված կանոնները և մասնագետի սահմանած բարդ փոփոխականները
 */
import { BUILTIN_RULES } from '../rules/catalog.js';
import { ENGINE_USAGE } from './variables.js';
import { effectiveFormulas } from './annualExpense.js';

export function variableImpact(state, key) {
  const re = new RegExp(`\\bvar\\.${key}\\b`);
  const out = new Map();
  if (ENGINE_USAGE[key]) out.set(ENGINE_USAGE[key].id, ENGINE_USAGE[key].direction);
  const bound = (params, cfgParams) => (params || []).some((p) => ({ ...(p.default ? { [p.key]: p.default } : {}), ...(cfgParams || {}) })[p.key]?.var === key);
  for (const r of BUILTIN_RULES) {
    const cfg = state?.ruleConfig?.[r.id] || {};
    if (cfg.expression ? re.test(cfg.expression) : bound(r.params, cfg.params)) out.set(r.id, r.direction);
  }
  for (const c of state?.customRules || []) {
    if (c.kind === 'copy') {
      const base = BUILTIN_RULES.find((b) => b.id === c.base);
      if (base && bound(base.params, c.params)) out.set(c.id, base.direction);
    } else if (re.test(c.expression || '')) out.set(c.id, c.direction);
  }
  for (const d of state?.derivedVars || []) if (re.test(d.expression || '')) out.set(`doc.${d.key}`, d.direction);
  return [...out].map(([id, direction]) => ({ id, direction }));
}

/**
 * Փաստաթղթի (doc.) կամ արտաքին (ext.) փոփոխականի օգտագործում տվյալ ուղղությունում (Փոփոխականների էջ, տեղեկատվական).
 * նախասահմանված կանոններ (կառուցիչով փոխված պայման կամ համարժեք builderExpression), մասնագետի կանոններ,
 * բարդ փոփոխականներ և ընթացիկ ծախսի հաշվարկի բանաձևեր
 */
export function refUsage(state, ns, key, direction) {
  const re = new RegExp(`\\b${ns}\\.${key}\\b`);
  const out = new Set();
  for (const r of BUILTIN_RULES) if (r.direction === direction && re.test(state?.ruleConfig?.[r.id]?.expression || r.builderExpression || '')) out.add(r.id);
  for (const c of state?.customRules || []) if (c.kind !== 'copy' && c.direction === direction && re.test(c.expression || '')) out.add(c.id);
  if (direction === 'declarations') for (const [k, expr] of Object.entries(effectiveFormulas(state || {}))) if (k !== key && re.test(expr)) out.add(`doc.${k}`);
  for (const d of state?.derivedVars || []) if (d.direction === direction && re.test(d.expression || '')) out.add(`doc.${d.key}`);
  return [...out];
}
