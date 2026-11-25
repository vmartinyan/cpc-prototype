/**
 * Հայտարարագրերի կանոնների քաշերի բաշխում (ԿԿՀ-ի ճշտում 25.11.2026). միացված կանոնների քաշերի և DEC-R7-ի առավելագույն
 * քաշի գումարը պետք է լինի 100։ Գումարը փոխող գործողությունները (նոր կանոն, կրկնօրինակ, միացում/անջատում, ջնջում)
 * պահպանվում են այս պատուհանով՝ քաշերի հետ միասին, միայն երբ գումարը 100 է
 */
import { useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { WEIGHT_TOTAL, manualMaxWeight } from '../engine/evaluator.js';

/** Միացված կանոններ (pending փոփոխությամբ)՝ քաշերի աղյուսակի տողեր */
export function weightRows(rules, { exclude = [], include = [], extra = [] } = {}) {
  const list = rules.filter((r) => r.direction === 'declarations' && ((r.enabled && !exclude.includes(r.id)) || include.includes(r.id)))
    .map((r) => ({ id: r.id, title: r.title, weight: Number(r.weight) || 0 }));
  return [...list, ...extra];
}

/**
 * Քաշերը state-ում. նախասահմանված կանոններ և DEC-R7՝ ruleConfig, կառուցիչով կանոններ և կրկնօրինակներ՝ customRules
 * @param weights { [ruleId]: weight }
 */
export function applyWeights(s, weights, manual) {
  const ruleConfig = { ...(s.ruleConfig || {}) };
  const customRules = (s.customRules || []).map((c) => (c.id in weights ? { ...c, weight: weights[c.id] } : c));
  for (const [id, w] of Object.entries(weights)) if (!customRules.some((c) => c.id === id)) ruleConfig[id] = { ...(ruleConfig[id] || {}), weight: w };
  ruleConfig['DEC-R7'] = { ...(ruleConfig['DEC-R7'] || {}), weight: manual };
  return { ruleConfig, customRules };
}

/**
 * @param rows   [{ id, title, weight, isNew? }]
 * @param intro  ինչ գործողություն է պահպանվում (օր.՝ «DEC-R5-ի անջատում»)
 * @param onSave (weights, manual) => void
 */
export default function WeightsDialog({ state, rows, intro, onSave, onClose }) {
  const [w, setW] = useState(() => Object.fromEntries(rows.map((r) => [r.id, String(r.weight)])));
  const [manual, setManual] = useState(() => String(manualMaxWeight(state)));
  const num = (v) => (v === '' || !/^\d+(\.\d+)?$/.test(String(v).trim()) ? null : Number(v));
  const values = [...rows.map((r) => num(w[r.id])), num(manual)];
  const invalid = values.some((v) => v === null || v > WEIGHT_TOTAL);
  const total = values.reduce((a, v) => a + (v || 0), 0);
  const ok = !invalid && Math.abs(total - WEIGHT_TOTAL) < 1e-9;
  const field = (value, onChange) => <TextField size="small" value={value} onChange={(e) => onChange(e.target.value)} error={num(value) === null || num(value) > WEIGHT_TOTAL} sx={{ width: 90 }} slotProps={{ htmlInput: { inputMode: 'decimal' } }} />;
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Քաշերի բաշխում՝ հայտարարագրեր</DialogTitle>
      <DialogContent>
        {intro && <Alert severity="info" sx={{ mb: 1.5 }}>{intro}</Alert>}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Միացված կանոնների քաշերի և ձեռքով նշման (DEC-R7) առավելագույն քաշի գումարը պետք է լինի {WEIGHT_TOTAL}։ Հայտարարագրի համախառն միավորում յուրաքանչյուր ցուցանիշ հաշվվում է մեկ անգամ, ուստի միավորը {WEIGHT_TOTAL}-ից չի անցնում (DEC-04)։
        </Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Կանոն</TableCell><TableCell align="right">Քաշ</TableCell></TableRow></TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.id}{r.isNew && <Chip size="small" color="info" variant="outlined" label="նոր" sx={{ ml: 1, height: 18 }} />}</Typography>
                    <Typography variant="caption" color="text.secondary">{r.title}</Typography>
                  </TableCell>
                  <TableCell align="right">{field(w[r.id], (v) => setW({ ...w, [r.id]: v }))}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>DEC-R7</Typography>
                  <Typography variant="caption" color="text.secondary">Ձեռքով ռիսկային նշում՝ առավելագույն քաշ (մասնագետը նշում է 0-ից մինչև այս արժեքը)</Typography>
                </TableCell>
                <TableCell align="right">{field(manual, setManual)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Typography sx={{ fontWeight: 700 }}>Գումար</Typography></TableCell>
                <TableCell align="right"><Typography sx={{ fontWeight: 700 }} color={ok ? 'success.main' : 'error'}>{invalid ? '—' : Math.round(total * 100) / 100} / {WEIGHT_TOTAL}</Typography></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>
        {!ok && <Alert severity="warning" sx={{ mt: 1.5 }}>{invalid ? `Քաշերը պետք է լինեն 0-ից ${WEIGHT_TOTAL} թվեր։` : `Գումարը ${Math.round(total * 100) / 100} է. ${total > WEIGHT_TOTAL ? 'նվազեցրեք' : 'ավելացրեք'} քաշերը ${Math.round(Math.abs(WEIGHT_TOTAL - total) * 100) / 100}-ով։`}</Alert>}
      </DialogContent>
      <DialogActions>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose}>Չեղարկել</Button>
          <Button variant="contained" disabled={!ok} onClick={() => onSave(Object.fromEntries(rows.map((r) => [r.id, num(w[r.id])])), num(manual))}>Պահպանել</Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
