import { useMemo, useRef, useState } from 'react';
import {
  Box, Button, Chip, Stack, Switch, Tab, Tabs, TextField, MenuItem, Typography, Alert, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Divider, Paper, Grid, FormControlLabel, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useStore, can } from '../engine/store.js';
import { DIRECTIONS } from '../rules/common.js';
import { MANUAL_RULES, notImplementedRules, builtinById } from '../rules/catalog.js';
import { allVariableDefs, variableAppliesTo, variableDefOf, variableValue } from '../engine/variables.js';
import { METRICS, BUILDER_EXAMPLES, resolveTable, tableLabel } from '../engine/metrics.js';
import { parse, dependencies } from '../engine/expression.js';
import { evaluateAll, builtinExpressionFor } from '../engine/evaluator.js';
import { SERVICES } from '../adapters/transport.js';
import { PageHeader, Section, SimpleTable, InfoNote, navigate } from '../components/common.jsx';
import ExpressionEditor from '../components/ExpressionEditor.jsx';
import { builderGroups, unknownRefs, VariablePicker, OperatorBar, ConditionBuilder, DerivedVarDialog, collectResults, derivedUsage } from '../components/BuilderParts.jsx';
import { treeFromExpression, treeToExpression, emptyTree } from '../engine/conditionTree.js';

/**
 * «Կանոններ» էջ. ներդիրներ՝ ըստ ուղղությունների (COM-02)։ Կանոնի խմբագրման միասնական էջը (կառուցիչով, COM-01) բացվում է «Նոր կանոն» կամ «Խմբագրել»
 * գործողություններով (#/rules/new/<ուղղություն>, #/rules/edit/<ID>), չիրականացված կանոնները՝ պատուհանով։
 * Պատրաստի կանոնների կրկնօրինակումը (COM-06)՝ ցանկում
 */
const DIRS = Object.keys(DIRECTIONS);

/** Կանոնի կիրառման վիճակագրություն բոլոր փաստաթղթերի վրա */
export function ruleStats(results) {
  const stats = {};
  const add = (res) => { for (const r of Object.values(res || {})) { const s = (stats[r.ruleId] ||= { fired: 0, not_fired: 0, not_evaluated: 0, not_applicable: 0 }); s[r.status]++; } };
  for (const u of results.declarations) for (const s of u.scopes || []) add(s.results);
  results.gifts.forEach((u) => add(u.results));
  results.parties.persons.forEach((u) => add(u.results));
  results.parties.reports.forEach((u) => add(u.results));
  results.integrity.forEach((u) => add(u.results));
  return stats;
}

export default function RulesPage({ tab, editId }) {
  const { results } = useStore();
  const [notImpl, setNotImpl] = useState(false);
  // կանոնի խմբագրում (#/rules/edit/<ID>; հին հասցե՝ #/rules/builder/<ID>) և նոր կանոն (#/rules/new/<ուղղություն>)
  if (tab === 'edit' || tab === 'builder' || tab === 'new') {
    const isNew = tab === 'new' || !editId;
    const rule = isNew ? null : results.rules.find((r) => r.id === editId);
    const dir = isNew ? (DIRS.includes(editId) ? editId : 'declarations') : rule?.direction || 'declarations';
    return (
      <>
        <PageHeader title={isNew ? 'Նոր կանոն' : `Կանոնի խմբագրում՝ ${editId}`} subtitle={isNew ? `${DIRECTIONS[dir]}. պայմանը կազմվում է կառուցիչով (COM-01)` : rule ? `${DIRECTIONS[dir]} · ${rule.title}` : ''} back={{ to: `/rules/${dir}`, label: 'Կանոններ' }} />
        <RuleEditor key={`${tab}-${editId || ''}`} ruleId={isNew ? undefined : editId} newDirection={dir} />
      </>
    );
  }
  const dir = DIRS.includes(tab) ? tab : 'declarations';
  const notImplHere = notImplementedRules.filter((r) => r.direction === dir);
  return (
    <>
      <PageHeader title="Կանոններ" subtitle="Ռիսկի չափորոշիչների իրականացումը (կանոններ). յուրաքանչյուր կանոն պատկանում է մեկ ուղղության (COM-02)" />
      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider', justifyContent: 'space-between', alignItems: { md: 'flex-end' } }}>
        <Tabs value={dir} onChange={(e, v) => navigate(`/rules/${v}`)} variant="scrollable">
          {DIRS.map((d) => <Tab key={d} value={d} label={DIRECTIONS[d]} />)}
        </Tabs>
        <Button size="small" color="warning" startIcon={<InfoOutlinedIcon />} disabled={!notImplHere.length} onClick={() => setNotImpl(true)} sx={{ mb: 0.5, alignSelf: { xs: 'flex-start', md: 'auto' } }}>
          Չիրականացված կանոններ ({notImplHere.length})
        </Button>
      </Stack>
      <RuleList key={dir} dir={dir} />
      <Dialog open={notImpl} onClose={() => setNotImpl(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          Չիրականացված կանոններ՝ {DIRECTIONS[dir]}
          <IconButton aria-label="Փակել" onClick={() => setNotImpl(false)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent><NotImplementedList direction={dir} /></DialogContent>
      </Dialog>
    </>
  );
}

function bindingLabel(b, state) {
  if (!b) return 'սահմանված չէ';
  if (b.var) return `փոփոխական՝ ${variableDefOf(state, b.var)?.label || b.var}`;
  return `արժեք՝ ${Array.isArray(b.value) ? b.value.join(', ') : b.value}`;
}

function RuleList({ dir }) {
  const { state, update, results } = useStore();
  const editable = can(state.role, 'edit_rules');
  const stats = useMemo(() => ruleStats(results), [results]);
  const rules = results.rules.filter((r) => r.direction === dir);
  const maxManual = variableValue(state.variables || {}, 'manual_max_weight', new Date().toISOString().slice(0, 10)) ?? 25;

  /** COM-06. պատրաստի կանոնի կրկնօրինակ՝ այլ պարամետրերով (օր.՝ այլ շեմով) */
  const copy = (r) => {
    const n = state.customRules.filter((c) => c.base === r.id).length + 1;
    update((s) => ({ customRules: [...s.customRules, { id: `${r.id}-K${n}`, kind: 'copy', base: r.id, title: `${r.title} (կրկնօրինակ ${n})`, enabled: true, params: {} }] }));
  };
  const setCfg = (id, patch) => update((s) => {
    const custom = s.customRules.find((c) => c.id === id);
    if (custom) return { customRules: s.customRules.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
    return { ruleConfig: { ...s.ruleConfig, [id]: { ...(s.ruleConfig[id] || {}), ...patch } } };
  });

  return (
    <>
      {editable && (
        <Stack direction="row" sx={{ mb: 2 }}>
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => navigate(`/rules/new/${dir}`)}>Նոր կանոն</Button>
        </Stack>
      )}
      {!rules.length && <Typography color="text.secondary" sx={{ mb: 2 }}>Այս ուղղության համար իրականացված կանոններ չկան։</Typography>}
      {!editable && <InfoNote>Կանոնները փոփոխում է կանոնների պատասխանատուն (NFR-02)։ Ընտրեք համապատասխան դերը վերևի ցանկից։</InfoNote>}
      {rules.map((r) => {
        const st = stats[r.id] || {};
        return (
          <Paper key={r.id} sx={{ p: 2, mb: 1.5, opacity: r.enabled ? 1 : 0.6 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                  <Typography sx={{ fontWeight: 700 }}>{r.id}</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{r.title}</Typography>
                  {(r.kind !== 'builtin' || r.override) && <Chip size="small" color="info" variant="outlined" label={r.override ? 'պայմանը՝ կառուցիչով' : r.kind === 'copy' ? 'կրկնօրինակ' : 'կառուցիչ'} />}
                  {r.partial && <Chip size="small" color="warning" variant="outlined" label="մասնակի" />}
                  {r.external?.map((s) => <Chip key={s} size="small" variant="outlined" label={`արտաքին՝ ${SERVICES[s].short}`} />)}
                  {r.level && r.direction === 'parties' && <Chip size="small" variant="outlined" label={METRICS.parties.levels[r.level]} />}
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{r.criterion || r.description || r.expression}</Typography>
                {r.kind === 'expression' && <Typography variant="body2" sx={{ mt: 0.5, fontFamily: 'monospace' }}>{r.expression}</Typography>}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>Աղբյուր՝ {r.srsRef}{r.requirements ? ` · պահանջներ՝ ${r.requirements.join(', ')}` : ''}</Typography>
                {(r.params || []).length > 0 && r.kind !== 'expression' && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                    Պարամետրեր. {(r.params || []).map((p) => `${p.label} — ${bindingLabel(r.bindings[p.key], state)}`).join('; ')}
                  </Typography>
                )}
                {r.caveats?.map((c, i) => <Typography key={i} variant="caption" color="warning.dark" sx={{ display: 'block' }}>• {c}</Typography>)}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Արդյունքներ՝ աշխատել է {st.fired || 0}, չի աշխատել {st.not_fired || 0}, չի գնահատվել {st.not_evaluated || 0}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                {r.direction === 'declarations' && <Tooltip title="Քաշը փոխվում է խմբագրման ժամանակ"><Chip variant="outlined" color={r.weight ? 'default' : 'warning'} label={`Քաշ ${r.weight ?? 0}`} sx={{ mt: 0.5, fontWeight: 600 }} /></Tooltip>}
                {editable && <Tooltip title="Խմբագրել"><IconButton onClick={() => navigate(`/rules/edit/${r.id}`)}><EditOutlinedIcon /></IconButton></Tooltip>}
                {editable && r.kind === 'builtin' && (r.params || []).length > 0 && <Tooltip title="Կրկնօրինակել (COM-06). պատճենը կարելի է կարգավորել այլ պարամետրերով"><IconButton onClick={() => copy(r)}><ContentCopyIcon /></IconButton></Tooltip>}
                {editable && r.kind !== 'builtin' && !r.override && <Tooltip title="Ջնջել"><IconButton onClick={() => update((s) => ({ customRules: s.customRules.filter((c) => c.id !== r.id) }))}><DeleteOutlineIcon /></IconButton></Tooltip>}
                <Tooltip title={r.enabled ? 'Միացված' : 'Անջատված'}><Switch checked={r.enabled} disabled={!editable} onChange={(e) => setCfg(r.id, { enabled: e.target.checked })} /></Tooltip>
              </Stack>
            </Stack>
          </Paper>
        );
      })}
      {dir === 'declarations' && MANUAL_RULES.map((r) => (
        <Paper key={r.id} sx={{ p: 2, mb: 1.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 700 }}>{r.id}</Typography><Typography sx={{ fontWeight: 600 }}>{r.title}</Typography><Chip size="small" color="secondary" variant="outlined" label="ձեռքով" />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{r.criterion}. Առավելագույն քաշը՝ «Փոփոխականներ» էջում։</Typography>
              <Typography variant="caption" color="text.secondary">Աղբյուր՝ {r.srsRef}</Typography>
            </Box>
            <Tooltip title="Առավելագույն քաշ. փոխվում է «Փոփոխականներ» էջում"><Chip variant="outlined" label={`Քաշ ≤ ${maxManual}`} sx={{ mt: 0.5, fontWeight: 600, alignSelf: 'flex-start' }} /></Tooltip>
          </Stack>
        </Paper>
      ))}
    </>
  );
}

// ───────────────────────── Կանոնի խմբագրում (միասնական էջ)

const initialExpression = (builtin, rule) => builtinExpressionFor(builtin, rule.bindings);

/** Կոդով իրականացված կանոնի պարամետրեր. կապվում են համակարգային փոփոխականի հետ (COM-03) կամ ստանում ֆիքսված արժեք */
function ParamsEditor({ params, vals, setVals, disabled, state, direction }) {
  if (!params.length) return <Typography variant="body2" color="text.secondary">Այս կանոնը կարգավորվող պարամետրեր չունի։</Typography>;
  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Պարամետրը կարելի է կապել համակարգային փոփոխականի հետ (COM-03) կամ տալ ֆիքսված արժեք։</Typography>
      {params.map((p) => {
        const b = vals[p.key];
        const mode = b?.var ? 'var' : b && b.value !== undefined ? 'value' : 'none';
        const varOptions = allVariableDefs(state).filter((v) => (p.kind === 'list' ? v.type === 'list' : v.type === 'number') && (variableAppliesTo(v, direction) || v.key === b?.var));
        return (
          <Box key={p.key} sx={{ mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.75 }}>{p.label}{p.unit ? ` (${p.unit})` : ''}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField size="small" select value={mode} label="Աղբյուր" disabled={disabled} sx={{ minWidth: 160 }} onChange={(e) => setVals({ ...vals, [p.key]: e.target.value === 'var' ? { var: varOptions[0]?.key } : e.target.value === 'value' ? { value: p.kind === 'list' ? [] : 0 } : null })}>
                <MenuItem value="var">Փոփոխական</MenuItem><MenuItem value="value">Ֆիքսված արժեք</MenuItem><MenuItem value="none">Սահմանված չէ</MenuItem>
              </TextField>
              {mode === 'var' && (
                <TextField size="small" select fullWidth label="Փոփոխական" value={b.var} disabled={disabled} onChange={(e) => setVals({ ...vals, [p.key]: { var: e.target.value } })}>
                  {varOptions.map((v) => <MenuItem key={v.key} value={v.key}>{v.label}</MenuItem>)}
                </TextField>
              )}
              {mode === 'value' && (p.kind === 'list'
                ? <TextField size="small" fullWidth label="Արժեքներ (ստորակետով)" disabled={disabled} value={(b.value || []).join(', ')} onChange={(e) => setVals({ ...vals, [p.key]: { value: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })} />
                : <TextField size="small" type="number" fullWidth label="Արժեք" disabled={disabled} value={b.value} onChange={(e) => setVals({ ...vals, [p.key]: { value: e.target.value === '' ? '' : Number(e.target.value) } })} />)}
            </Stack>
          </Box>
        );
      })}
    </>
  );
}

/**
 * Կանոնի խմբագրում՝ միասնական էջ բոլոր կանոնների համար (#/rules/edit/<ID>, նորը՝ #/rules/new/<ուղղություն>).
 *   1. Ընդհանուր տվյալներ՝ ID, ուղղություն, քաշ, միացված, անվանում, նկարագրություն
 *   2. Պայման.
 *      • կառուցիչով ստեղծված կանոն՝ կառուցիչ (տողերով կամ տեքստով)
 *      • նախասահմանված կանոն՝ «Կոդով» (սկզբնական տրամաբանություն, պարամետրեր, մանրամասն բացատրություն) կամ
 *        «Կառուցիչով» (պայմանը փոխարինվում է արտահայտությամբ. վերադարձը՝ «Կոդով» ընտրելով)
 *      • կրկնօրինակ՝ կոդով տրամաբանություն և պարամետրեր
 *   3. Փորձարկում, պահպանում
 */
function RuleEditor({ ruleId: editId, newDirection = 'declarations' }) {
  const { state, update, results } = useStore();
  const eff = editId ? results.rules.find((r) => r.id === editId) : null;
  const custom = editId ? state.customRules.find((c) => c.id === editId) : null;
  const kind = !editId ? 'new' : custom?.kind === 'copy' ? 'copy' : custom ? 'expression' : builtinById[editId] ? 'builtin' : null;
  const builtin = kind === 'builtin' ? builtinById[editId] : kind === 'copy' ? builtinById[custom.base] : null;
  const hasCode = kind === 'builtin' || kind === 'copy';

  const [form, setForm] = useState(() => {
    if (kind === 'builtin' || kind === 'copy') return { id: eff.id, direction: eff.direction, level: eff.level || 'person', title: eff.title || '', description: eff.criterion || '', weight: eff.weight ?? 0, enabled: eff.enabled, expression: eff.override ? eff.expression : initialExpression(builtin, eff) };
    if (kind === 'expression') return { ...custom, description: custom.description || '', enabled: custom.enabled ?? true };
    return { id: '', direction: newDirection, level: 'person', title: '', description: '', expression: '', weight: 10, enabled: true };
  });
  // պարամետրերի կապերը. նախասահմանված կանոնի դեպքում՝ նաև կառուցիչով փոխարինված պայմանի ժամանակ (պահպանվում են ruleConfig-ում)
  const [vals, setVals] = useState(() => (builtin ? { ...Object.fromEntries((builtin.params || []).map((p) => [p.key, p.default])), ...(kind === 'builtin' ? state.ruleConfig[editId]?.params : custom.params) } : {}));
  // պայմանի աղբյուր (նախասահմանված կանոն). «code»՝ կոդով, «builder»՝ կառուցիչով (ruleConfig.expression)
  const [source, setSource] = useState(() => (kind === 'builtin' && eff.override ? 'builder' : hasCode ? 'code' : 'builder'));
  const [tree, setTree] = useState(() => treeFromExpression(form.expression));
  const [mode, setMode] = useState(() => (treeFromExpression(form.expression) ? 'tree' : 'text'));
  const [incomplete, setIncomplete] = useState(false);
  const [modeMsg, setModeMsg] = useState(null);
  const [derivedEdit, setDerivedEdit] = useState(null); // { initial } | null
  const [confirmReset, setConfirmReset] = useState(false);
  const [test, setTest] = useState(null);
  const editable = can(state.role, 'edit_rules');
  const M = METRICS[form.direction];
  const level = form.direction === 'parties' ? form.level : null;
  const isDecl = form.direction === 'declarations';
  const byBuilder = source === 'builder';

  const ruleId = form.id || editId || `${{ declarations: 'DEC', parties: 'PAR', gifts: 'GIF', integrity: 'INT' }[form.direction]}-C${String(state.customRules.length + 1).padStart(2, '0')}`;
  const groups = builderGroups({ direction: form.direction, level, state, rules: results.rules, excludeRuleId: ruleId });
  let parseError = null;
  let deps = null;
  if (byBuilder && form.expression.trim()) {
    try { deps = dependencies(parse(form.expression)); } catch (e) { parseError = e.message; }
  }
  const unknown = deps ? unknownRefs(deps, groups) : [];
  const treeIncomplete = byBuilder && mode === 'tree' && incomplete;
  const conditionOk = !byBuilder || (form.expression.trim() && !parseError && !unknown.length && !treeIncomplete);
  const valid = form.title.trim() && conditionOk && (editId || !results.rules.some((r) => r.id === ruleId));
  const weight = isDecl ? Math.max(0, Math.min(100, Number(form.weight) || 0)) : undefined;

  const editorRef = useRef(null);
  const insert = (tok) => editorRef.current?.insert(tok);
  const setExpression = (expression) => { setForm((f) => ({ ...f, expression })); setTree(treeFromExpression(expression) || emptyTree()); setIncomplete(false); setTest(null); };
  const onTree = (t) => { setTree(t); const r = treeToExpression(t); setIncomplete(r.incomplete); setForm((f) => ({ ...f, expression: r.expression })); setTest(null); };
  const switchMode = (m) => {
    if (!m || m === mode) return;
    if (m === 'tree') {
      const t = treeFromExpression(form.expression);
      if (!t) { setModeMsg(parseError ? 'Արտահայտությունը սխալ է. ուղղեք այն տեքստային ռեժիմում, հետո անցեք կառուցիչին։' : 'Այս պայմանը տողերով կառուցիչով ամբողջությամբ չի ներկայացվում (օր.՝ համեմատման արդյունքը համեմատվում է թվի հետ). խմբագրեք այն տեքստային ռեժիմում։'); return; }
      setTree(t); setIncomplete(false);
    }
    setModeMsg(null);
    setMode(m);
  };
  const switchSource = (s) => {
    if (!s || s === source) return;
    if (s === 'builder' && !form.expression.trim()) setExpression(initialExpression(builtin, { bindings: vals }));
    setSource(s);
    setTest(null);
  };

  // պահպանվող փոփոխությունները
  const builtinCfg = () => {
    const { expression: _e, ...rest } = state.ruleConfig[ruleId] || {};
    return { ...rest, title: form.title.trim() || builtin.title, criterion: form.description.trim() || builtin.criterion, enabled: form.enabled, params: vals, ...(isDecl ? { weight } : {}), ...(byBuilder ? { expression: form.expression } : {}) };
  };
  const copyEntry = () => ({ ...custom, title: form.title.trim() || custom.title, criterion: form.description.trim() || builtin.criterion, enabled: form.enabled, params: vals, ...(isDecl ? { weight } : {}) });
  const exprEntry = () => ({ ...form, id: ruleId, kind: 'expression', level: level || undefined, weight });
  const patchState = (s) => {
    if (kind === 'builtin') return { ruleConfig: { ...s.ruleConfig, [ruleId]: builtinCfg() } };
    if (kind === 'copy') return { customRules: s.customRules.map((c) => (c.id === ruleId ? copyEntry() : c)) };
    return { customRules: kind === 'expression' ? s.customRules.map((c) => (c.id === editId ? exprEntry() : c)) : [...s.customRules, exprEntry()] };
  };
  const runTest = () => { const R = evaluateAll({ ...state, ...patchState(state) }); setTest(collectResults(R, form.direction, ruleId)); };
  const save = () => { update(patchState); navigate(`/rules/${form.direction}`); };
  const resetAll = () => {
    update((s) => { const { [ruleId]: _, ...rest } = s.ruleConfig; return { ruleConfig: rest }; });
    navigate(`/rules/${form.direction}`);
  };
  const saveDerived = (d) => {
    update((s) => {
      const list = s.derivedVars || [];
      const i = list.findIndex((x) => x.key === d.key && x.direction === d.direction);
      return { derivedVars: i >= 0 ? list.map((x, j) => (j === i ? d : x)) : [...list, d] };
    });
    setDerivedEdit(null);
  };
  const deleteDerived = (d) => {
    const used = derivedUsage(state, d);
    if (used.length) { setModeMsg(`doc.${d.key}-ը չի կարող ջնջվել. օգտագործվում է՝ ${used.join(', ')}`); return; }
    update((s) => ({ derivedVars: (s.derivedVars || []).filter((x) => !(x.key === d.key && x.direction === d.direction)) }));
  };
  const ex = BUILDER_EXAMPLES[form.direction];
  const known = new Map(groups.flatMap((g) => g.items.map((it) => [it.tok, it])));
  const describe = (tok) => known.get(tok) || null;

  if (editId && !kind) return <Alert severity="error">Կանոնը {editId} չի գտնվել</Alert>;

  return (
    <Box sx={{ maxWidth: 1100 }}>
      {!editable && <Alert severity="info" sx={{ mb: 2 }}>Կանոնները փոփոխում է կանոնների պատասխանատուն (NFR-02)։</Alert>}

      <Section title="Ընդհանուր տվյալներ">
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <TextField size="small" label="ID" value={ruleId} disabled={!!editId} onChange={(e) => setForm({ ...form, id: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} sx={{ width: 150 }} />
            <TextField size="small" select label="Ուղղություն (COM-02)" value={form.direction} disabled={!!editId} onChange={(e) => { setForm({ ...form, direction: e.target.value, expression: '' }); setTree(emptyTree()); }} sx={{ minWidth: 200 }}>
              {Object.entries(DIRECTIONS).map(([k, l]) => <MenuItem key={k} value={k}>{l}</MenuItem>)}
            </TextField>
            {form.direction === 'parties' && (
              <TextField size="small" select label="Մակարդակ" value={form.level} disabled={!!editId} onChange={(e) => setForm({ ...form, level: e.target.value })} sx={{ minWidth: 220 }}>
                {Object.entries(METRICS.parties.levels).map(([k, l]) => <MenuItem key={k} value={k}>{l}</MenuItem>)}
              </TextField>
            )}
            {isDecl && <TextField size="small" type="number" label="Քաշ" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} sx={{ width: 100 }} />}
            <FormControlLabel control={<Switch checked={!!form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />} label={form.enabled ? 'Միացված' : 'Անջատված'} />
          </Stack>
          <TextField size="small" label="Անվանում" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <TextField size="small" label="Չափորոշիչ (նկարագրություն)" multiline minRows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {builtin && (
            <Typography variant="body2" color="text.secondary">
              Աղբյուր՝ {eff.srsRef}{eff.requirements ? ` · պահանջներ՝ ${eff.requirements.join(', ')}` : ''}
              {builtin.criterion !== form.description && <><br /><b>Սկզբնական չափորոշիչ՝</b> {builtin.criterion}</>}
            </Typography>
          )}
        </Stack>
      </Section>

      <Section title="Պայման" actions={kind === 'builtin' && (
        <ToggleButtonGroup size="small" exclusive value={source} onChange={(e, v) => switchSource(v)}>
          <ToggleButton value="code" sx={{ px: 1.5, py: 0.25 }}>Կոդով (սկզբնական)</ToggleButton>
          <ToggleButton value="builder" sx={{ px: 1.5, py: 0.25 }}>Կառուցիչով</ToggleButton>
        </ToggleButtonGroup>
      )}>
        {hasCode && !byBuilder && (
          <Stack spacing={2}>
            <Alert severity="info">
              Պայմանը հաշվարկվում է կոդով իրականացված տրամաբանությամբ, որը տալիս է մանրամասն բացատրություն (արժեքներ, համեմատման աղյուսակներ)։ Այստեղ կարգավորվում են պարամետրերը (շեմեր, ցուցակներ)։
              {kind === 'builtin' && ' Պայմանն ինքնին փոխելու համար ընտրեք «Կառուցիչով»։'}
              {kind === 'copy' && ` Կրկնօրինակ է՝ ${builtin.id}-ի տրամաբանությամբ։`}
            </Alert>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Պարամետրեր</Typography>
              <ParamsEditor state={state} direction={builtin.direction} params={builtin.params || []} vals={vals} setVals={(v) => { setVals(v); setTest(null); }} />
            </Box>
            {builtin.builderExpression && (
              <Box>
                <Typography variant="subtitle2">Համարժեք պայման կառուցիչում (տեղեկատվական)</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>{builtin.builderExpression}</Typography>
              </Box>
            )}
            {builtin.caveats?.length > 0 && (
              <Box>
                <Typography variant="subtitle2">Նշումներ</Typography>
                {builtin.caveats.map((c, i) => <Typography key={i} variant="body2" color="warning.dark">• {c}</Typography>)}
              </Box>
            )}
          </Stack>
        )}
        {byBuilder && (
          <Stack spacing={2}>
            {kind === 'builtin' && (
              <Alert severity="warning">
                Կանոնը կհաշվարկվի ստորև նշված պայմանով։ Եթե պայմանը չփոխեք, արդյունքը և բացատրությունը կմնան նույնը։ Փոխված պայմանի դեպքում արդյունքը կորոշի նոր պայմանը, իսկ բացատրության մեջ կմնան սկզբնական հաշվարկի տվյալները (աղյուսակներ, արժեքներ)։ Շեմերը նշվում են պայմանում («Պարամետրեր» բաժինը չի կիրառվում)։ Սկզբնական հաշվարկին կարող եք վերադառնալ «Կոդով» ընտրելով։
                {!builtin.builderExpression && ' Այս կանոնի տրամաբանությունը կառուցիչի փոփոխականներով ամբողջությամբ չի արտահայտվում. պայմանը կազմեք ինքնուրույն։'}
              </Alert>
            )}
            <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <ToggleButtonGroup size="small" exclusive value={mode} onChange={(e, v) => switchMode(v)}>
                <ToggleButton value="tree" sx={{ px: 1.5, py: 0.25 }}>Տողերով</ToggleButton>
                <ToggleButton value="text" sx={{ px: 1.5, py: 0.25 }}>Տեքստով</ToggleButton>
              </ToggleButtonGroup>
              <Box sx={{ flex: 1 }} />
              {editable && <Button size="small" startIcon={<AddIcon />} onClick={() => setDerivedEdit({ initial: null })}>Նոր բարդ փոփոխական</Button>}
            </Stack>
            {modeMsg && <Alert severity="warning" onClose={() => setModeMsg(null)}>{modeMsg}</Alert>}
            {mode === 'tree' && tree && (
              <>
                <ConditionBuilder tree={tree} onChange={onTree} groups={groups} />
                <Typography variant="caption" color="text.secondary">
                  Ձախ կողմում ընտրեք փոփոխականը (որոնմամբ), աջում՝ փոփոխական, թիվ կամ բանաձև (օր.՝ 3 * doc.noncash_end)։ Բարդ հաշվարկի համար ստեղծեք «Նոր բարդ փոփոխական» և օգտագործեք այն պայմանում։
                  {treeIncomplete && <b> Լրացրեք բոլոր տողերը կամ հեռացրեք դատարկները։</b>}
                </Typography>
              </>
            )}
            {mode === 'text' && (
              <>
                <OperatorBar onPick={insert} />
                <ExpressionEditor ref={editorRef} label="Պայման (արտահայտություն)" value={form.expression} describe={describe} onChange={(expression) => { setForm((f) => ({ ...f, expression })); setTest(null); }}
                  error={!!parseError || unknown.length > 0}
                  helperText={parseError || (unknown.length ? `Անծանոթ՝ ${unknown.join(', ')}` : 'Ընտրեք փոփոխականը ներքևի ընտրիչից, գործողությունը՝ վերևի կոճակներից, կամ գրեք։ Բաղադրիչը ջնջվում է ամբողջությամբ, իսկ վրան սավառնելիս ցույց է տալիս անվանումը։')} />
                <VariablePicker groups={groups} onPick={insert} onCreateDerived={editable ? () => setDerivedEdit({ initial: null }) : null}
                  onEditDerived={editable ? (d) => setDerivedEdit({ initial: d }) : null} onDeleteDerived={editable ? deleteDerived : null} />
              </>
            )}
            {mode === 'tree' && unknown.length > 0 && <Alert severity="error">Անծանոթ բաղադրիչներ՝ {unknown.join(', ')}</Alert>}
            {deps && !parseError && (
              <Typography variant="caption" color="text.secondary">
                Օգտագործվում են՝ փաստաթղթի փոփոխականներ {deps.doc.size}, արտաքին տվյալներ {deps.ext.size}{deps.ext.size ? ` (${[...new Set([...deps.ext].map((k) => { const svc = M.ext.find((m) => m.key === k)?.service; return svc === 'penalties' ? 'Տույժեր (արտաքին ֆայլ)' : SERVICES[svc]?.short; }))].join(', ')}. հարցումը կկատարվի միայն այս կանոնի համար, COM-14)` : ''}, համակարգային փոփոխականներ {deps.var.size}, այլ կանոններ {deps.rule.size}
              </Typography>
            )}
            {ex && !editId && <Box><Button size="small" onClick={() => { setForm((f) => ({ ...f, title: f.title || ex.title, level: ex.level || f.level })); setExpression(ex.expression); }}>Լրացնել օրինակով</Button></Box>}
          </Stack>
        )}
      </Section>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Button variant="outlined" onClick={runTest} disabled={!conditionOk}>Փորձարկել բոլոր փաստաթղթերի վրա</Button>
        <Button variant="contained" onClick={save} disabled={!valid || !editable}>Պահպանել</Button>
        <Button onClick={() => navigate(`/rules/${form.direction}`)}>Չեղարկել</Button>
        <Box sx={{ flex: 1 }} />
        {kind === 'builtin' && editable && <Button color="warning" onClick={() => setConfirmReset(true)}>Վերականգնել սկզբնականը</Button>}
      </Stack>

      {test && (
        <Section title={`Փորձարկման արդյունք՝ աշխատել է ${test.filter((t) => t.r.status === 'fired').length} / ${test.length}`}>
          <SimpleTable dense rows={test} onRowClick={(t) => navigate(t.path)} columns={[
            { key: 'l', label: 'Փաստաթուղթ', render: (t) => t.label },
            { key: 's', label: 'Արդյունք', render: (t) => <Chip size="small" color={t.r.status === 'fired' ? 'error' : t.r.status === 'not_evaluated' ? 'warning' : 'default'} variant="outlined" label={{ fired: 'Աշխատել է', not_fired: 'Չի աշխատել', not_evaluated: 'Չի գնահատվել' }[t.r.status]} /> },
            { key: 'v', label: 'Արժեքներ', render: (t) => <Typography variant="caption">{t.r.status === 'not_evaluated' ? t.r.explanation : (t.r.values || []).map((v) => `${v.label.split(' — ')[1] || v.label} = ${typeof v.value === 'number' ? Math.round(v.value).toLocaleString('hy-AM') : v.value}`).join('; ')}</Typography> },
          ]} />
        </Section>
      )}
      {derivedEdit && (
        <DerivedVarDialog open initial={derivedEdit.initial} direction={form.direction} level={level} state={state}
          usedBy={derivedEdit.initial ? derivedUsage(state, derivedEdit.initial) : []} onClose={() => setDerivedEdit(null)} onSave={saveDerived} />
      )}
      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)}>
        <DialogTitle>Վերականգնել սկզբնականը</DialogTitle>
        <DialogContent><Typography>{ruleId}-ի անվանումը, չափորոշիչը, քաշը, պարամետրերը և պայմանը կվերադառնան սկզբնական արժեքներին։ Շարունակե՞լ։</Typography></DialogContent>
        <DialogActions><Button onClick={() => setConfirmReset(false)}>Ոչ</Button><Button color="warning" variant="contained" onClick={resetAll}>Այո</Button></DialogActions>
      </Dialog>
    </Box>
  );
}

export function NotImplementedList({ direction } = {}) {
  const rows = direction ? notImplementedRules.filter((r) => r.direction === direction) : notImplementedRules;
  return (
    <>
      <InfoNote severity="warning">Այս կանոնները չեն իրականացված, քանի որ անհրաժեշտ տվյալը բացակայում է կամ բանաձևը ճշտված չէ։ Բացակայող տվյալը կամ բանաձևը չի հորինվել։</InfoNote>
      <Section>
        <SimpleTable rows={rows} columns={[
          { key: 'id', label: 'ID' },
          { key: 't', label: 'Կանոն', render: (r) => <><Typography variant="body2" sx={{ fontWeight: 600 }}>{r.title}</Typography><Typography variant="caption" color="text.secondary">{r.srsRef}</Typography></> },
          ...(direction ? [] : [{ key: 'd', label: 'Ուղղություն', render: (r) => DIRECTIONS[r.direction] }]),
          { key: 'rt', label: 'Պատճառի տեսակ', render: (r) => <Chip size="small" variant="outlined" label={{ data: 'Բացակայող տվյալ', formula: 'Բանաձևը ճշտված չէ', scope: 'Կանոն չէ / AI' }[r.reasonType]} /> },
          { key: 'r', label: 'Պատճառ', render: (r) => <Typography variant="body2">{r.reason}</Typography> },
          { key: 'q', label: 'Բաց հարց', render: (r) => r.questions.join(', ') || '—' },
        ]} />
      </Section>
    </>
  );
}
