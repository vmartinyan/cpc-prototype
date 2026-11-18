import { useState } from 'react';
import {
  Box, Chip, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Accordion, AccordionSummary, AccordionDetails,
  Stack, Tooltip, Alert, Button, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Link,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import FlagIcon from '@mui/icons-material/Flag';
import { STATUS_LABEL } from '../rules/common.js';
import { SERVICES } from '../adapters/transport.js';

export const fmtAmd = (n) => (n === null || n === undefined || Number.isNaN(n) ? '—' : `${Math.round(n).toLocaleString('hy-AM')} ֏`);
export const fmtNum = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('hy-AM'));
export const fmtDate = (d) => (d ? d.split('-').reverse().join('.') : '—');

export function navigate(path) {
  window.location.hash = path;
}

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3, alignItems: { md: 'flex-end' }, justifyContent: 'space-between' }}>
      <Box>
        {back && (
          <Link component="button" onClick={() => navigate(back.to)} underline="hover" sx={{ mb: 0.5, display: 'block' }}>
            ← {back.label}
          </Link>
        )}
        <Typography variant="h5" component="h1">{title}</Typography>
        {subtitle && <Typography color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>}
      </Box>
      {actions && <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>{actions}</Stack>}
    </Stack>
  );
}

const STATUS_ICON = { fired: FlagIcon, not_fired: CheckCircleOutlineIcon, not_evaluated: HelpOutlineIcon, not_applicable: RemoveCircleOutlineIcon };
export function StatusChip({ status, size = 'small' }) {
  const theme = useTheme();
  const color = { fired: theme.palette.status.fired, not_fired: theme.palette.status.notFired, not_evaluated: theme.palette.status.notEvaluated, not_applicable: theme.palette.text.disabled }[status];
  const Icon = STATUS_ICON[status];
  return <Chip size={size} variant="outlined" icon={Icon ? <Icon style={{ color }} /> : undefined} label={STATUS_LABEL[status] || status} sx={{ borderColor: color, color }} />;
}

export function RiskChip({ risky, label }) {
  return risky ? <Chip size="small" color="error" icon={<WarningAmberIcon />} label={label || 'Ռիսկային'} /> : <Chip size="small" variant="outlined" label={label || 'Ռիսկային չէ'} />;
}

export function ScoreChip({ score, threshold }) {
  if (score === null || score === undefined) return <Chip size="small" variant="outlined" label="—" />;
  const risky = threshold !== null && threshold !== undefined && score >= threshold;
  return <Chip size="small" color={risky ? 'error' : score > 0 ? 'warning' : 'default'} variant={risky ? 'filled' : 'outlined'} label={`${score}${threshold != null ? ` / ${threshold}` : ''}`} />;
}

export function ValueCell({ item }) {
  if (item.kind === 'amd') return fmtAmd(item.value);
  if (item.kind === 'bool') return item.value ? 'Այո' : 'Ոչ';
  if (item.kind === 'num') return `${typeof item.value === 'number' ? fmtNum(Math.round(item.value * 100) / 100) : item.value ?? '—'}${item.unit ? ` ${item.unit}` : ''}`;
  return item.value ?? '—';
}

export function ValuesTable({ values }) {
  if (!values?.length) return null;
  return (
    <Table size="small" sx={{ mt: 1 }}>
      <TableBody>
        {values.map((it, i) => (
          <TableRow key={i}>
            <TableCell sx={{ color: 'text.secondary', width: '45%' }}>{it.label}</TableCell>
            <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}><ValueCell item={it} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function JsonView({ data, maxHeight = 320 }) {
  const theme = useTheme();
  return (
    <Box component="pre" sx={{ m: 0, p: 1.5, bgcolor: 'background.default', borderRadius: 1, fontFamily: theme.custom.monoFamily, fontSize: 12, maxHeight, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {JSON.stringify(data, null, 2)}
    </Box>
  );
}

/** Արտաքին աղբյուրի snapshot-ներ (COM-16) */
export function Snapshots({ snapshots }) {
  const [open, setOpen] = useState(null);
  if (!snapshots?.length) return null;
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary">Արտաքին տվյալներ, որոնց հիման վրա գնահատվել է (snapshot, COM-16).</Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 1 }}>
        {snapshots.map((s, i) => (
          <Chip key={i} size="small" label={`${SERVICES[s.service]?.short} · ${s.endpoint}`} onClick={() => setOpen(s)} />
        ))}
      </Stack>
      <Dialog open={!!open} onClose={() => setOpen(null)} maxWidth="md" fullWidth>
        <DialogTitle>{open && `${SERVICES[open.service]?.name} — ${open.endpoint}`}</DialogTitle>
        <DialogContent>
          {open && (
            <>
              <Typography variant="caption" color="text.secondary">{SERVICES[open.service].endpoints[open.endpoint].url} · {new Date(open.at).toLocaleString('hy-AM')}</Typography>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>Հարցում</Typography>
              <JsonView data={open.request} />
              <Typography variant="subtitle2" sx={{ mt: 1 }}>Պատասխան</Typography>
              <JsonView data={open.response} maxHeight={420} />
            </>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(null)}>Փակել</Button></DialogActions>
      </Dialog>
    </Box>
  );
}

/** Կանոնների արդյունքների ցանկ (COM-19). աշխատածները՝ առաջինը */
export function RuleResults({ results, rules, showWeight, defaultExpandFired = true }) {
  const order = { fired: 0, not_evaluated: 1, not_fired: 2, not_applicable: 3 };
  const list = Object.values(results || {}).sort((a, b) => order[a.status] - order[b.status]);
  const byId = Object.fromEntries(rules.map((r) => [r.id, r]));
  if (!list.length) return <Typography color="text.secondary">Կիրառելի կանոններ չկան։</Typography>;
  return (
    <Box>
      {list.map((r) => {
        const rule = byId[r.ruleId] || { title: r.ruleId };
        return (
          <Accordion key={r.ruleId} disableGutters defaultExpanded={defaultExpandFired && r.status === 'fired'} sx={{ '&:before': { display: 'none' }, mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, width: '100%', pr: 1 }}>
                <StatusChip status={r.status} />
                <Typography sx={{ fontWeight: 600, flex: 1 }}>
                  <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>{r.ruleId}</Box>{rule.title}
                </Typography>
                {showWeight && r.status === 'fired' && <Chip size="small" color="error" variant="outlined" label={`քաշ ${r.weight}`} />}
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" sx={{ mb: 1 }}>{r.explanation}</Typography>
              {rule.srsRef && <Typography variant="caption" color="text.secondary">Աղբյուր՝ {rule.srsRef}</Typography>}
              <ValuesTable values={r.values} />
              <Snapshots snapshots={r.snapshots} />
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}

export function Section({ title, children, actions, sx }) {
  return (
    <Paper sx={{ p: 2.5, mb: 2, ...sx }}>
      {(title || actions) && (
        <Stack direction="row" sx={{ mb: 1.5, alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          {title && <Typography variant="h6">{title}</Typography>}
          {actions}
        </Stack>
      )}
      {children}
    </Paper>
  );
}

export function KV({ items }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(160px, 220px) 1fr' }, columnGap: 2, rowGap: 0.75 }}>
      {items.filter(Boolean).map(([k, val], i) => (
        <Box key={i} sx={{ display: 'contents' }}>
          <Typography variant="body2" color="text.secondary">{k}</Typography>
          <Typography variant="body2" component="div">{val ?? '—'}</Typography>
        </Box>
      ))}
    </Box>
  );
}

/** Պարզ աղյուսակ՝ սյուների նկարագրությամբ */
export function SimpleTable({ columns, rows, onRowClick, empty = 'Տվյալներ չկան', dense }) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size={dense ? 'small' : 'medium'}>
        <TableHead>
          <TableRow>{columns.map((c) => <TableCell key={c.key} align={c.align}>{c.label}</TableCell>)}</TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 && (
            <TableRow><TableCell colSpan={columns.length}><Typography color="text.secondary">{empty}</Typography></TableCell></TableRow>
          )}
          {rows.map((r, i) => (
            <TableRow key={r.id || i} hover={!!onRowClick} onClick={onRowClick ? () => onRowClick(r) : undefined} sx={{ cursor: onRowClick ? 'pointer' : 'default' }}>
              {columns.map((c) => <TableCell key={c.key} align={c.align} sx={c.sx}>{c.render ? c.render(r) : r[c.key]}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

/** Զտիչներ (COM-22). անձ, ժամանակահատված, ռիսկի մակարդակ, կանոն */
export function FilterBar({ filters, setFilters, years, rules, extra }) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
      <TextField size="small" label="Որոնում (անուն, ՀԾՀ, ID)" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} sx={{ minWidth: 240 }} />
      <TextField size="small" select label="Տարի" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} sx={{ minWidth: 120 }}>
        <MenuItem value="">Բոլորը</MenuItem>
        {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
      </TextField>
      <TextField size="small" select label="Ռիսկ" value={filters.risk} onChange={(e) => setFilters({ ...filters, risk: e.target.value })} sx={{ minWidth: 160 }}>
        <MenuItem value="">Բոլորը</MenuItem>
        <MenuItem value="risky">Ռիսկային</MenuItem>
        <MenuItem value="flagged">Առնվազն մեկ նշում</MenuItem>
        <MenuItem value="clean">Առանց նշման</MenuItem>
      </TextField>
      <TextField size="small" select label="Կանոն" value={filters.rule} onChange={(e) => setFilters({ ...filters, rule: e.target.value })} sx={{ minWidth: 240 }}>
        <MenuItem value="">Բոլորը</MenuItem>
        {rules.map((r) => <MenuItem key={r.id} value={r.id}>{r.id} — {r.title}</MenuItem>)}
      </TextField>
      {extra}
    </Stack>
  );
}
export const EMPTY_FILTERS = { q: '', year: '', risk: '', rule: '' };

export function InfoNote({ children, severity = 'info', sx }) {
  return <Alert severity={severity} sx={{ mb: 2, ...sx }}>{children}</Alert>;
}

export function Hint({ title, children }) {
  return (
    <Tooltip title={title}>
      <Box component="span" sx={{ borderBottom: '1px dotted', cursor: 'help' }}>{children}</Box>
    </Tooltip>
  );
}
