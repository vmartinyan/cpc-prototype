import { useState } from 'react';
import { Box, Button, TextField, MenuItem, Stack, Typography, Chip, Alert, IconButton, Tooltip } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useStore, can, newId, ROLES } from '../engine/store.js';
import { variableValue } from '../engine/variables.js';
import { Section, navigate } from './common.jsx';
import { STATUS } from '../rules/common.js';

const CONCLUSION_STATUS = {
  in_review: 'Ուսումնասիրվում է',
  no_violation: 'Խախտում չի հայտնաբերվել',
  violation: 'Հայտնաբերվել է խախտման հատկանիշ',
  referred: 'Փոխանցված է հետագա ուսումնասիրության',
};

/** Մասնագետի եզրակացություն (բաժին 2. «գրանցում է իր եզրակացությունը») */
export function ConclusionBox({ direction, unitId }) {
  const { state, update } = useStore();
  const key = `${direction}:${unitId}`;
  const existing = state.conclusions[key];
  const [status, setStatus] = useState(existing?.status || 'in_review');
  const [text, setText] = useState(existing?.text || '');
  const allowed = can(state.role, 'conclude');
  return (
    <Section title="Մասնագետի եզրակացություն">
      {existing && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Վերջին գրառում՝ {new Date(existing.at).toLocaleString('hy-AM')} ({ROLES[existing.by]})
        </Typography>
      )}
      <Stack spacing={1.5}>
        <TextField select size="small" label="Կարգավիճակ" value={status} onChange={(e) => setStatus(e.target.value)} disabled={!allowed} sx={{ maxWidth: 360 }}>
          {Object.entries(CONCLUSION_STATUS).map(([k, l]) => <MenuItem key={k} value={k}>{l}</MenuItem>)}
        </TextField>
        <TextField label="Եզրակացություն" multiline minRows={3} value={text} onChange={(e) => setText(e.target.value)} disabled={!allowed} />
        <Box>
          <Button variant="contained" disabled={!allowed} onClick={() => update((s) => ({ conclusions: { ...s.conclusions, [key]: { status, text, by: s.role, at: new Date().toISOString() } } }))}>
            Պահպանել
          </Button>
          {!allowed && <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>Եզրակացություն գրանցում է վերլուծաբանը (NFR-02)</Typography>}
        </Box>
      </Stack>
    </Section>
  );
}
export const conclusionLabel = (state, direction, unitId) => CONCLUSION_STATUS[state.conclusions[`${direction}:${unitId}`]?.status] || '';

/** Ձեռքով ռիսկային նշում (COM-20) */
export function ManualFlagBox({ direction, unitId, refDate }) {
  const { state, update } = useStore();
  const flags = state.manualFlags.filter((f) => f.direction === direction && f.unitId === unitId);
  const maxW = variableValue(state.variables, 'manual_max_weight', refDate) ?? 25;
  const [note, setNote] = useState('');
  const [weight, setWeight] = useState(maxW);
  const allowed = can(state.role, 'manual_flag');
  const isDecl = direction === 'declarations';
  const canAdd = allowed && note.trim() && (!isDecl || flags.length === 0);
  return (
    <Section title="Ձեռքով ռիսկային նշում (COM-20)">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {isDecl ? `Հայտարարագրի դեպքում նշման քաշը (մինչև ${maxW}) գումարվում է համախառն միավորին (չափորոշիչ 7)։ Նախատիպում՝ մեկ նշում մեկ հայտարարագրի համար։` : 'Առանց քաշի. փաստաթուղթը դառնում է ռիսկային։'}
        {direction === 'integrity' && ' Հարցաթերթիկի վրա ձեռքով նշման թույլատրելիությունը ճշտվում է (Q-38)։'}
      </Typography>
      {flags.map((f) => (
        <Alert key={f.id} severity="warning" sx={{ mb: 1 }} action={allowed && (
          <Tooltip title="Հեռացնել"><IconButton size="small" onClick={() => update((s) => ({ manualFlags: s.manualFlags.filter((x) => x.id !== f.id) }))}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
        )}>
          {isDecl && <Chip size="small" label={`քաշ ${Math.min(f.weight, maxW)}`} sx={{ mr: 1 }} />}
          {f.note} <Typography component="span" variant="caption" color="text.secondary">({new Date(f.at).toLocaleDateString('hy-AM')})</Typography>
        </Alert>
      ))}
      {allowed && (!isDecl || flags.length === 0) && (
        <Stack spacing={1.5}>
          <TextField size="small" label="Հիմնավորում" multiline minRows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          {isDecl && <TextField size="small" type="number" label={`Քաշ (0–${maxW})`} value={weight} onChange={(e) => setWeight(Math.max(0, Math.min(maxW, Number(e.target.value))))} slotProps={{ htmlInput: { min: 0, max: maxW } }} sx={{ width: 140 }} />}
          <Button variant="outlined" color="warning" sx={{ alignSelf: 'flex-start' }} disabled={!canAdd} onClick={() => {
            update((s) => ({ manualFlags: [...s.manualFlags, { id: newId('MF'), direction, unitId, weight: isDecl ? weight : null, note: note.trim(), by: s.role, at: new Date().toISOString() }] }));
            setNote('');
          }}>Ավելացնել նշում</Button>
        </Stack>
      )}
      {!allowed && <Typography variant="caption" color="text.secondary">Ձեռքով նշում դնում է վերլուծաբանը (NFR-02)</Typography>}
    </Section>
  );
}

/** Նշում այն կանոնների մասին, որոնք չեն գնահատվել չսահմանված փոփոխականների/պարամետրերի պատճառով */
export function UndefinedVarsBanner({ units, getResults }) {
  const counts = {};
  for (const u of units) for (const r of getResults(u)) if (r.status === STATUS.notEvaluated && /սահմանված չէ/.test(r.explanation)) counts[r.ruleId] = (counts[r.ruleId] || 0) + 1;
  const ids = Object.keys(counts);
  if (!ids.length) return null;
  return (
    <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => navigate('/variables')}>Փոփոխականներ</Button>}>
      {ids.join(', ')} կանոն(ներ)ը չեն գնահատվել, քանի որ անհրաժեշտ փոփոխականի կամ պարամետրի արժեքը SRS-ում սահմանված չէ։ Արժեքը մուտքագրում է կանոնների պատասխանատուն։
    </Alert>
  );
}
