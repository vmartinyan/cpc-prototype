/**
 * Կանոնների ռեեստր (COM-06՝ չափորոշիչների գրադարան)։
 * Պարունակում է SRS-ի կատալոգների իրականացված կանոնները, ձեռքով նշման կանոնը և չիրականացված կանոնների ցանկը։
 */
import { declarationRules, MANUAL_RULE } from './declarations.js';
import { partyRules } from './parties.js';
import { giftRules } from './gifts.js';
import { integrityRules } from './integrity.js';
import { notImplementedRules } from './notImplemented.js';

export const BUILTIN_RULES = [...declarationRules, ...partyRules, ...giftRules, ...integrityRules].map((r) => ({ ...r, kind: 'builtin' }));
export const MANUAL_RULES = [MANUAL_RULE];
export { notImplementedRules };

export const builtinById = Object.fromEntries(BUILTIN_RULES.map((r) => [r.id, r]));
