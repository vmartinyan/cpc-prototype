import { useState } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Tooltip, Typography, Alert, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useStore, can } from '../engine/store.js';
import { VARIABLE_DEFS, DEMO_VALUES, variableValue } from '../engine/variables.js';
import { DIRECTIONS } from '../rules/common.js';
import { PageHeader, Section, InfoNote, fmtDate, fmtNum } from '../components/common.jsx';

const show = (v, def) => (v === null || v === undefined ? <Chip size="small" color="warning" variant="outlined" label="սահմանված չէ" /> : Array.isArray(v) ? v.map((x) => `«${x}»`).join(', ') : `${fmtNum(v)}${def.unit ? ` ${def.unit}` : ''}`);

export default function VariablesPage() {
  const { state, update } = useStore();
  const [edit, setEdit] = useState(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const editable = can(state.role, 'edit_variables');
  const today = new Date().toISOString().slice(0, 10);
  const history = (def) => state.variables[def.key] ?? def.history;

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
        Արժեքները վերցված են SRS-ից և օրինակ են։ Այն փոփոխականները, որոնց արժեքը SRS-ում տրված չէ («ԿԿՀ-ից», «Արժեքը սահմանված չէ»), թողնված են դատարկ. դրանցից կախված կանոնները «չի գնահատվել» կարգավիճակում են։
        {state.demoApplied && ' Ներկա պահին կիրառված են ցուցադրական արժեքներ (տես ստորև)։'}
      </InfoNote>
      {!editable && <InfoNote severity="warning">Փոփոխականները թարմացնում է կանոնների պատասխանատուն (COM-03, NFR-02)։</InfoNote>}
      {Object.entries(DIRECTIONS).map(([dir, label]) => (
        <Section key={dir} title={label}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead><TableRow><TableCell>Փոփոխական</TableCell><TableCell>Ընթացիկ արժեք</TableCell><TableCell>SRS-ում</TableCell><TableCell>Պատմություն</TableCell><TableCell>Օգտագործում</TableCell><TableCell /></TableRow></TableHead>
              <TableBody>
                {VARIABLE_DEFS.filter((d) => d.direction === dir).map((def) => {
                  const h = history(def);
                  return (
                    <TableRow key={def.key}>
                      <TableCell sx={{ minWidth: 240 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{def.label}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>var.{def.key}</Typography>
                        {def.note && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{def.note}</Typography>}
                      </TableCell>
                      <TableCell>{show(variableValue(state.variables, def.key, today), def)}</TableCell>
                      <TableCell><Typography variant="caption">{def.srsValue}</Typography></TableCell>
                      <TableCell><Typography variant="caption">{h.length ? [...h].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)).slice(0, 4).map((x) => `${fmtDate(x.effectiveFrom)}-ից՝ ${Array.isArray(x.value) ? `${x.value.length} բառ` : fmtNum(x.value)}`).join('; ') + (h.length > 4 ? ` … (${h.length})` : '') : '—'}</Typography></TableCell>
                      <TableCell><Typography variant="caption">{def.usedBy?.join(', ') || '—'}</Typography></TableCell>
                      <TableCell>{editable && <Tooltip title="Թարմացնել"><IconButton size="small" onClick={() => setEdit(def)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Section>
      ))}
      <EditDialog def={edit} history={edit ? history(edit) : []} onClose={() => setEdit(null)} onSave={(h) => { update((s) => ({ variables: { ...s.variables, [edit.key]: h } })); setEdit(null); }} />
      <Dialog open={demoOpen} onClose={() => setDemoOpen(false)} maxWidth="sm">
        <DialogTitle>Ցուցադրական արժեքներ</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>Այս արժեքները SRS-ում սահմանված չեն և կիրառվում են միայն ցուցադրման նպատակով, որպեսզի համապատասխան կանոնները գնահատվեն։ ԿԿՀ-ի վերջնական արժեքներով փոխարինելու կարիք ունեն։</Alert>
          <Typography variant="subtitle2">Կենսաապահովման նվազագույն բյուջե (DEC-R1)</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>2023–2026՝ 75 326, 75 529, 78 836, 85 091 ֏. {DEMO_VALUES.variables.min_living_budget.why}</Typography>
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

function EditDialog({ def, history, onClose, onSave }) {
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
          <TextField size="small" type="date" label="Գործում է" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" fullWidth type={isList ? 'text' : 'number'} label={isList ? 'Բառեր (ստորակետով)' : `Արժեք${def.unit ? ` (${def.unit})` : ''}`} value={val} onChange={(e) => setVal(e.target.value)} />
          <Button onClick={add} disabled={!val || !from}>Ավելացնել</Button>
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Չեղարկել</Button><Button variant="contained" onClick={() => onSave(rows)}>Պահպանել</Button></DialogActions>
    </Dialog>
  );
}
