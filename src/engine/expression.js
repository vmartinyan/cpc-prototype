/**
 * Կանոնների կառուցիչի արտահայտությունների լեզու (COM-01, COM-04, COM-05, COM-07)։
 * Անվտանգ վերլուծիչ (eval չի օգտագործվում)։
 *
 * Փոփոխականների 4 տեսակ (SRS բաժին 3).
 *   doc.<անուն>     — փաստաթղթի դաշտ կամ ագրեգատ (օր.՝ doc.expense_monthly)
 *   ext.<անուն>     — արտաքին համակարգից ստացվող տվյալ (օր.՝ ext.pek_income_year)
 *   var.<անուն>     — համակարգային փոփոխական (օր.՝ var.cash_threshold)
 *   rule.<ID>       — այլ կանոնի արդյունք (1՝ աշխատել է, 0՝ ոչ), օր.՝ rule.GIF_R1 կամ rule.GIF-R1
 * Ագրեգատներ (COM-04). sum(աղյուսակ.դաշտ), count(աղյուսակ), min(...), max(...), avg(...), abs(x)
 *   «_amd» վերջավորությամբ դաշտը փոխարկվում է դրամի՝ տողի հետ պահված փոխարժեքով (DEC-11)։
 * Գործողություններ. + - * /  < <= > >= == !=  and/or/not (կամ ԵՎ/ԿԱՄ/ՈՉ), փակագծեր։
 * Օրինակ (COM-04). doc.cash_end + 12 * ext.pek_income_year < var.cash_threshold
 */

/** Կանոնը կիրառելի չէ տվյալ միավորի նկատմամբ (օր.՝ ընտանիքի անդամի առանձին հայտարարագիր) */
export class NotApplicable extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

export class NotEvaluated extends Error {
  constructor(reason, extra = {}) {
    super(reason);
    this.reason = reason;
    Object.assign(this, extra);
  }
}

const KEYWORDS = { and: 'and', or: 'or', not: 'not', 'ԵՎ': 'and', 'ԿԱՄ': 'or', 'ՈՉ': 'not', true: 'true', false: 'false' };

export function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9_.]/.test(src[j])) j++;
      tokens.push({ t: 'num', v: Number(src.slice(i, j).replace(/_/g, '')), pos: i });
      i = j;
      continue;
    }
    if (/[A-Za-z_Ա-և]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_.\-Ա-և]/.test(src[j])) {
        // «-»-ը թույլատրվում է միայն կանոնի ID-ում (rule.GIF-R1)
        if (src[j] === '-' && !/^rule\./.test(src.slice(i, j))) break;
        j++;
      }
      const word = src.slice(i, j);
      if (KEYWORDS[word]) tokens.push({ t: 'kw', v: KEYWORDS[word], pos: i });
      else tokens.push({ t: 'id', v: word, pos: i });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (['<=', '>=', '==', '!=', '&&', '||'].includes(two)) {
      tokens.push(two === '&&' ? { t: 'kw', v: 'and', pos: i } : two === '||' ? { t: 'kw', v: 'or', pos: i } : { t: 'op', v: two, pos: i });
      i += 2;
      continue;
    }
    if ('+-*/()<>,!'.includes(c)) {
      tokens.push(c === '!' ? { t: 'kw', v: 'not', pos: i } : { t: 'op', v: c, pos: i });
      i++;
      continue;
    }
    throw new SyntaxError(`Անծանոթ նշան «${c}» (դիրք ${i + 1})`);
  }
  return tokens;
}

export function parse(src) {
  const tokens = tokenize(src);
  let p = 0;
  const peek = () => tokens[p];
  const eat = (t, v) => {
    const tok = tokens[p];
    if (!tok || tok.t !== t || (v !== undefined && tok.v !== v)) throw new SyntaxError(`Սպասվում էր «${v ?? t}»${tok ? `, ստացվել է «${tok.v}»` : ' (արտահայտությունը ավարտվեց)'}`);
    p++;
    return tok;
  };
  const isOp = (v) => peek() && peek().t === 'op' && peek().v === v;
  const isKw = (v) => peek() && peek().t === 'kw' && peek().v === v;

  function orE() { let l = andE(); while (isKw('or')) { p++; l = { k: 'bin', op: 'or', l, r: andE() }; } return l; }
  function andE() { let l = notE(); while (isKw('and')) { p++; l = { k: 'bin', op: 'and', l, r: notE() }; } return l; }
  function notE() { if (isKw('not')) { p++; return { k: 'not', e: notE() }; } return cmpE(); }
  function cmpE() {
    const l = addE();
    const t = peek();
    if (t && t.t === 'op' && ['<', '<=', '>', '>=', '==', '!='].includes(t.v)) { p++; return { k: 'bin', op: t.v, l, r: addE() }; }
    return l;
  }
  function addE() { let l = mulE(); while (isOp('+') || isOp('-')) { const op = tokens[p++].v; l = { k: 'bin', op, l, r: mulE() }; } return l; }
  function mulE() { let l = unE(); while (isOp('*') || isOp('/')) { const op = tokens[p++].v; l = { k: 'bin', op, l, r: unE() }; } return l; }
  function unE() { if (isOp('-')) { p++; return { k: 'neg', e: unE() }; } return prim(); }
  function prim() {
    const t = peek();
    if (!t) throw new SyntaxError('Արտահայտությունը թերի է');
    if (t.t === 'num') { p++; return { k: 'num', v: t.v }; }
    if (t.t === 'kw' && (t.v === 'true' || t.v === 'false')) { p++; return { k: 'num', v: t.v === 'true' ? 1 : 0 }; }
    if (isOp('(')) { p++; const e = orE(); eat('op', ')'); return e; }
    if (t.t === 'id') {
      p++;
      if (isOp('(')) {
        p++;
        const args = [];
        if (!isOp(')')) { args.push(argE()); while (isOp(',')) { p++; args.push(argE()); } }
        eat('op', ')');
        const fn = t.v.toLowerCase();
        if (!['sum', 'count', 'min', 'max', 'avg', 'abs'].includes(fn)) throw new SyntaxError(`Անծանոթ ֆունկցիա «${t.v}»`);
        return { k: 'call', fn, args };
      }
      const [ns, ...rest] = t.v.split('.');
      if (!['doc', 'ext', 'var', 'rule'].includes(ns) || !rest.length) throw new SyntaxError(`«${t.v}». փոփոխականը պետք է սկսվի doc., ext., var. կամ rule.`);
      return { k: 'ref', ns, name: rest.join('.'), raw: t.v };
    }
    throw new SyntaxError(`Անսպասելի «${t.v}»`);
  }
  // ագրեգատի արգումենտ. աղյուսակ.դաշտ կամ աղյուսակ (count-ի համար) կամ արտահայտություն (abs)։
  // Աղյուսակը՝ EPD անունով (de_...) կամ կարճ տերմինով (cash, bank_accounts, ...՝ metrics.TABLE_ALIASES)
  function argE() {
    const t = peek();
    if (t && t.t === 'id' && (/^de_/.test(t.v) || /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)?$/.test(t.v)) && !/^(doc|ext|var|rule)\./.test(t.v)) { p++; const [table, ...f] = t.v.split('.'); return { k: 'col', table, field: f.join('.') || null }; }
    return orE();
  }

  const ast = orE();
  if (p < tokens.length) throw new SyntaxError(`Ավելորդ «${tokens[p].v}» (դիրք ${tokens[p].pos + 1})`);
  return ast;
}

/** Հավաքում է արտահայտության կախվածությունները (կանոններ, արտաքին տվյալներ, փոփոխականներ) */
export function dependencies(ast) {
  const deps = { rule: new Set(), ext: new Set(), var: new Set(), doc: new Set(), tables: new Set() };
  (function walk(n) {
    if (!n) return;
    if (n.k === 'ref') deps[n.ns].add(normalizeRuleRef(n.ns, n.name));
    if (n.k === 'col') deps.tables.add(n.table);
    for (const key of ['l', 'r', 'e']) walk(n[key]);
    (n.args || []).forEach(walk);
  })(ast);
  return deps;
}

export const normalizeRuleRef = (ns, name) => (ns === 'rule' ? name.replace(/_/g, '-') : name);

/**
 * Գնահատում։ resolver({ns, name}) → թիվ/բուլյան; table(name) → տողերի զանգված։
 * Վերադարձնում է { value, trace }, trace-ում՝ յուրաքանչյուր օգտագործված փոփոխականի արժեքը (COM-19)։
 */
export function evaluate(ast, { resolve, table }) {
  const trace = new Map();
  const num = (v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v);
  function ev(n) {
    switch (n.k) {
      case 'num': return n.v;
      case 'ref': {
        const v = resolve(n.ns, normalizeRuleRef(n.ns, n.name));
        trace.set(n.raw, v);
        return v;
      }
      case 'neg': return -num(ev(n.e));
      case 'not': return !truthy(ev(n.e));
      case 'call': {
        if (n.fn === 'abs') return Math.abs(num(ev(n.args[0])));
        const col = n.args[0];
        if (!col || col.k !== 'col') throw new SyntaxError(`${n.fn}()-ի արգումենտը պետք է լինի EPD աղյուսակ (de_...)`);
        const rows = table(col.table);
        if (n.fn === 'count') { trace.set(`count(${col.table})`, rows.length); return rows.length; }
        if (!col.field) throw new SyntaxError(`${n.fn}()-ի համար նշեք դաշտը՝ ${col.table}.դաշտ`);
        const vals = rows.map((r) => fieldValue(r, col.field)).filter((v) => typeof v === 'number' && !Number.isNaN(v));
        let out;
        if (n.fn === 'sum') out = vals.reduce((a, b) => a + b, 0);
        else if (n.fn === 'avg') out = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        else if (n.fn === 'min') out = vals.length ? Math.min(...vals) : 0;
        else out = vals.length ? Math.max(...vals) : 0;
        trace.set(`${n.fn}(${col.table}.${col.field})`, out);
        return out;
      }
      case 'bin': {
        if (n.op === 'and') return truthy(ev(n.l)) && truthy(ev(n.r));
        if (n.op === 'or') return truthy(ev(n.l)) || truthy(ev(n.r));
        const a = num(ev(n.l));
        const b = num(ev(n.r));
        switch (n.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': if (b === 0) throw new NotEvaluated('Բաժանում զրոյի վրա'); return a / b;
          case '<': return a < b;
          case '<=': return a <= b;
          case '>': return a > b;
          case '>=': return a >= b;
          case '==': return a === b;
          case '!=': return a !== b;
          default: throw new SyntaxError(n.op);
        }
      }
      default: throw new SyntaxError('Անծանոթ հանգույց');
    }
  }
  const value = ev(ast);
  return { value, trace };
}

export const truthy = (v) => (typeof v === 'number' ? v !== 0 && !Number.isNaN(v) : !!v);

/**
 * Տողի դաշտի արժեք. «<money>_amd» դաշտը (եթե սյունակը չկա) հաշվարկվում է EPD-ի money սյուներից.
 * <money>_amount × <money>_ratetodefault (DEC-11)
 */
export function fieldValue(row, field) {
  if (field in row) return typeof row[field] === 'boolean' ? (row[field] ? 1 : 0) : row[field];
  if (field.endsWith('_amd')) {
    const base = field.slice(0, -4);
    const a = row[`${base}_amount`];
    if (typeof a === 'number') return a * (row[`${base}_ratetodefault`] ?? 1);
  }
  return undefined;
}
