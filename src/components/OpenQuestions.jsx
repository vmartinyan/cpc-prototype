/**
 * SRS-ի բաց հարցերը նախատիպում (ձախ մենյուի ներքևի կոճակ → պատուհան)։
 * Տվյալները՝ docs/SRS.md-ի «Բաց հարցեր և ընդունված որոշումներ» աղյուսակից
 */
import { Fragment, useMemo, useState } from 'react';
import { Box, Button, Chip, Dialog, DialogContent, DialogTitle, FormControlLabel, IconButton, InputAdornment, Stack, Switch, TextField, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SearchIcon from '@mui/icons-material/Search';
import srsMd from '../../docs/SRS.md?raw';
import { parseOpenQuestions } from '../data/srsQuestions.js';

const QUESTIONS = parseOpenQuestions(srsMd);

/** Բջջի տեքստ. <br>՝ նոր տող, **…**՝ թավ, `…`՝ կոդ */
function Rich({ text }) {
  return (text || '').split('<br>').map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((part, j) => (
        part.startsWith('**') ? <b key={j}>{part.slice(2, -2)}</b>
          : part.startsWith('`') ? <Box key={j} component="code" sx={{ fontSize: '0.85em' }}>{part.slice(1, -1)}</Box>
            : <Fragment key={j}>{part}</Fragment>
      ))}
    </Fragment>
  ));
}

const statusColor = (q) => (q.accepted ? 'success' : /մասամբ/i.test(q.status) ? 'info' : /^բաց$/i.test(q.status) ? 'warning' : 'default');

export function OpenQuestionsButton() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [withAccepted, setWithAccepted] = useState(false);
  const openCount = QUESTIONS.filter((x) => !x.accepted).length;
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return QUESTIONS.filter((x) => (withAccepted || !x.accepted) && (!needle || `${x.id} ${x.text} ${x.source}`.toLowerCase().includes(needle)));
  }, [q, withAccepted]);
  return (
    <>
      <Box sx={{ px: 1.5, pb: 1 }}>
        <Button fullWidth variant="outlined" size="small" startIcon={<HelpOutlineIcon />} onClick={() => setOpen(true)} sx={{ justifyContent: 'flex-start' }}>
          Բաց հարցեր ({openCount})
        </Button>
      </Box>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="lg" fullWidth scroll="paper">
        <DialogTitle sx={{ pr: 6 }}>
          Բաց հարցեր (SRS)
          <Typography variant="body2" color="text.secondary">Աղբյուր՝ docs/SRS.md, «Բաց հարցեր և ընդունված որոշումներ»</Typography>
          <IconButton aria-label="Փակել" onClick={() => setOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
        </DialogTitle>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ px: 3, pb: 1.5, alignItems: { sm: 'center' } }}>
          <TextField size="small" placeholder="Որոնել (համար, տեքստ, աղբյուր)…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: 1 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
          <FormControlLabel control={<Switch checked={withAccepted} onChange={(e) => setWithAccepted(e.target.checked)} />} label={`Ցույց տալ նաև ընդունվածները (${QUESTIONS.length - openCount})`} />
        </Stack>
        <DialogContent dividers>
          {!rows.length && <Typography color="text.secondary">Չի գտնվել</Typography>}
          {rows.map((x) => (
            <Box key={x.id} sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                <Typography sx={{ fontWeight: 700 }}>{x.id}</Typography>
                <Chip size="small" variant="outlined" color={statusColor(x)} label={x.status} />
                <Typography variant="caption" color="text.secondary">{x.source}</Typography>
              </Stack>
              <Typography variant="body2" component="div" sx={{ lineHeight: 1.6 }}><Rich text={x.text} /></Typography>
            </Box>
          ))}
        </DialogContent>
      </Dialog>
    </>
  );
}
