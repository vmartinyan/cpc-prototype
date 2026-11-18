import { useMemo, useState } from 'react';
import {
  Box, Button, Chip, Stack, Switch, Tab, Tabs, TextField, MenuItem, Typography, Alert, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Divider, Paper, Grid, FormControlLabel,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add';
import { useStore, can } from '../engine/store.js';
import { DIRECTIONS } from '../rules/common.js';
import { BUILTIN_RULES, MANUAL_RULES, notImplementedRules } from '../rules/catalog.js';
import { VARIABLE_DEFS, variableDefByKey } from '../engine/variables.js';
import { METRICS, BUILDER_EXAMPLES, directionTables } from '../engine/metrics.js';
import { parse, dependencies } from '../engine/expression.js';
import { evaluateAll } from '../engine/evaluator.js';
import { SERVICES } from '../adapters/transport.js';
import { PageHeader, Section, SimpleTable, InfoNote, navigate } from '../components/common.jsx';

const TABS = ['list', 'builder', 'library', 'notimpl'];

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

export default function RulesPage({ tab = 'list', editId }) {
  const idx = Math.max(0, TABS.indexOf(tab));
  return (
    <>
      <PageHeader title="Կանոններ" subtitle="Ռիսկի չափորոշիչների իրականացումը (կանոններ). յուրաքանչյուր կանոն պատկանում է մեկ ուղղության (COM-02)" />
      <Tabs value={idx} onChange={(e, v) => navigate(`/rules/${TABS[v]}`)} variant="scrollable" sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Կանոնների ցանկ" />
        <Tab label="Կառուցիչ (COM-01)" />
        <Tab label="Գրադարան (COM-06)" />
        <Tab label={`Չիրականացված (${notImplementedRules.length})`} />
      </Tabs>
      {idx === 0 && <RuleList />}
      {idx === 1 && <Builder editId={editId} />}
      {idx === 2 && <Library />}
      {idx === 3 && <NotImplementedList />}
    </>
  );
}

function bindingLabel(b) {
  if (!b) return 'սահմանված չէ';
  if (b.var) return `փոփոխական՝ ${variableDefByKey[b.var]?.label || b.var}`;
  return `արժեք՝ ${Array.isArray(b.value) ? b.value.join(', ') : b.value}`;
}

function RuleList() {
  const { state, update, results } = useStore();
  const [dir, setDir] = useState('');
  const [edit, setEdit] = useState(null);
  const editable = can(state.role, 'edit_rules');
  const stats = useMemo(() => ruleStats(results), [results]);
  const rules = results.rules.filter((r) => !dir || r.direction === dir);

  const setCfg = (id, patch) => update((s) => {
    const custom = s.customRules.find((c) => c.id === id);
    if (custom) return { customRules: s.customRules.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
    return { ruleConfig: { ...s.ruleConfig, [id]: { ...(s.ruleConfig[id] || {}), ...patch } } };
  });

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField size="small" select label="Ուղղություն" value={dir} onChange={(e) => setDir(e.target.value)} sx={{ minWidth: 220 }}>
          <MenuItem value="">Բոլորը</MenuItem>{Object.entries(DIRECTIONS).map(([k, l]) => <MenuItem key={k} value={k}>{l}</MenuItem>)}
        </TextField>
        {editable && <Button startIcon={<AddIcon />} variant="contained" onClick={() => navigate('/rules/builder')}>Նոր կանոն կառուցիչով</Button>}
      </Stack>
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
                  <Chip size="small" label={DIRECTIONS[r.direction]} />
                  {r.kind !== 'builtin' && <Chip size="small" color="info" variant="outlined" label={r.kind === 'copy' ? 'կրկնօրինակ' : 'կառուցիչ'} />}
                  {r.partial && <Chip size="small" color="warning" variant="outlined" label="մասնակի" />}
                  {r.external?.map((s) => <Chip key={s} size="small" variant="outlined" label={`արտաքին՝ ${SERVICES[s].short}`} />)}
                  {r.level && r.direction === 'parties' && <Chip size="small" variant="outlined" label={METRICS.parties.levels[r.level]} />}
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{r.criterion || r.description || r.expression}</Typography>
                {r.kind === 'expression' && <Typography variant="body2" sx={{ mt: 0.5, fontFamily: 'monospace' }}>{r.expression}</Typography>}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>Աղբյուր՝ {r.srsRef}{r.requirements ? ` · պահանջներ՝ ${r.requirements.join(', ')}` : ''}</Typography>
                {(r.params || []).length > 0 && r.kind !== 'expression' && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                    Պարամետրեր. {(r.params || []).map((p) => `${p.label} — ${bindingLabel(r.bindings[p.key])}`).join('; ')}
                  </Typography>
                )}
                {r.caveats?.map((c, i) => <Typography key={i} variant="caption" color="warning.dark" sx={{ display: 'block' }}>• {c}</Typography>)}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Արդյունքներ՝ աշխատել է {st.fired || 0}, չի աշխատել {st.not_fired || 0}, չի գնահատվել {st.not_evaluated || 0}{st.not_applicable ? `, կիրառելի չէ ${st.not_applicable}` : ''}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                {r.direction === 'declarations' && <TextField size="small" type="number" label="Քաշ" value={r.weight ?? ''} disabled={!editable} onChange={(e) => setCfg(r.id, { weight: Math.max(0, Math.min(100, Number(e.target.value))) })} sx={{ width: 90 }} />}
                {editable && (r.params || []).length > 0 && r.kind !== 'expression' && <Tooltip title="Պարամետրեր"><IconButton onClick={() => setEdit(r)}><EditOutlinedIcon /></IconButton></Tooltip>}
                {editable && r.kind === 'expression' && <Tooltip title="Խմբագրել"><IconButton onClick={() => navigate(`/rules/builder/${r.id}`)}><EditOutlinedIcon /></IconButton></Tooltip>}
                {editable && r.kind !== 'builtin' && <Tooltip title="Ջնջել"><IconButton onClick={() => update((s) => ({ customRules: s.customRules.filter((c) => c.id !== r.id) }))}><DeleteOutlineIcon /></IconButton></Tooltip>}
                <Tooltip title={r.enabled ? 'Միացված' : 'Անջատված'}><Switch checked={r.enabled} disabled={!editable} onChange={(e) => setCfg(r.id, { enabled: e.target.checked })} /></Tooltip>
              </Stack>
            </Stack>
          </Paper>
        );
      })}
      {(!dir || dir === 'declarations') && MANUAL_RULES.map((r) => (
        <Paper key={r.id} sx={{ p: 2, mb: 1.5 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 700 }}>{r.id}</Typography><Typography sx={{ fontWeight: 600 }}>{r.title}</Typography><Chip size="small" label={DIRECTIONS[r.direction]} /><Chip size="small" color="secondary" variant="outlined" label="ձեռքով" />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{r.criterion}. Առավելագույն քաշը՝ «Փոփոխականներ» էջում։</Typography>
          <Typography variant="caption" color="text.secondary">Աղբյուր՝ {r.srsRef}</Typography>
        </Paper>
      ))}
      <ParamDialog rule={edit} onClose={() => setEdit(null)} onSave={(params) => { setCfg(edit.id, { params }); setEdit(null); }} />
    </>
  );
}

function ParamDialog({ rule, onClose, onSave }) {
  const [vals, setVals] = useState({});
  const [lastId, setLastId] = useState(null);
  if (rule && rule.id !== lastId) { setLastId(rule.id); setVals({ ...rule.bindings }); }
  if (!rule) return null;
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{rule.id} — պարամետրեր</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Պարամետրը կարելի է կապել համակարգային փոփոխականի հետ (COM-03) կամ տալ ֆիքսված արժեք։</Typography>
        {rule.params.map((p) => {
          const b = vals[p.key];
          const mode = b?.var ? 'var' : b && b.value !== undefined ? 'value' : 'none';
          const varOptions = VARIABLE_DEFS.filter((v) => (p.kind === 'list' ? v.type === 'list' : v.type === 'number'));
          return (
            <Box key={p.key} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{p.label}{p.unit ? ` (${p.unit})` : ''}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField size="small" select value={mode} label="Աղբյուր" sx={{ minWidth: 160 }} onChange={(e) => setVals({ ...vals, [p.key]: e.target.value === 'var' ? { var: varOptions[0]?.key } : e.target.value === 'value' ? { value: p.kind === 'list' ? [] : 0 } : null })}>
                  <MenuItem value="var">Փոփոխական</MenuItem><MenuItem value="value">Ֆիքսված արժեք</MenuItem><MenuItem value="none">Սահմանված չէ</MenuItem>
                </TextField>
                {mode === 'var' && (
                  <TextField size="small" select fullWidth label="Փոփոխական" value={b.var} onChange={(e) => setVals({ ...vals, [p.key]: { var: e.target.value } })}>
                    {varOptions.map((v) => <MenuItem key={v.key} value={v.key}>{v.label}</MenuItem>)}
                  </TextField>
                )}
                {mode === 'value' && (p.kind === 'list'
                  ? <TextField size="small" fullWidth label="Արժեքներ (ստորակետով)" value={(b.value || []).join(', ')} onChange={(e) => setVals({ ...vals, [p.key]: { value: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })} />
                  : <TextField size="small" type="number" fullWidth label="Արժեք" value={b.value} onChange={(e) => setVals({ ...vals, [p.key]: { value: e.target.value === '' ? '' : Number(e.target.value) } })} />)}
              </Stack>
            </Box>
          );
        })}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Չեղարկել</Button><Button variant="contained" onClick={() => onSave(vals)}>Պահպանել</Button></DialogActions>
    </Dialog>
  );
}

// ───────────────────────── Կառուցիչ
function Builder({ editId }) {
  const { state, update, results } = useStore();
  const editing = state.customRules.find((c) => c.id === editId && c.kind === 'expression');
  const [form, setForm] = useState(() => editing || { id: '', direction: 'declarations', level: 'person', title: '', description: '', expression: '', weight: 10, enabled: true });
  const [test, setTest] = useState(null);
  const editable = can(state.role, 'edit_rules');
  const M = METRICS[form.direction];
  const level = form.direction === 'parties' ? form.level : null;

  let parseError = null;
  let deps = null;
  if (form.expression.trim()) {
    try { deps = dependencies(parse(form.expression)); } catch (e) { parseError = e.message; }
  }
  const unknown = [];
  if (deps) {
    for (const d of deps.doc) if (!M.doc.some((m) => m.key === d && (!level || !m.level || m.level === level))) unknown.push(`doc.${d}`);
    for (const d of deps.ext) if (!M.ext.some((m) => m.key === d && (!level || !m.level || m.level === level))) unknown.push(`ext.${d}`);
    for (const d of deps.var) if (!variableDefByKey[d]) unknown.push(`var.${d}`);
    for (const d of deps.rule) if (!results.rules.some((r) => r.id === d && r.direction === form.direction)) unknown.push(`rule.${d}`);
    for (const t of deps.tables) if (!directionTables[form.direction].includes(t)) unknown.push(t);
  }
  const ruleId = form.id || editing?.id || `${{ declarations: 'DEC', parties: 'PAR', gifts: 'GIF', integrity: 'INT' }[form.direction]}-C${String(state.customRules.length + 1).padStart(2, '0')}`;
  const valid = form.title.trim() && form.expression.trim() && !parseError && !unknown.length && (editing || !results.rules.some((r) => r.id === ruleId));
  const draft = { ...form, id: ruleId, kind: 'expression', level: level || undefined, weight: form.direction === 'declarations' ? Number(form.weight) || 0 : undefined };

  const insert = (tok) => setForm((f) => ({ ...f, expression: `${f.expression}${f.expression && !/\s$/.test(f.expression) ? ' ' : ''}${tok}` }));
  const runTest = () => {
    const R = evaluateAll({ ...state, customRules: [...state.customRules.filter((c) => c.id !== ruleId), draft] });
    const out = [];
    const take = (label, res, path) => { const r = res?.[ruleId]; if (r) out.push({ id: `${label}${out.length}`, label, r, path }); };
    if (form.direction === 'declarations') R.declarations.forEach((u) => (u.scopes || []).forEach((s) => take(`${u.profile.firstname} ${u.profile.lastname} ${u.year} — ${s.label}`, s.results, `/declarations/${u.id}`)));
    if (form.direction === 'gifts') R.gifts.forEach((u) => take(`${u.id} ${u.gift.description}`, u.results, `/gifts/${u.id}`));
    if (form.direction === 'parties') { R.parties.persons.forEach((u) => take(`${u.names.join('/')} ${u.year}`, u.results, `/parties/person/${encodeURIComponent(u.id)}`)); R.parties.reports.forEach((u) => take(`${u.party.name} ${u.year}`, u.results, `/parties/${u.id}`)); }
    if (form.direction === 'integrity') R.integrity.forEach((u) => take(`${u.profile.firstname} ${u.profile.lastname}`, u.results, `/integrity/${u.id}`));
    setTest(out);
  };
  const save = () => {
    update((s) => ({ customRules: editing ? s.customRules.map((c) => (c.id === editing.id ? draft : c)) : [...s.customRules, draft] }));
    navigate('/rules/list');
  };
  const ex = BUILDER_EXAMPLES[form.direction];
  const Palette = ({ title, items }) => items.length > 0 && (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary">{title}</Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
        {items.map((it) => <Tooltip key={it.tok} title={it.label}><Chip size="small" label={it.tok} onClick={() => insert(it.tok)} variant="outlined" color={it.color || 'default'} /></Tooltip>)}
      </Stack>
    </Box>
  );
  const lvl = (m) => !level || !m.level || m.level === level;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 7 }}>
        <Section title={editing ? `Խմբագրում՝ ${editing.id}` : 'Նոր կանոն'}>
          {!editable && <Alert severity="info" sx={{ mb: 2 }}>Կանոններ ստեղծում է կանոնների պատասխանատուն (NFR-02)։</Alert>}
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField size="small" select label="Ուղղություն (COM-02)" value={form.direction} disabled={!!editing} onChange={(e) => setForm({ ...form, direction: e.target.value, expression: '' })} sx={{ minWidth: 200 }}>
                {Object.entries(DIRECTIONS).map(([k, l]) => <MenuItem key={k} value={k}>{l}</MenuItem>)}
              </TextField>
              {form.direction === 'parties' && (
                <TextField size="small" select label="Մակարդակ" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} sx={{ minWidth: 220 }}>
                  {Object.entries(METRICS.parties.levels).map(([k, l]) => <MenuItem key={k} value={k}>{l}</MenuItem>)}
                </TextField>
              )}
              <TextField size="small" label="ID" value={ruleId} disabled={!!editing} onChange={(e) => setForm({ ...form, id: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} sx={{ width: 140 }} />
              {form.direction === 'declarations' && <TextField size="small" type="number" label="Քաշ" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} sx={{ width: 100 }} />}
            </Stack>
            <TextField size="small" label="Անվանում" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <TextField size="small" label="Նկարագրություն" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <TextField label="Պայման (արտահայտություն)" multiline minRows={3} value={form.expression} onChange={(e) => setForm({ ...form, expression: e.target.value })}
              error={!!parseError || unknown.length > 0} helperText={parseError || (unknown.length ? `Անծանոթ՝ ${unknown.join(', ')}` : 'Օրինակ (COM-04). doc.cash_end + 12 * ext.pek_income_year < var.cash_threshold')}
              slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }} />
            {deps && !parseError && (
              <Typography variant="caption" color="text.secondary">
                Օգտագործվում են՝ փաստաթղթի դաշտեր {deps.doc.size + deps.tables.size}, արտաքին տվյալներ {deps.ext.size}{deps.ext.size ? ` (${[...deps.ext].map((k) => SERVICES[M.ext.find((m) => m.key === k)?.service]?.short).join(', ')}. հարցումը կկատարվի միայն այս կանոնի համար, COM-14)` : ''}, համակարգային փոփոխականներ {deps.var.size}, այլ կանոններ {deps.rule.size}
              </Typography>
            )}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Button variant="outlined" onClick={runTest} disabled={!form.expression.trim() || !!parseError || unknown.length > 0}>Փորձարկել բոլոր փաստաթղթերի վրա</Button>
              <Button variant="contained" onClick={save} disabled={!valid || !editable}>Պահպանել</Button>
              {ex && !editing && <Button onClick={() => setForm({ ...form, title: ex.title, expression: ex.expression, level: ex.level || form.level })}>Լրացնել օրինակով</Button>}
            </Stack>
          </Stack>
        </Section>
        {test && (
          <Section title={`Փորձարկման արդյունք՝ աշխատել է ${test.filter((t) => t.r.status === 'fired').length} / ${test.length}`}>
            <SimpleTable dense rows={test} onRowClick={(t) => navigate(t.path)} columns={[
              { key: 'l', label: 'Փաստաթուղթ', render: (t) => t.label },
              { key: 's', label: 'Արդյունք', render: (t) => <Chip size="small" color={t.r.status === 'fired' ? 'error' : t.r.status === 'not_evaluated' ? 'warning' : 'default'} variant="outlined" label={{ fired: 'Աշխատել է', not_fired: 'Չի աշխատել', not_evaluated: 'Չի գնահատվել', not_applicable: 'Կիրառելի չէ' }[t.r.status]} /> },
              { key: 'v', label: 'Արժեքներ', render: (t) => <Typography variant="caption">{t.r.status === 'not_evaluated' ? t.r.explanation : t.r.values.map((v) => `${v.label.split(' — ')[0]} = ${typeof v.value === 'number' ? Math.round(v.value).toLocaleString('hy-AM') : v.value}`).join('; ')}</Typography> },
            ]} />
          </Section>
        )}
      </Grid>
      <Grid size={{ xs: 12, lg: 5 }}>
        <Section title="Փոփոխականներ (սեղմեք՝ ավելացնելու համար)">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Չորս տեսակ (բաժին 3). (1) փաստաթղթի դաշտ, (2) արտաքին տվյալ, (3) համակարգային փոփոխական, (4) այլ կանոնի արդյունք։ Գործողություններ՝ + − * / &lt; &lt;= &gt; &gt;= == != and or not (ԵՎ ԿԱՄ ՈՉ)։
          </Typography>
          <Palette title="(1) Փաստաթղթի դաշտեր և ագրեգատներ" items={M.doc.filter(lvl).map((m) => ({ tok: `doc.${m.key}`, label: m.label }))} />
          <Palette title="(1) Ագրեգատներ EPD աղյուսակների վրա (COM-04)" items={directionTables[form.direction].flatMap((t) => [{ tok: `count(${t})`, label: `Տողերի քանակ՝ ${t}` }])} />
          <Palette title="(2) Արտաքին տվյալներ (mock, 11.5)" items={M.ext.filter(lvl).map((m) => ({ tok: `ext.${m.key}`, label: m.label, color: 'info' }))} />
          <Palette title="(3) Համակարգային փոփոխականներ (բաժին 9)" items={VARIABLE_DEFS.filter((v) => v.type === 'number').map((v) => ({ tok: `var.${v.key}`, label: v.label, color: 'secondary' }))} />
          <Palette title="(4) Այլ կանոնների արդյունքներ (COM-05)" items={results.rules.filter((r) => r.direction === form.direction && r.id !== ruleId && (!level || (r.level || 'person') === level)).map((r) => ({ tok: `rule.${r.id}`, label: r.title, color: 'error' }))} />
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" color="text.secondary">
            sum(աղյուսակ.դաշտ), min, max, avg — օր.՝ sum(de_financialmeanscash.amountatendofyear_amd). «_amd» վերջավորությունը փոխարկում է դրամի պահված փոխարժեքով։
          </Typography>
        </Section>
      </Grid>
    </Grid>
  );
}

// ───────────────────────── Գրադարան
function Library() {
  const { state, update } = useStore();
  const editable = can(state.role, 'edit_rules');
  const copy = (r) => {
    const n = state.customRules.filter((c) => c.base === r.id).length + 1;
    update((s) => ({ customRules: [...s.customRules, { id: `${r.id}-K${n}`, kind: 'copy', base: r.id, title: `${r.title} (կրկնօրինակ ${n})`, enabled: true, params: {} }] }));
    navigate('/rules/list');
  };
  return (
    <>
      <InfoNote>Ռիսկի չափորոշիչների գրադարան. SRS-ի կատալոգներից իրականացված պատրաստի կանոններ։ Կանոնը կարելի է կրկնօրինակել և կարգավորել այլ պարամետրերով (օր.՝ այլ շեմով)։</InfoNote>
      <Section>
        <SimpleTable rows={BUILTIN_RULES} columns={[
          { key: 'id', label: 'ID' },
          { key: 'title', label: 'Կանոն', render: (r) => <><Typography variant="body2" sx={{ fontWeight: 600 }}>{r.title}</Typography><Typography variant="caption" color="text.secondary">{r.srsRef}</Typography></> },
          { key: 'd', label: 'Ուղղություն', render: (r) => DIRECTIONS[r.direction] },
          { key: 'p', label: 'Պարամետրեր', render: (r) => (r.params || []).map((p) => p.label).join(', ') || '—' },
          { key: 'a', label: '', render: (r) => editable && (r.params || []).length > 0 && <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => copy(r)}>Կրկնօրինակել</Button> },
        ]} />
      </Section>
    </>
  );
}

export function NotImplementedList() {
  return (
    <>
      <InfoNote severity="warning">Այս կանոնները չեն իրականացված, քանի որ անհրաժեշտ տվյալը բացակայում է կամ բանաձևը ճշտված չէ։ Բացակայող տվյալը կամ բանաձևը չի հորինվել։</InfoNote>
      <Section>
        <SimpleTable rows={notImplementedRules} columns={[
          { key: 'id', label: 'ID' },
          { key: 't', label: 'Կանոն', render: (r) => <><Typography variant="body2" sx={{ fontWeight: 600 }}>{r.title}</Typography><Typography variant="caption" color="text.secondary">{r.srsRef}</Typography></> },
          { key: 'd', label: 'Ուղղություն', render: (r) => DIRECTIONS[r.direction] },
          { key: 'rt', label: 'Պատճառի տեսակ', render: (r) => <Chip size="small" variant="outlined" label={{ data: 'Բացակայող տվյալ', formula: 'Բանաձևը ճշտված չէ', scope: 'Կանոն չէ / AI' }[r.reasonType]} /> },
          { key: 'r', label: 'Պատճառ', render: (r) => <Typography variant="body2">{r.reason}</Typography> },
          { key: 'q', label: 'Բաց հարց', render: (r) => r.questions.join(', ') || '—' },
        ]} />
      </Section>
    </>
  );
}
