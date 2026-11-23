/**
 * Կանոնի պայմանի ծառ (տողերով կառուցիչ, COM-01)։
 * Պայմանը պահվում է արտահայտության տեսքով (expression.js), իսկ կառուցիչում ներկայացվում է ծառով.
 *   group՝ { type: 'group', op: 'and'|'or', not, children: [...] }
 *   cond ՝ { type: 'cond', left: Operand, cmp: '<'|'<='|'>'|'>='|'=='|'!='|'true', right: Operand, not }
 *   Operand՝ { kind: 'ref', tok } | { kind: 'num', value } | { kind: 'formula', text } | null (դեռ լրացված չէ)
 * Ցանկացած արտահայտություն ներկայացվում է ծառով. բարդ (թվաբանական) կողմերը՝ «բանաձև» տեսքով։
 */
import { parse } from './expression.js';

export const CMP = ['<', '<=', '>', '>=', '==', '!='];
const PREC = { or: 1, and: 2, '<': 3, '<=': 3, '>': 3, '>=': 3, '==': 3, '!=': 3, '+': 4, '-': 4, '*': 5, '/': 5 };

/** AST → արտահայտության տեքստ (նվազագույն փակագծերով) */
export function print(n, parent = 0, right = false) {
  switch (n.k) {
    case 'num': return String(n.v);
    case 'ref': return n.raw;
    case 'col': return n.field ? `${n.table}.${n.field}` : n.table;
    case 'call': return `${n.fn}(${n.args.map((a) => print(a)).join(', ')})`;
    case 'neg': return `-${print(n.e, 6)}`;
    case 'not': { const s = `not ${print(n.e, 6)}`; return parent > 2 ? `(${s})` : s; }
    case 'bin': {
      const p = PREC[n.op];
      const s = `${print(n.l, p)} ${n.op} ${print(n.r, p, true)}`;
      // ձախ ասոցիատիվություն. աջ կողմում նույն մակարդակի գործողությունը (a - (b - c)) պահանջում է փակագծեր
      return p < parent || (right && p === parent && p >= 3) ? `(${s})` : s;
    }
    default: return '';
  }
}

const operandOf = (n) => {
  if (n.k === 'ref') return { kind: 'ref', tok: n.raw };
  if (n.k === 'num') return { kind: 'num', value: n.v };
  if (n.k === 'neg' && n.e.k === 'num') return { kind: 'num', value: -n.e.v };
  return { kind: 'formula', text: print(n) };
};

/** AST → ծառ (արմատը միշտ խումբ է) */
export function toTree(ast) {
  const node = (n) => {
    if (n.k === 'not') { const c = node(n.e); return { ...c, not: !c.not }; }
    if (n.k === 'bin' && (n.op === 'and' || n.op === 'or')) {
      const children = [];
      const flat = (x) => { if (x.k === 'bin' && x.op === n.op) { flat(x.l); flat(x.r); } else children.push(node(x)); };
      flat(n);
      return { type: 'group', op: n.op, not: false, children };
    }
    if (n.k === 'bin' && CMP.includes(n.op)) return { type: 'cond', left: operandOf(n.l), cmp: n.op, right: operandOf(n.r), not: false };
    return { type: 'cond', left: operandOf(n), cmp: 'true', right: null, not: false };
  };
  const t = node(ast);
  return t.type === 'group' && !t.not ? t : { type: 'group', op: 'and', not: false, children: [t] };
}

export const emptyCond = () => ({ type: 'cond', left: null, cmp: '>', right: null, not: false });
export const emptyTree = () => ({ type: 'group', op: 'and', not: false, children: [emptyCond()] });

/**
 * Expression → ծառ. null՝ եթե արտահայտությունը սխալ է կամ ծառով ամբողջությամբ չի ներկայացվում
 * (օր.՝ համեմատման արդյունքի համեմատում՝ (a > 1) == 1). այդ դեպքում պայմանը խմբագրվում է միայն տեքստով, որպեսզի չկորչի
 */
export function treeFromExpression(expression) {
  if (!expression?.trim()) return emptyTree();
  try {
    const tree = toTree(parse(expression));
    return treeToExpression(tree).incomplete ? null : tree;
  } catch { return null; }
}

/** Թվաբանական արտահայտություն (առանց համեմատման և տրամաբանական գործողությունների) */
export function isArithmetic(n) {
  if (n.k === 'not') return false;
  if (n.k === 'bin') return !(n.op in { and: 1, or: 1 }) && !CMP.includes(n.op) && isArithmetic(n.l) && isArithmetic(n.r);
  if (n.k === 'neg') return isArithmetic(n.e);
  return true;
}

const operandText = (o) => {
  if (!o) return null;
  if (o.kind === 'ref') return o.tok;
  if (o.kind === 'num') return Number.isFinite(o.value) ? String(o.value) : null;
  const t = (o.text || '').trim();
  if (!t) return null;
  // բանաձևը պետք է լինի թվաբանական (համեմատումը և ԵՎ/ԿԱՄ-ը՝ ծառի մակարդակում)
  try { const ast = parse(t); return isArithmetic(ast) ? print(ast) : null; } catch { return null; }
};

/** Ծառ → { expression, incomplete }. չլրացված տողերը չեն ներառվում (incomplete = true) */
export function treeToExpression(tree) {
  let incomplete = false;
  const out = (n, top) => {
    if (n.type === 'cond') {
      const l = operandText(n.left);
      const r = n.cmp === 'true' ? '' : operandText(n.right);
      if (!l || (n.cmp !== 'true' && !r)) { incomplete = true; return null; }
      const s = n.cmp === 'true' ? l : `${l} ${n.cmp} ${r}`;
      return n.not ? `not (${s})` : s;
    }
    const parts = n.children.map((c) => ({ c, s: out(c, false) })).filter((x) => x.s);
    if (!parts.length) { if (!top || n.children.length) incomplete = true; return null; }
    // ներդրված խումբը միշտ փակագծերում է (ԵՎ/ԿԱՄ-ի հերթականությունը պահպանելու համար)
    const s = parts.map((x) => (x.c.type === 'group' && !x.c.not && parts.length > 1 ? `(${x.s})` : x.s)).join(` ${n.op} `);
    return n.not ? `not (${s})` : s;
  };
  const expression = out(tree, true) || '';
  return { expression, incomplete };
}
