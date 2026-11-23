import { useState } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Link, MenuItem, Stack, Tab, Tabs, TextField, Tooltip, Typography, Alert, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useStore, can } from '../engine/store.js';
import { VARIABLE_DEFS, DEMO_VALUES, variableValue, allVariableDefs, varDirections, variableDefByKey, hiddenCodeVariables } from '../engine/variables.js';
import { variableImpact } from '../engine/variableUsage.js';
import { DIRECTIONS } from '../rules/common.js';
import { PageHeader, Section, InfoNote, fmtDate, fmtNum, navigate } from '../components/common.jsx';
import { METRICS } from '../engine/metrics.js';
import { DEFAULT_FORMULAS, effectiveFormulas } from '../engine/annualExpense.js';
import { DerivedVarDialog, derivedUsage } from '../components/BuilderParts.jsx';
import AddIcon from '@mui/icons-material/Add';

const SHORT_DIR = { declarations: 'Հայտարարագրեր', parties: 'Կուսակցություններ', gifts: 'Նվերներ', integrity: 'Բարեվարքություն' };
/** Օգտագործում՝ ուղղությամբ (մի քանի ուղղության փոփոխականի դեպքում). «DEC-R6 (Հայտարարագրեր)» */
const impactText = (impact, def) => (varDirections(def).length > 1 ? impact.map((x) => `${x.id} (${SHORT_DIR[x.direction]})`) : impact.map((x) => x.id));
const show = (v, def) => (v === null || v === undefined ? <Chip size="small" color="warning" variant="outlined" label="սահմանված չէ" /> : Array.isArray(v) ? v.map((x) => `«${x}»`).join(', ') : `${fmtNum(v)}${def.unit ? ` ${def.unit}` : ''}`);

/** Ներդիրներ՝ ուղղություններ և «Ընդհանուր» (մի քանի ուղղության փոփոխականներ). #/variables/<ներդիր> */
const TABS = [...Object.keys(DIRECTIONS), 'common'];

export default function VariablesPage({ tab: tabParam }) {
  const tab = TABS.includes(tabParam) ? tabParam : 'declarations';
  const { state, update } = useStore();
  const [edit, setEdit] = useState(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [defEdit, setDefEdit] = useState(null); // { initial, directions } | null՝ մասնագետի ստեղծած փոփոխականի բնութագրեր
  const [msg, setMsg] = useState(null);
  const editable = can(state.role, 'edit_variables');
  const today = new Date().toISOString().slice(0, 10);
  const history = (def) => state.variables[def.key] ?? def.history;
  const saveDef = (d, initialValue) => {
    if (variableDefByKey[d.key]) {
      // նախասահմանված փոփոխական. պահվում են միայն փոխված բնութագրերը
      update((s) => ({ variableDefOverrides: { ...(s.variableDefOverrides || {}), [d.key]: { label: d.label, unit: d.unit, note: d.note, directions: d.directions, direction: d.directions[0] } } }));
      setDefEdit(null);
      return;
    }
    update((s) => {
      const list = s.customVariableDefs || [];
      const i = list.findIndex((x) => x.key === d.key);
      return {
        customVariableDefs: i >= 0 ? list.map((x, j) => (j === i ? d : x)) : [...list, d],
        ...(initialValue ? { variables: { ...s.variables, [d.key]: [initialValue] } } : {}),
      };
    });
    setDefEdit(null);
  };
  const removeDef = (d) => {
    const used = variableImpact(state, d.key).map((x) => x.id);
    if (used.length) { setMsg(`var.${d.key}-ը չի կարող ջնջվել. օգտագործվում է՝ ${used.join(', ')}`); return; }
    if (variableDefByKey[d.key]) { update((s) => ({ variableDefOverrides: { ...(s.variableDefOverrides || {}), [d.key]: { ...(s.variableDefOverrides?.[d.key] || {}), hidden: true } } })); return; }
    update((s) => { const { [d.key]: _, ...vars } = s.variables; return { customVariableDefs: (s.customVariableDefs || []).filter((x) => x.key !== d.key), variables: vars }; });
  };
  const restoreDef = (key) => {
    // սկզբնական ուղղությունները չպետք է բացառեն այն ուղղությունը, որտեղ փոփոխականն արդեն օգտագործվում է
    const orig = varDirections(variableDefByKey[key]);
    const conflict = variableImpact(state, key).filter((x) => !orig.includes(x.direction));
    if (conflict.length) { setMsg(`var.${key}-ի սկզբնական ուղղություններին վերադառնալ հնարավոր չէ. օգտագործվում է՝ ${conflict.map((x) => x.id).join(', ')}`); setDefEdit(null); return; }
    update((s) => { const { [key]: _, ...rest } = s.variableDefOverrides || {}; return { variableDefOverrides: rest }; });
    setDefEdit(null);
  };

  const applyDemo = () => {
    update((s) => ({
      demoApplied: true,
      variables: { ...s.variables, ...Object.fromEntries(Object.entries(DEMO_VALUES.variables).map(([k, v]) => [k, v.history])) },
      ruleConfig: { ...s.ruleConfig, ...Object.fromEntries(Object.entries(DEMO_VALUES.ruleParams).filter(([k]) => k !== 'why').map(([id, p]) => [id, { ...(s.ruleConfig[id] || {}), params: { ...(s.ruleConfig[id]?.params || {}), ...Object.fromEntries(Object.entries(p).map(([k, val]) => [k, { value: val }])) } }])) },
    }));
    setDemoOpen(false);
  };

  return (
    <>
      <PageHeader title="Մոդուլի փոփոխականներ" subtitle="SRS բաժին 9. համակարգային փոփոխականներ (կանոնի 3-րդ տեսակի փոփոխական). ունեն գործողության սկզբի ամսաթիվ (COM-03)"
        actions={editable && <Button variant="outlined" color="warning" onClick={() => setDemoOpen(true)}>Լրացնել ցուցադրական արժեքներ…</Button>} />
      <InfoNote>
        Արժեքները վերցված են SRS-ից և օրինակ են։ Այն փոփոխականները, որոնց արժեքը SRS-ում տրված չէ («ԿԿՀ-ից», «Արժեքը սահմանված չէ»), թողնված են դատարկ. դրանցից կախված կանոնները «չի գնահատվել» կարգավիճակում են։ Կենսաապահովման նվազագույն բյուջեն նախասահմանված է նվազագույն սպառողական զամբյուղի արժեքներով (Q-47(բ))։
        {state.demoApplied && ' Ներկա պահին կիրառված են ցուցադրական արժեքներ (տես ստորև)։'}
      </InfoNote>
      {!editable && <InfoNote severity="warning">Փոփոխականները սահմանում և թարմացնում է կանոնների պատասխանատուն (COM-03, NFR-02)։</InfoNote>}
      {msg && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg}</Alert>}
      {(() => {
        const all = allVariableDefs(state);
        const shared = all.filter((d) => varDirections(d).length > 1);
        const VarTable = ({ defs }) => (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead><TableRow><TableCell>Փոփոխական</TableCell><TableCell>Ընթացիկ արժեք</TableCell><TableCell>Պատմություն</TableCell><TableCell>Օգտագործում</TableCell><TableCell /></TableRow></TableHead>
              <TableBody>
                {defs.map((def) => {
                  const h = history(def);
                  const impact = variableImpact(state, def.key);
                  const used = impactText(impact, def);
                  const dirs = varDirections(def);
                  return (
                    <TableRow key={def.key}>
                      <TableCell sx={{ minWidth: 240 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{def.label}{def.overridden && <Chip size="small" label="բնութագրերը փոխված են" variant="outlined" sx={{ ml: 1, height: 18 }} />}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>var.{def.key}</Typography>
                        {dirs.length > 1 && <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>{dirs.map((d) => <Chip key={d} size="small" label={SHORT_DIR[d]} />)}</Stack>}
                        {def.note && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{def.note}</Typography>}
                      </TableCell>
                      <TableCell>{show(variableValue(state.variables, def.key, today), def)}</TableCell>
                      <TableCell><Typography variant="caption">{h.length ? [...h].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)).slice(0, 4).map((x) => `${fmtDate(x.effectiveFrom)}-ից՝ ${Array.isArray(x.value) ? `${x.value.length} բառ` : fmtNum(x.value)}`).join('; ') + (h.length > 4 ? ` … (${h.length})` : '') : '—'}</Typography></TableCell>
                      <TableCell><Typography variant="caption">{used.join(', ') || '—'}</Typography></TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {editable && <Tooltip title="Թարմացնել արժեքը"><IconButton size="small" onClick={() => setEdit({ def, impact })}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>}
                        {editable && <Tooltip title="Խմբագրել բնութագրերը (անվանում, ուղղություններ, միավոր, նկարագրություն)"><IconButton size="small" onClick={() => setDefEdit({ initial: def.custom ? (state.customVariableDefs || []).find((x) => x.key === def.key) : def })}><TuneIcon fontSize="small" /></IconButton></Tooltip>}
                        {editable && <Tooltip title={impact.length ? 'Օգտագործվում է. չի կարող ջնջվել' : def.custom ? 'Ջնջել' : 'Հեռացնել (կարելի է վերականգնել)'}><span><IconButton size="small" disabled={!!impact.length} onClick={() => removeDef(def)}><DeleteOutlineIcon fontSize="small" /></IconButton></span></Tooltip>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        );
        const hidden = hiddenCodeVariables(state).filter((d) => (tab === 'common' ? varDirections(d).length > 1 : varDirections(d).length === 1 && varDirections(d)[0] === tab));
        const hiddenNote = hidden.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Հեռացված նախասահմանված փոփոխականներ՝ {hidden.map((d, i) => <span key={d.key}>{i ? ', ' : ''}{d.label}{editable && <> (<Link component="button" variant="body2" onClick={() => restoreDef(d.key)}>վերականգնել</Link>)</>}</span>)}
          </Typography>
        );
        const newBtn = (directions) => editable && <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setDefEdit({ initial: null, directions })}>Նոր համակարգային փոփոխական</Button>;
        if (tab === 'common') return (
          <>
            <TabBar tab={tab} labels={{ ...DIRECTIONS, common: 'Ընդհանուր' }} />
            <Section title="Ընդհանուր (մի քանի ուղղության) փոփոխականներ" actions={newBtn([])}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Այս փոփոխականներն ունեն մեկ արժեք, որը կիրառվում է նշված բոլոր ուղղությունների կանոններում։ Արժեքի փոփոխությունը կազդի բոլոր այդ կանոնների վրա։ Բարդ փոփոխականները վերաբերում են մեկ ուղղության (դրանց բանաձևը կազմված է այդ ուղղության փաստաթղթի դաշտերից)։</Typography>
              {shared.length ? <VarTable defs={shared} /> : <Typography color="text.secondary">Ընդհանուր փոփոխականներ չկան։</Typography>}
              {hiddenNote}
            </Section>
          </>
        );
        const defs = all.filter((d) => varDirections(d).length === 1 && varDirections(d)[0] === tab);
        const sharedHere = shared.filter((d) => varDirections(d).includes(tab));
        return (
          <>
            <TabBar tab={tab} labels={{ ...DIRECTIONS, common: 'Ընդհանուր' }} />
            <Section title="Սահմանվող (համակարգային) փոփոխականներ" actions={newBtn([tab])}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Ֆիքսված արժեքներ (շեմեր, գործակիցներ, բառերի ցանկեր)՝ գործողության սկզբի ամսաթվով։ Կանոնը օգտագործում է փաստաթղթի հաշվետու ամսաթվին գործող արժեքը. կանոններում՝ var.&lt;նշան&gt;։</Typography>
              {defs.length ? <VarTable defs={defs} /> : <Typography color="text.secondary">Փոփոխականներ չկան։</Typography>}
              {hiddenNote}
              {sharedHere.length > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                  Այս ուղղությանը վերաբերում են նաև ընդհանուր փոփոխականներ՝ {sharedHere.map((d) => d.label).join(', ')} (<Link component="button" variant="body2" onClick={() => navigate('/variables/common')}>տես «Ընդհանուր»</Link>)։
                </Typography>
              )}
            </Section>
            <DerivedVarsSection key={tab} direction={tab} />
          </>
        );
      })()}
      {defEdit && <CustomVarDialog initial={defEdit.initial} defaultDirections={defEdit.directions} state={state} onClose={() => setDefEdit(null)} onSave={saveDef} onRestore={restoreDef} />}
      <EditDialog def={edit?.def} impact={edit?.impact || []} history={edit ? history(edit.def) : []} onClose={() => setEdit(null)} onSave={(h) => { update((s) => ({ variables: { ...s.variables, [edit.def.key]: h } })); setEdit(null); }} />
      <Dialog open={demoOpen} onClose={() => setDemoOpen(false)} maxWidth="sm">
        <DialogTitle>Ցուցադրական արժեքներ</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>Այս արժեքները SRS-ում սահմանված չեն և կիրառվում են միայն ցուցադրման նպատակով, որպեսզի համապատասխան կանոնները գնահատվեն։ ԿԿՀ-ի վերջնական արժեքներով փոխարինելու կարիք ունեն։</Alert>
          <Typography variant="subtitle2">Նվերի անսովոր արժեքի բազմապատկիչ (GIF-R4)</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>5. {DEMO_VALUES.variables.gift_unusual_mult.why}</Typography>
          <Typography variant="subtitle2">Համեմատվող տարիների քանակ (INT-R2, INT-R3, INT-R4)</Typography>
          <Typography variant="body2">3. {DEMO_VALUES.ruleParams.why}</Typography>
        </DialogContent>
        <DialogActions><Button onClick={() => setDemoOpen(false)}>Չեղարկել</Button><Button variant="contained" color="warning" onClick={applyDemo}>Կիրառել</Button></DialogActions>
      </Dialog>
    </>
  );
}

function EditDialog({ def, history, impact = [], onClose, onSave }) {
  const [rows, setRows] = useState([]);
  const [key, setKey] = useState(null);
  const [val, setVal] = useState('');
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  if (def && def.key !== key) { setKey(def.key); setRows([...history]); setVal(''); }
  if (!def) return null;
  const isList = def.type === 'list';
  const add = () => {
    const value = isList ? val.split(',').map((s) => s.trim()).filter(Boolean) : Number(val);
    setRows([...rows.filter((r) => r.effectiveFrom !== from), { value, effectiveFrom: from }].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)));
    setVal('');
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{def.label}</DialogTitle>
      <DialogContent>
        {impact.length > 0 && (
          <Alert severity={new Set(impact.map((x) => x.direction)).size > 1 ? 'warning' : 'info'} sx={{ mb: 2 }}>
            Արժեքի փոփոխությունը կազդի՝ {impact.map((x) => `${x.id} (${SHORT_DIR[x.direction]})`).join(', ')}։ Հայտարարագրերը կնշվեն «պահանջվում է վերագնահատում»։
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Կանոնը օգտագործում է փաստաթղթի հաշվետու ամսաթվին գործող արժեքը։ Նոր արժեքն ավելացվում է գործողության սկզբի ամսաթվով։</Typography>
        {rows.map((r, i) => (
          <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" sx={{ width: 120 }}>{fmtDate(r.effectiveFrom)}-ից</Typography>
            <Typography variant="body2" sx={{ flex: 1 }}>{Array.isArray(r.value) ? r.value.join(', ') : fmtNum(r.value)}</Typography>
            <IconButton size="small" onClick={() => setRows(rows.filter((_, j) => j !== i))}><DeleteOutlineIcon fontSize="small" /></IconButton>
          </Stack>
        ))}
        {!rows.length && <Typography color="text.secondary" sx={{ mb: 1 }}>Արժեք չկա</Typography>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
          <TextField size="small" type="date" label="Գործում է" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: '1 1 0', minWidth: 0 }} />
          <TextField size="small" type={isList ? 'text' : 'number'} label={isList ? 'Բառեր (ստորակետով)' : `Արժեք${def.unit ? ` (${def.unit})` : ''}`} value={val} onChange={(e) => setVal(e.target.value)} sx={{ flex: '1 1 0', minWidth: 0 }} />
          <Button onClick={add} disabled={!val || !from} sx={{ flexShrink: 0 }}>Ավելացնել</Button>
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Չեղարկել</Button><Button variant="contained" onClick={() => onSave(rows)}>Պահպանել</Button></DialogActions>
    </Dialog>
  );
}

/**
 * Մասնագետի սահմանած բարդ փոփոխականներ (COM-01, COM-04). բանաձև պարզ, բարդ, արտաքին և համակարգային փոփոխականներից.
 * կանոններում՝ doc.<նշան>
 */
function DerivedVarsSection({ direction }) {
  const { state, update } = useStore();
  const [edit, setEdit] = useState(null); // { initial } | null
  const [msg, setMsg] = useState(null);
  const editable = can(state.role, 'edit_rules');
  const formulas = effectiveFormulas(state);
  // 4.1-ի նախասահմանված բանաձևերը (խմբագրելի, չեն ջնջվում) + մասնագետի սահմանածները
  const predefined = METRICS[direction].doc.filter((m) => m.editableFormula).map((m) => ({ key: m.key, label: m.label, expression: formulas[m.key], direction, predefined: true, overridden: !!state.formulaOverrides?.[m.key] }));
  const list = [...predefined, ...(state.derivedVars || []).filter((d) => d.direction === direction)];
  const codeDefined = METRICS[direction].doc.filter((m) => m.kind !== 'simple' && !m.editableFormula);
  const save = (d) => {
    if (DEFAULT_FORMULAS[d.key] && d.direction === 'declarations') {
      update((s) => ({ formulaOverrides: { ...(s.formulaOverrides || {}), [d.key]: { expression: d.expression } } }));
      setEdit(null);
      return;
    }
    update((s) => {
      const cur = s.derivedVars || [];
      const i = cur.findIndex((x) => x.key === d.key && x.direction === d.direction);
      return { derivedVars: i >= 0 ? cur.map((x, j) => (j === i ? d : x)) : [...cur, d] };
    });
    setEdit(null);
  };
  const remove = (d) => {
    const used = derivedUsage(state, d);
    if (used.length) { setMsg(`doc.${d.key}-ը չի կարող ջնջվել. օգտագործվում է՝ ${used.join(', ')}`); return; }
    update((s) => ({ derivedVars: (s.derivedVars || []).filter((x) => !(x.key === d.key && x.direction === d.direction)) }));
  };
  const restore = (key) => { update((s) => { const { [key]: _, ...rest } = s.formulaOverrides || {}; return { formulaOverrides: rest }; }); setEdit(null); };
  return (
    <Section title="Բարդ փոփոխականներ" actions={editable && <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setEdit({ initial: null })}>Նոր բարդ փոփոխական</Button>}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Հաշվարկվում են բանաձևով՝ փաստաթղթի պարզ և բարդ, արտաքին և համակարգային փոփոխականներից։ Կանոնների կառուցիչում հասանելի են «Բարդ» խմբում (doc.&lt;նշան&gt;)։ Ստեղծվում են նաև կառուցիչից։
        {direction === 'declarations' && ' Ընթացիկ ծախսի հաշվարկի բանաձևերի (Դս, Դվ, Գ, Փս, Փվ, ԸՏԾ, ՄԱԾ, ...) փոփոխությունը կիրառվում է ամենուր՝ DEC-R1, DEC-R6, «Ընթացիկ ծախսի հաշվարկ» և «Ամփոփում՝ ըստ տարիների» ներդիրներ, կառուցիչ։'}
      </Typography>
      {msg && <Alert severity="warning" sx={{ mb: 1.5 }} onClose={() => setMsg(null)}>{msg}</Alert>}
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Բանաձևով (խմբագրելի) ({list.length})</Typography>
      {!list.length ? <Typography color="text.secondary" sx={{ mb: 2 }}>Դեռ չկան։</Typography> : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Փոփոխական</TableCell><TableCell>Բանաձև</TableCell><TableCell>Օգտագործվում է</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {list.map((d) => {
                const used = [...(d.predefined ? ['Ընթացիկ ծախսի հաշվարկ'] : []), ...derivedUsage(state, d)];
                return (
                  <TableRow key={`${d.direction}:${d.key}`}>
                    <TableCell sx={{ minWidth: 220 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{d.label}{d.overridden && <Chip size="small" label="բանաձևը փոխված է" variant="outlined" color="warning" sx={{ ml: 1, height: 18 }} />}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>doc.{d.key}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{d.expression}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{used.join(', ') || '—'}</Typography></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {editable && <Tooltip title="Խմբագրել"><IconButton size="small" onClick={() => setEdit({ initial: d })}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>}
                      {editable && <Tooltip title={d.predefined ? 'Ընթացիկ ծախսի հաշվարկի բանաձև. չի ջնջվում (կարելի է վերականգնել սկզբնականը)' : used.length ? 'Օգտագործվում է կանոններում' : 'Ջնջել'}><span><IconButton size="small" disabled={d.predefined || !!used.length} onClick={() => remove(d)}><DeleteOutlineIcon fontSize="small" /></IconButton></span></Tooltip>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>Հաշվարկվում են կոդով ({codeDefined.length}). տեղեկատվական</Typography>
      <Box sx={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow><TableCell>Փոփոխական</TableCell><TableCell>Հաշվարկ</TableCell></TableRow></TableHead>
          <TableBody>
            {codeDefined.map((m) => (
              <TableRow key={m.key}>
                <TableCell sx={{ minWidth: 220 }}>
                  <Typography variant="body2">{m.label}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>doc.{m.key}</Typography>
                  {m.level && direction === 'parties' && <Chip size="small" label={METRICS.parties.levels[m.level]} sx={{ ml: 1, height: 18 }} />}
                </TableCell>
                <TableCell><Typography variant="caption">հաշվարկվում է կոդով (մի քանի տողից կամ փաստաթղթից)</Typography></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      {edit && <DerivedVarDialog open initial={edit.initial} direction={edit.initial?.direction || direction} level={edit.initial?.level} state={state} usedBy={edit.initial ? derivedUsage(state, edit.initial) : []} onClose={() => setEdit(null)} onSave={save} onRestore={restore} />}
    </Section>
  );
}

function TabBar({ tab, labels }) {
  return (
    <Tabs value={tab} onChange={(e, v) => navigate(`/variables/${v}`)} variant="scrollable" sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
      {TABS.map((t) => <Tab key={t} value={t} label={labels[t]} />)}
    </Tabs>
  );
}

const VAR_KEY_RE = /^[a-z][a-z0-9_]{1,40}$/;

/**
 * Մասնագետի ստեղծած համակարգային փոփոխական (COM-03)։ Նոր փոփոխականի համար՝ նաև առաջին արժեքը և գործողության սկիզբը.
 * հետագա արժեքները՝ «Թարմացնել արժեքը»-ով։ Նշանը, ուղղությունը և տեսակը ստեղծելուց հետո չեն փոխվում
 */
function CustomVarDialog({ initial, defaultDirections, state, onClose, onSave, onRestore }) {
  const editing = !!initial;
  const code = editing && !!variableDefByKey[initial.key]; // նախասահմանված (կոդով սահմանված) փոփոխական
  const [f, setF] = useState(() => (initial ? { ...initial, directions: varDirections(initial) } : { key: '', label: '', directions: defaultDirections || ['declarations'], type: 'number', unit: '', note: '' }));
  // ուղղությունը, որտեղ փոփոխականն արդեն օգտագործվում է, չի կարող հանվել
  const lockedDirs = new Set(editing ? variableImpact(state, initial.key).map((x) => x.direction) : []);
  const toggleDir = (d) => setF((x) => ({ ...x, directions: x.directions.includes(d) ? x.directions.filter((y) => y !== d) : Object.keys(DIRECTIONS).filter((y) => y === d || x.directions.includes(y)) }));
  const [val, setVal] = useState('');
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const taken = !editing && f.key && allVariableDefs(state).some((d) => d.key === f.key);
  const keyErr = !editing && f.key && (!VAR_KEY_RE.test(f.key) ? 'Լատինատառ փոքրատառեր, թվեր և «_», սկսվում է տառով' : taken ? 'Այս նշանն արդեն զբաղված է' : null);
  const isList = f.type === 'list';
  const value = isList ? val.split(',').map((x) => x.trim()).filter(Boolean) : val === '' ? null : Number(val);
  const valErr = !editing && val !== '' && !isList && Number.isNaN(value);
  const valid = f.label.trim() && VAR_KEY_RE.test(f.key) && !keyErr && !valErr && f.directions.length > 0;
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? `Համակարգային փոփոխական՝ var.${initial.key}` : 'Նոր համակարգային փոփոխական'}</DialogTitle>
      {code && <Alert severity="info" sx={{ mx: 3 }}>Նախասահմանված փոփոխական{variableDefByKey[initial.key].srsValue ? ` (SRS՝ ${variableDefByKey[initial.key].srsValue})` : ''}։ Նշանը և տեսակը չեն փոխվում, քանի որ դրանցից կախված են կանոնները։</Alert>}
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">Համակարգային փոփոխականը (օր.՝ շեմ, գործակից, բառերի ցանկ) ունի արժեքների պատմություն՝ գործողության սկզբի ամսաթվով։ Կանոնը օգտագործում է փաստաթղթի հաշվետու ամսաթվին գործող արժեքը։</Typography>
          <TextField size="small" label="Անվանում" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField size="small" label="Նշան" value={f.key} disabled={editing} onChange={(e) => setF({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} error={!!keyErr} helperText={keyErr || `կանոնում՝ var.${f.key || '…'}`} sx={{ flex: 1 }} />
          </Stack>
          <Box>
            <Typography variant="body2" sx={{ mb: 0.5 }}>Ուղղություններ (մեկ կամ մի քանի)</Typography>
            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
              {Object.entries(DIRECTIONS).map(([k, l]) => {
                const on = f.directions.includes(k);
                const locked = on && lockedDirs.has(k);
                return <Tooltip key={k} title={locked ? 'Օգտագործվում է այս ուղղության կանոններում. չի կարող հանվել' : ''}><span><Chip label={l} clickable={!locked} color={on ? 'primary' : 'default'} variant={on ? 'filled' : 'outlined'} onClick={locked ? undefined : () => toggleDir(k)} /></span></Tooltip>;
              })}
            </Stack>
            <Typography variant="caption" color={f.directions.length ? 'text.secondary' : 'error'}>{!f.directions.length ? 'Ընտրեք առնվազն մեկ ուղղություն' : f.directions.length > 1 ? 'Մեկ արժեք՝ բոլոր նշված ուղղությունների կանոնների համար' : 'Հասանելի է միայն այս ուղղության կանոններում'}</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField size="small" select label="Տեսակ" value={f.type} disabled={editing} onChange={(e) => { setF({ ...f, type: e.target.value }); setVal(''); }} sx={{ minWidth: 190 }}>
              <MenuItem value="number">Թիվ</MenuItem><MenuItem value="list">Բառերի ցանկ</MenuItem>
            </TextField>
            {!isList && <TextField size="small" label="Միավոր (օր.՝ AMD, %, անգամ)" value={f.unit || ''} onChange={(e) => setF({ ...f, unit: e.target.value })} sx={{ flex: 1 }} />}
          </Stack>
          <TextField size="small" label="Նկարագրություն" multiline minRows={2} value={f.note || ''} onChange={(e) => setF({ ...f, note: e.target.value })} />
          {!editing && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField size="small" type="date" label="Գործում է" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: '1 1 0' }} />
              <TextField size="small" type={isList ? 'text' : 'number'} label={isList ? 'Առաջին արժեք (բառեր՝ ստորակետով)' : `Առաջին արժեք${f.unit ? ` (${f.unit})` : ''}`} value={val} onChange={(e) => setVal(e.target.value)} error={valErr} helperText="Կարելի է թողնել դատարկ և լրացնել հետո" sx={{ flex: '1 1 0' }} />
            </Stack>
          )}
          {f.type === 'list' && <Alert severity="info">Բառերի ցանկը կարելի է կապել նախասահմանված կանոնների ցանկային պարամետրերի հետ։ Կառուցիչի պայմաններում օգտագործվում են միայն թվային փոփոխականները։</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        {code && initial.overridden && <Button color="warning" onClick={() => onRestore(initial.key)} sx={{ mr: 'auto' }}>Վերականգնել սկզբնականը</Button>}
        <Button onClick={onClose}>Չեղարկել</Button>
        <Button variant="contained" disabled={!valid} onClick={() => onSave(
          { key: f.key, direction: f.directions[0], directions: f.directions, label: f.label.trim(), type: f.type, unit: isList ? '' : (f.unit || '').trim(), note: (f.note || '').trim() },
          !editing && val !== '' && (!isList || value.length) ? { value, effectiveFrom: from } : null,
        )}>Պահպանել</Button>
      </DialogActions>
    </Dialog>
  );
}
