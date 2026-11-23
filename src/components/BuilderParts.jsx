/**
 * Կանոնների կառուցիչի բաղադրիչներ (COM-01, COM-04, COM-05).
 *   • builderGroups՝ փոփոխականների խմբեր (պարզ, բարդ, արտաքին, համակարգային, այլ կանոններ)
 *   • VariablePicker՝ փոփոխականների ընտրիչ (ներդիրներ, որոնում, ֆիքսված բարձրության ցանկ)
 *   • OperatorBar՝ գործողությունների կոճակներ (տեքստային ռեժիմ)
 *   • ConditionBuilder՝ տողերով կառուցիչ (ԵՎ/ԿԱՄ խմբեր, «փոփոխական — գործողություն — արժեք/փոփոխական» տողեր)
 *   • DerivedVarDialog՝ մասնագետի սահմանած բարդ փոփոխական (բանաձև պարզ, բարդ, արտաքին և համակարգային փոփոխականներից)
 */
import { useEffect, useRef, useState } from 'react';
import {
  Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, Tab, Tabs, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { METRICS } from '../engine/metrics.js';
import { effectiveFormulas, FORMULA_INPUTS, DEFAULT_FORMULAS } from '../engine/annualExpense.js';
import { allVariableDefs, variableAppliesTo, variableValue } from '../engine/variables.js';
import { parse, dependencies } from '../engine/expression.js';
import { isArithmetic, emptyCond } from '../engine/conditionTree.js';
import { evaluateAll } from '../engine/evaluator.js';
import { DIRECTIONS } from '../rules/common.js';
import { SimpleTable } from './common.jsx';
import ExpressionEditor from './ExpressionEditor.jsx';

// ───────────────────────── փոփոխականների խմբեր

/**
 * Կառուցիչի փոփոխականների խմբեր տվյալ ուղղության (և կուսակցությունների դեպքում՝ մակարդակի) համար։
 * derived՝ մասնագետի սահմանած բարդ փոփոխականներ. rules՝ այլ կանոններ (null՝ առանց կանոնների խմբի)
 */
export function builderGroups({ direction, level, state, rules = null, excludeRuleId, excludeDerivedKey }) {
  const M = METRICS[direction];
  const lvl = (m) => !level || !m.level || m.level === level;
  const today = new Date().toISOString().slice(0, 10);
  const formulas = effectiveFormulas(state);
  const derived = (state.derivedVars || []).filter((d) => d.direction === direction && d.key !== excludeDerivedKey && lvl(d));
  const groups = [
    { key: 'simple', short: 'Պարզ', title: '(1ա) Պարզ փոփոխականներ՝ փաստաթղթի դաշտ', items: M.doc.filter(lvl).filter((m) => m.kind === 'simple').map((m) => ({ tok: `doc.${m.key}`, label: m.label, sub: m.source })) },
    { key: 'complex', short: 'Բարդ', title: '(1բ) Բարդ փոփոխականներ՝ հաշվարկվում են փաստաթղթի (փաստաթղթերի) տարբեր դաշտերից (COM-04)', items: [
      ...M.doc.filter(lvl).filter((m) => m.kind !== 'simple').map((m) => ({ tok: `doc.${m.key}`, label: m.label, sub: m.editableFormula ? `= ${formulas[m.key]}` : null })),
      ...derived.map((d) => ({ tok: `doc.${d.key}`, label: d.label, sub: `= ${d.expression}`, derived: d })),
    ] },
    { key: 'ext', short: 'Արտաքին', title: '(2) Արտաքին տվյալներ (պետական շտեմարաններ, արտաքին ֆայլեր)', items: M.ext.filter(lvl).map((m) => ({ tok: `ext.${m.key}`, label: m.label, color: 'info' })) },
    { key: 'var', short: 'Համակարգային', title: '(3) Համակարգային փոփոխականներ (բաժին 9). արժեքը՝ այսօրվա դրությամբ', items: allVariableDefs(state).filter((v) => v.type === 'number' && variableAppliesTo(v, direction)).map((v) => {
      const val = variableValue(state.variables || {}, v.key, today);
      return { tok: `var.${v.key}`, label: v.label, color: 'secondary', hint: val == null ? 'սահմանված չէ' : `${Number(val).toLocaleString('hy-AM')}${v.unit ? ` ${v.unit}` : ''}` };
    }) },
  ];
  if (rules) groups.push({ key: 'rule', short: 'Կանոններ', title: '(4) Այլ կանոնների արդյունքներ (COM-05). ճիշտ է, եթե կանոնն աշխատել է', items: rules.filter((r) => r.direction === direction && r.id !== excludeRuleId && (!level || (r.level || 'person') === level)).map((r) => ({ tok: `rule.${r.id}`, label: r.title, color: 'error' })) });
  return groups;
}

/** Արտահայտության մեջ անծանոթ բաղադրիչներ (ըստ խմբերի) */
export function unknownRefs(deps, groups) {
  const known = new Set(groups.flatMap((g) => g.items.map((it) => it.tok)));
  const out = [];
  for (const ns of ['doc', 'ext', 'var', 'rule']) for (const d of deps[ns]) if (!known.has(`${ns}.${d}`)) out.push(`${ns}.${d}`);
  return out;
}

// ───────────────────────── ընտրիչ և գործողություններ

/**
 * Փոփոխականների ընտրիչ. ներդիրներ՝ ըստ փոփոխականի տեսակի (բաժին 3), որոնում բոլոր տեսակներում, ֆիքսված բարձրության ցանկ
 * (ոլորվում է միայն ցանկը). սեղմելիս փոփոխականը տեղադրվում է կուրսորի դիրքում
 */
export function VariablePicker({ groups, onPick, onCreateDerived, onEditDerived, onDeleteDerived, height = 300 }) {
  const [tab, setTab] = useState(groups[0].key);
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const group = groups.find((g) => g.key === tab) || groups[0];
  const items = needle
    ? groups.flatMap((g) => g.items.filter((it) => `${it.label} ${it.tok}`.toLowerCase().includes(needle)).map((it) => ({ ...it, group: g.short })))
    : group.items;
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ borderBottom: 1, borderColor: 'divider', alignItems: { md: 'center' }, justifyContent: 'space-between', pr: { md: 1 } }}>
        <Tabs value={needle ? false : group.key} onChange={(e, v) => { setTab(v); setQ(''); }} variant="scrollable" sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0.5 } }}>
          {groups.map((g) => <Tab key={g.key} value={g.key} label={`${g.short} (${g.items.length})`} disabled={!g.items.length && !(g.key === 'complex' && onCreateDerived)} />)}
        </Tabs>
        <TextField size="small" placeholder="Որոնել բոլոր փոփոխականներում…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ m: 1, width: { xs: 'auto', md: 280 } }}
          slotProps={{ input: { startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />, endAdornment: q && <IconButton size="small" onClick={() => setQ('')}><CloseIcon fontSize="small" /></IconButton> } }} />
      </Stack>
      <Stack direction="row" sx={{ px: 1.5, pt: 1, alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">{needle ? `Որոնման արդյունք՝ ${items.length}` : group.title}. սեղմեք՝ տեղադրելու համար</Typography>
        {!needle && group.key === 'complex' && onCreateDerived && <Button size="small" startIcon={<AddIcon />} onClick={onCreateDerived}>Նոր բարդ փոփոխական</Button>}
      </Stack>
      <Box sx={{ maxHeight: height, overflowY: 'auto', p: 0.5 }}>
        {!items.length && <Typography color="text.secondary" sx={{ p: 1.5 }}>Չի գտնվել</Typography>}
        {items.map((it) => (
          <Box
            key={it.tok}
            role="button"
            tabIndex={0}
            onClick={() => onPick(it.tok)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(it.tok); } }}
            sx={{ display: 'flex', gap: 1.5, alignItems: 'center', px: 1, py: 0.6, borderRadius: 1, cursor: 'pointer', '&:hover, &:focus-visible': { bgcolor: 'action.hover', outline: 'none' } }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ lineHeight: 1.35 }}>{it.label}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>{it.tok}{it.sub ? `  ${it.sub}` : ''}</Typography>
            </Box>
            {it.group && <Chip size="small" variant="outlined" label={it.group} />}
            {it.hint && <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{it.hint}</Typography>}
            {it.derived && onEditDerived && <Tooltip title="Խմբագրել բարդ փոփոխականը"><IconButton size="small" onClick={(e) => { e.stopPropagation(); onEditDerived(it.derived); }}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>}
            {it.derived && onDeleteDerived && <Tooltip title="Ջնջել"><IconButton size="small" onClick={(e) => { e.stopPropagation(); onDeleteDerived(it.derived); }}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** Գործողությունների նշաններ՝ տեքստային խմբագրիչում տեղադրելու համար */
const OPERATORS = [
  [['+', '+', 'Գումարում'], ['−', '-', 'Հանում'], ['×', '*', 'Բազմապատկում'], ['÷', '/', 'Բաժանում']],
  [['<', '<', 'Փոքր է'], ['≤', '<=', 'Փոքր է կամ հավասար'], ['>', '>', 'Մեծ է'], ['≥', '>=', 'Մեծ է կամ հավասար'], ['=', '==', 'Հավասար է'], ['≠', '!=', 'Հավասար չէ']],
  [['ԵՎ', 'and', 'Երկու պայմաններն էլ ճիշտ են'], ['ԿԱՄ', 'or', 'Պայմաններից առնվազն մեկը ճիշտ է'], ['ՈՉ', 'not', 'Պայմանը ճիշտ չէ']],
  [['(', '(', 'Բացվող փակագիծ'], [')', ')', 'Փակվող փակագիծ']],
];
export function OperatorBar({ onPick, arithmeticOnly = false }) {
  const groups = arithmeticOnly ? [OPERATORS[0], OPERATORS[3]] : OPERATORS;
  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
      <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Գործողություններ՝</Typography>
      {groups.map((group, i) => (
        <Stack key={i} direction="row" sx={{ gap: 0.5 }}>
          {group.map(([label, tok, title]) => (
            <Tooltip key={tok} title={`${title} (${tok})`}>
              <Button size="small" variant="outlined" onClick={() => onPick(tok)} sx={{ minWidth: label.length > 1 ? 44 : 34, px: 1, py: 0.25, fontWeight: 700, fontFamily: label.length > 1 ? undefined : 'monospace' }}>{label}</Button>
            </Tooltip>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}

// ───────────────────────── տողերով կառուցիչ

const CMP_LABEL = { '<': '<', '<=': '≤', '>': '>', '>=': '≥', '==': '=', '!=': '≠', true: 'ճիշտ է' };
const CMP_HINT = { '<': 'փոքր է', '<=': 'փոքր է կամ հավասար', '>': 'մեծ է', '>=': 'մեծ է կամ հավասար', '==': 'հավասար է', '!=': 'հավասար չէ', true: 'ճիշտ է (կանոնն աշխատել է կամ արժեքը 0 չէ)' };

const flatOptions = (groups) => groups.flatMap((g) => g.items.map((it) => ({ ...it, group: g.short })));
const operandText = (o, options) => {
  if (!o) return '';
  if (o.kind === 'ref') return options.find((x) => x.tok === o.tok)?.label || o.tok;
  if (o.kind === 'num') return String(o.value);
  return o.text || '';
};

/**
 * Տողի կողմ. փոփոխական (ընտրվում է ցանկից՝ որոնմամբ), թիվ կամ բանաձև (գրվում է)։
 * Ցանկից ընտրելիս պահվում է փոփոխականի նշանը, գրելիս՝ թիվը կամ բանաձևը
 */
function OperandInput({ value, onChange, options, placeholder, error }) {
  const [input, setInput] = useState(operandText(value, options));
  const last = useRef(value);
  useEffect(() => { if (value !== last.current) { last.current = value; setInput(operandText(value, options)); } }, [value, options]);
  const set = (v) => { last.current = v; onChange(v); };
  const commit = (txt) => {
    const t = (txt || '').trim();
    if (!t) return set(null);
    const opt = options.find((o) => o.label === t || o.tok === t);
    if (opt) return set({ kind: 'ref', tok: opt.tok });
    const n = t.replace(/[\s ]/g, '').replace(',', '.');
    if (/^-?\d+(\.\d+)?$/.test(n)) return set({ kind: 'num', value: Number(n) });
    return set({ kind: 'formula', text: t });
  };
  const selected = value?.kind === 'ref' ? options.find((o) => o.tok === value.tok) || null : null;
  const formulaError = value?.kind === 'formula' && (() => { try { return !isArithmetic(parse(value.text)); } catch { return true; } })();
  return (
    <Autocomplete
      freeSolo
      size="small"
      options={options}
      groupBy={(o) => o.group}
      value={selected}
      inputValue={input}
      onInputChange={(e, v, reason) => { if (reason !== 'reset' || selected) setInput(v); }}
      onChange={(e, v) => { if (v && typeof v === 'object') { set({ kind: 'ref', tok: v.tok }); setInput(v.label); } else if (typeof v === 'string') commit(v); }}
      onBlur={() => { if (!selected || input !== selected.label) commit(input); }}
      getOptionLabel={(o) => (typeof o === 'string' ? o : o.label)}
      filterOptions={(opts, st) => { const q = st.inputValue.trim().toLowerCase(); return q && !(selected && st.inputValue === selected.label) ? opts.filter((o) => `${o.label} ${o.tok}`.toLowerCase().includes(q)) : opts; }}
      renderOption={({ key, ...props }, o) => (
        <li key={o.tok} {...props}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2">{o.label}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{o.tok}{o.hint ? ` · ${o.hint}` : ''}</Typography>
          </Box>
        </li>
      )}
      sx={{ flex: 1, minWidth: 200 }}
      renderInput={(params) => (
        <TextField {...params} placeholder={placeholder} error={error || formulaError}
          helperText={formulaError ? 'Ընտրեք փոփոխականը ցանկից կամ գրեք թիվ կամ բանաձև (փոփոխականների նշաններ, թվեր, + − * / և փակագծեր)' : value?.kind === 'formula' ? 'բանաձև' : undefined} />
      )}
    />
  );
}

const isRuleRef = (o) => o?.kind === 'ref' && o.tok.startsWith('rule.');

function CondRow({ node, onChange, onRemove, options }) {
  const set = (patch) => onChange({ ...node, ...patch });
  const isRule = isRuleRef(node.left);
  // աջ կողմում այլ կանոնի արդյունքը իմաստ չունի (համեմատվում է թվերի հետ)
  const rightOptions = options.filter((o) => !o.tok.startsWith('rule.'));
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ alignItems: { md: 'flex-start' }, py: 0.75 }}>
      <Tooltip title="ՈՉ՝ պայմանը ճիշտ չէ"><ToggleButton size="small" value="not" selected={!!node.not} onChange={() => set({ not: !node.not })} sx={{ px: 1, py: 0.5, fontWeight: 700, alignSelf: { xs: 'flex-start', md: 'auto' } }}>ՈՉ</ToggleButton></Tooltip>
      <OperandInput value={node.left} options={options} placeholder="Փոփոխական (ընտրեք կամ որոնեք)"
        onChange={(left) => set({ left, ...(isRuleRef(left) ? { cmp: 'true', right: null } : isRule && node.cmp === 'true' ? { cmp: '>' } : {}) })} />
      <TextField select size="small" value={node.cmp} onChange={(e) => set({ cmp: e.target.value, ...(e.target.value === 'true' ? { right: null } : {}) })} sx={{ width: { xs: '100%', md: 120 } }}
        slotProps={{ select: { renderValue: (v) => CMP_LABEL[v] } }}>
        {Object.keys(CMP_LABEL).map((k) => <MenuItem key={k} value={k} disabled={isRule && k !== 'true'}><b style={{ width: 44, display: 'inline-block' }}>{CMP_LABEL[k]}</b> {CMP_HINT[k]}</MenuItem>)}
      </TextField>
      {node.cmp !== 'true' && <OperandInput value={node.right} options={rightOptions} placeholder="Արժեք, փոփոխական կամ բանաձև" onChange={(right) => set({ right })} />}
      <Tooltip title="Հեռացնել պայմանը"><IconButton size="small" onClick={onRemove} sx={{ mt: { md: 0.5 } }}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
    </Stack>
  );
}

function GroupBox({ node, onChange, onRemove, options, depth = 0 }) {
  const setChild = (i, c) => onChange({ ...node, children: node.children.map((x, j) => (j === i ? c : x)) });
  const removeChild = (i) => onChange({ ...node, children: node.children.filter((_, j) => j !== i) });
  const add = (c) => onChange({ ...node, children: [...node.children, c] });
  return (
    <Box sx={{ border: 1, borderColor: depth ? 'divider' : 'primary.light', borderLeftWidth: 4, borderLeftColor: node.op === 'and' ? 'primary.main' : 'warning.main', borderRadius: 1, p: 1.25, bgcolor: depth % 2 ? 'action.hover' : 'background.paper' }}>
      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
        <Tooltip title="ՈՉ՝ ամբողջ խումբը ճիշտ չէ"><ToggleButton size="small" value="not" selected={!!node.not} onChange={() => onChange({ ...node, not: !node.not })} sx={{ px: 1, py: 0.25, fontWeight: 700 }}>ՈՉ</ToggleButton></Tooltip>
        <ToggleButtonGroup size="small" exclusive value={node.op} onChange={(e, v) => v && onChange({ ...node, op: v })}>
          <ToggleButton value="and" sx={{ px: 1.5, py: 0.25, fontWeight: 700 }}>ԵՎ</ToggleButton>
          <ToggleButton value="or" sx={{ px: 1.5, py: 0.25, fontWeight: 700 }}>ԿԱՄ</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="caption" color="text.secondary">{node.op === 'and' ? 'բոլոր պայմանները ճիշտ են' : 'առնվազն մեկ պայման ճիշտ է'}</Typography>
        <Box sx={{ flex: 1 }} />
        <Button size="small" startIcon={<AddIcon />} onClick={() => add(emptyCond())}>Պայման</Button>
        <Button size="small" startIcon={<AddIcon />} onClick={() => add({ type: 'group', op: node.op === 'and' ? 'or' : 'and', not: false, children: [emptyCond()] })}>Խումբ</Button>
        {onRemove && <Tooltip title="Հեռացնել խումբը"><IconButton size="small" onClick={onRemove}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>}
      </Stack>
      {!node.children.length && <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>Խումբը դատարկ է. ավելացրեք պայման</Typography>}
      {node.children.map((c, i) => (
        <Box key={i} sx={{ borderTop: i ? 1 : 0, borderColor: 'divider', ...(c.type === 'group' ? { py: 1 } : {}) }}>
          {i > 0 && <Chip size="small" label={node.op === 'and' ? 'ԵՎ' : 'ԿԱՄ'} sx={{ mt: 0.75, fontWeight: 700, height: 20 }} color={node.op === 'and' ? 'primary' : 'warning'} variant="outlined" />}
          {c.type === 'group'
            ? <GroupBox node={c} depth={depth + 1} options={options} onChange={(x) => setChild(i, x)} onRemove={() => removeChild(i)} />
            : <CondRow node={c} options={options} onChange={(x) => setChild(i, x)} onRemove={() => removeChild(i)} />}
        </Box>
      ))}
    </Box>
  );
}

/** Տողերով կառուցիչ. tree՝ conditionTree.js-ի ծառը */
export function ConditionBuilder({ tree, onChange, groups }) {
  const options = flatOptions(groups);
  return <GroupBox node={tree} onChange={onChange} options={options} />;
}

// ───────────────────────── փորձարկում

/** Կանոնի արդյունքները ուղղության բոլոր փաստաթղթերի վրա (կառուցիչի «Փորձարկել») */
export function collectResults(R, direction, ruleId) {
  const out = [];
  const take = (label, res, path) => { const r = res?.[ruleId]; if (r && r.status !== 'not_applicable') out.push({ id: `${label}${out.length}`, label, r, path }); };
  if (direction === 'declarations') R.declarations.forEach((u) => (u.scopes || []).forEach((s) => take(`${u.profile.firstname} ${u.profile.lastname} ${u.year} — ${s.label}`, s.results, `/declarations/${u.id}`)));
  if (direction === 'gifts') R.gifts.forEach((u) => take(`${u.id} ${u.gift.description}`, u.results, `/gifts/${u.id}`));
  if (direction === 'parties') { R.parties.persons.forEach((u) => take(`${u.names.join('/')} ${u.year}`, u.results, `/parties/person/${encodeURIComponent(u.id)}`)); R.parties.reports.forEach((u) => take(`${u.party.name} ${u.year}`, u.results, `/parties/${u.id}`)); }
  if (direction === 'integrity') R.integrity.forEach((u) => take(`${u.profile.firstname} ${u.profile.lastname}`, u.results, `/integrity/${u.id}`));
  return out;
}

// ───────────────────────── բարդ փոփոխական

const KEY_RE = /^[a-z][a-z0-9_]{1,40}$/;

/**
 * Մասնագետի սահմանած բարդ փոփոխական (COM-01, COM-04)։ Բանաձևը կազմվում է պարզ, բարդ, արտաքին և համակարգային
 * փոփոխականներից և թվաբանական գործողություններից. կառուցիչում հասանելի է որպես doc.<նշան>
 */
export function DerivedVarDialog({ open, initial, direction: fixedDirection, level, state, usedBy = [], onClose, onSave, onRestore }) {
  const editing = !!initial;
  // 4.1-ի նախասահմանված բանաձև. բաղադրիչներ՝ միայն պարզ դաշտերը և 4.1-ի այլ բանաձևերը (հաշվարկվում է 4.1-ի հաշվարկում)
  const core = !!initial?.predefined;
  const [f, setF] = useState(() => initial || { key: '', label: '', expression: '', direction: fixedDirection || 'declarations' });
  const [preview, setPreview] = useState(null);
  const editorRef = useRef(null);
  const dir = f.direction;
  const allGroups = builderGroups({ direction: dir, level, state, excludeDerivedKey: initial?.key });
  const groups = core
    ? allGroups.filter((g) => g.key === 'simple' || g.key === 'complex').map((g) => ({ ...g, items: g.items.filter((it) => { const k = it.tok.slice(4); return k !== initial.key && (FORMULA_INPUTS.includes(k) || (DEFAULT_FORMULAS[k] && !it.derived)); }) }))
    : allGroups;
  const known = new Map(groups.flatMap((g) => g.items.map((it) => [it.tok, it])));
  let err = null;
  let deps = null;
  if (f.expression.trim()) {
    try {
      const ast = parse(f.expression);
      deps = dependencies(ast);
      if (!isArithmetic(ast)) err = 'Բարդ փոփոխականը թվային բանաձև է. համեմատումները և ԵՎ/ԿԱՄ-ը գրվում են կանոնի պայմանում';
      else if (deps.rule.size) err = 'Բարդ փոփոխականում այլ կանոնների արդյունքները չեն օգտագործվում';
      else if (deps.tables.size) err = 'Օգտագործեք փոփոխականներ (պարզ կամ բարդ)';
      else { const u = unknownRefs(deps, groups); if (u.length) err = `Անծանոթ՝ ${u.join(', ')}`; }
      // ցիկլ. բանաձևը (անուղղակիորեն) կախված է հենց այս փոփոխականից
      if (!err && f.key) {
        const byKey = core
          ? new Map(Object.entries(effectiveFormulas(state)).filter(([k]) => k !== initial.key).map(([k, expression]) => [k, { key: k, expression }]))
          : new Map((state.derivedVars || []).filter((d) => d.direction === dir && d !== initial).map((d) => [d.key, d]));
        const seen = new Set();
        const reaches = (keys) => [...keys].some((k) => {
          if (k === f.key) return true;
          if (seen.has(k) || !byKey.has(k)) return false;
          seen.add(k);
          try { return reaches(dependencies(parse(byKey.get(k).expression)).doc); } catch { return false; }
        });
        if (reaches(deps.doc)) err = `Ցիկլային սահմանում. բանաձևը կախված է doc.${f.key}-ից`;
      }
    } catch (e) { err = e.message; }
  }
  const taken = METRICS[dir].doc.some((m) => m.key === f.key) || (state.derivedVars || []).some((d) => d.key === f.key && d.direction === dir && d !== initial);
  const keyErr = !editing && f.key && (!KEY_RE.test(f.key) ? 'Լատինատառ փոքրատառեր, թվեր և «_», սկսվում է տառով' : taken ? 'Այս նշանն արդեն զբաղված է' : null);
  const valid = f.label.trim() && KEY_RE.test(f.key) && !keyErr && f.expression.trim() && !err;
  const runPreview = () => {
    const draft = { ...f, level: dir === 'parties' ? level || 'person' : undefined };
    const others = (state.derivedVars || []).filter((d) => d !== initial);
    const id = '__PREVIEW__';
    const previewRule = { id, kind: 'expression', direction: dir, level: draft.level, title: 'preview', expression: `doc.${f.key} == doc.${f.key}`, weight: 0 };
    const R = evaluateAll(core
      ? { ...state, formulaOverrides: { ...(state.formulaOverrides || {}), [f.key]: { expression: f.expression } }, customRules: [...(state.customRules || []), previewRule] }
      : { ...state, derivedVars: [...others, draft], customRules: [...(state.customRules || []), previewRule] });
    setPreview(collectResults(R, dir, id).map((t) => ({ ...t, value: t.r.values?.find((v) => v.label.startsWith(`doc.${f.key} `))?.value })));
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        {editing ? `Բարդ փոփոխական՝ doc.${initial.key}` : 'Նոր բարդ փոփոխական'}
        <IconButton aria-label="Փակել" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">Բարդ փոփոխականը հաշվարկվում է բանաձևով՝ պարզ, բարդ, արտաքին և համակարգային փոփոխականներից։ Սահմանվում է մեկ անգամ և օգտագործվում է տարբեր կանոններում։</Typography>
          {core && <Alert severity="warning">Ընթացիկ ծախսի հաշվարկի բանաձև։ Փոփոխությունը կկիրառվի ամենուր՝ DEC-R1, DEC-R6, «Ընթացիկ ծախսի հաշվարկ» և «Ամփոփում՝ ըստ տարիների» ներդիրներ, կառուցիչի կանոններ։ Հայտարարագրերը կնշվեն «պահանջվում է վերագնահատում»։ Սկզբնական բանաձև՝ <code>{DEFAULT_FORMULAS[initial.key]}</code></Alert>}
          {usedBy.length > 0 && <Alert severity="info">Օգտագործվում է՝ {usedBy.join(', ')}։ Բանաձևի փոփոխությունը կազդի այս կանոնների վրա։</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            {!fixedDirection && (
              <TextField size="small" select label="Ուղղություն" value={dir} disabled={editing} onChange={(e) => setF({ ...f, direction: e.target.value, expression: '' })} sx={{ minWidth: 200 }}>
                {Object.entries(DIRECTIONS).map(([k, l]) => <MenuItem key={k} value={k}>{l}</MenuItem>)}
              </TextField>
            )}
            <TextField size="small" label="Անվանում" value={f.label} disabled={core} onChange={(e) => setF({ ...f, label: e.target.value })} sx={{ flex: 1 }} />
            <TextField size="small" label="Նշան" value={f.key} disabled={editing} onChange={(e) => setF({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} error={!!keyErr} helperText={keyErr || `կանոնում՝ doc.${f.key || '…'}`} sx={{ width: { sm: 220 } }} />
          </Stack>
          <OperatorBar arithmeticOnly onPick={(t) => editorRef.current?.insert(t)} />
          <ExpressionEditor ref={editorRef} label="Բանաձև" value={f.expression} describe={(tok) => known.get(tok) || null} onChange={(expression) => { setF((x) => ({ ...x, expression })); setPreview(null); }}
            error={!!err} helperText={err || 'Ընտրեք փոփոխականը ներքևի ընտրիչից, գործողությունը՝ վերևի կոճակներից։ Օրինակ՝ var.cash_ratio * doc.noncash_end'} />
          <VariablePicker groups={groups} onPick={(t) => editorRef.current?.insert(t)} height={220} />
          {preview && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Արժեքները փաստաթղթերում ({preview.length})</Typography>
              <Box sx={{ maxHeight: 220, overflowY: 'auto' }}>
                <SimpleTable dense rows={preview} columns={[
                  { key: 'l', label: 'Փաստաթուղթ', render: (t) => t.label },
                  { key: 'v', label: 'Արժեք', align: 'right', render: (t) => (t.r.status === 'not_evaluated' ? <Typography variant="caption" color="warning.main">{t.r.explanation}</Typography> : typeof t.value === 'number' ? t.value.toLocaleString('hy-AM', { maximumFractionDigits: 2 }) : '—') },
                ]} />
              </Box>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {core && initial.overridden && onRestore && <Button color="warning" onClick={() => onRestore(initial.key)}>Վերականգնել սկզբնականը</Button>}
        <Button onClick={runPreview} disabled={!valid}>Հաշվել փաստաթղթերում</Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Չեղարկել</Button>
        <Button variant="contained" disabled={!valid} onClick={() => onSave({ key: f.key, label: f.label.trim(), expression: f.expression.trim(), direction: dir, ...(dir === 'parties' ? { level: initial?.level || level || 'person' } : {}) })}>Պահպանել</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Կանոններ, որոնք օգտագործում են բարդ փոփոխականը */
export const derivedUsage = (state, d) => (state.customRules || []).filter((r) => r.kind === 'expression' && r.direction === d.direction && new RegExp(`\\bdoc\\.${d.key}\\b`).test(r.expression || '')).map((r) => r.id)
  .concat(Object.entries(state.ruleConfig || {}).filter(([, c]) => c.expression && new RegExp(`\\bdoc\\.${d.key}\\b`).test(c.expression)).map(([id]) => id))
  .concat((state.derivedVars || []).filter((x) => x !== d && x.direction === d.direction && new RegExp(`\\bdoc\\.${d.key}\\b`).test(x.expression)).map((x) => `doc.${x.key}`));
