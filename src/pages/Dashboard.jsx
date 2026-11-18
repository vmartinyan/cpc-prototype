import { useMemo, useState } from 'react';
import { Box, Grid, Paper, Stack, Typography, ToggleButton, ToggleButtonGroup, Tooltip, Button, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useStore } from '../engine/store.js';
import { chartColors } from '../theme/tokens.js';
import { DIRECTIONS } from '../rules/common.js';
import { PageHeader, Section, SimpleTable, InfoNote, navigate } from '../components/common.jsx';
import { ruleStats } from './Rules.jsx';

function StatTile({ label, value, sub, onClick }) {
  return (
    <Paper sx={{ p: 2, height: '100%', cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontSize: '2rem', fontWeight: 600, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Paper>
  );
}

/** Մեկ շարքով հորիզոնական սյունակային գծապատկեր՝ ուղղակի պիտակներով, hover-ով և աղյուսակային տեսքով */
function BarChart({ title, data, unitLabel = '' }) {
  const theme = useTheme();
  const [view, setView] = useState('chart');
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <Section title={title} actions={
      <ToggleButtonGroup size="small" exclusive value={view} onChange={(e, v) => v && setView(v)}>
        <ToggleButton value="chart">Գծապատկեր</ToggleButton><ToggleButton value="table">Աղյուսակ</ToggleButton>
      </ToggleButtonGroup>
    }>
      {view === 'table' ? (
        <SimpleTable dense rows={data.map((d, i) => ({ ...d, id: i }))} columns={[{ key: 'label', label: 'Կատեգորիա' }, { key: 'value', label: unitLabel || 'Քանակ', align: 'right' }, ...(data[0]?.total !== undefined ? [{ key: 'total', label: 'Ընդամենը', align: 'right' }] : [])]} />
      ) : (
        <Stack spacing={1.25} role="img" aria-label={title}>
          {data.map((d) => (
            <Tooltip key={d.label} title={`${d.label}: ${d.value}${d.total !== undefined ? ` / ${d.total}` : ''}`} placement="top" followCursor>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '110px 1fr 44px', sm: '200px 1fr 56px' }, alignItems: 'center', gap: 1, py: 0.25, cursor: d.onClick ? 'pointer' : 'default' }} onClick={d.onClick}>
                <Typography variant="body2" noWrap color="text.secondary">{d.label}</Typography>
                <Box sx={{ position: 'relative', height: 18 }}>
                  <Box sx={{ position: 'absolute', inset: 0, borderBottom: `1px solid ${theme.palette.divider}` }} />
                  <Box sx={{ position: 'absolute', left: 0, top: 3, bottom: 3, width: `${(d.value / max) * 100}%`, minWidth: d.value ? 3 : 0, bgcolor: chartColors.series[0], borderRadius: '0 4px 4px 0' }} />
                </Box>
                <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{d.value}</Typography>
              </Box>
            </Tooltip>
          ))}
        </Stack>
      )}
    </Section>
  );
}

export default function Dashboard() {
  const { results, state } = useStore();
  const stats = useMemo(() => ruleStats(results), [results]);
  const decl = results.declarations.filter((u) => !u.draft);
  const declFlagged = decl.filter((u) => u.scopes.some((s) => s.score > 0));
  const gifts = results.gifts;
  const persons = results.parties.persons;
  const parties = results.parties.parties;
  const integ = results.integrity;
  const notEval = Object.values(stats).reduce((s, x) => s + (x.not_evaluated || 0), 0);

  const byDirection = [
    { label: DIRECTIONS.declarations, value: decl.filter((u) => u.risky).length, total: decl.length, onClick: () => navigate('/declarations') },
    { label: DIRECTIONS.parties, value: parties.filter((p) => p.risky).length, total: parties.length, onClick: () => navigate('/parties') },
    { label: DIRECTIONS.gifts, value: gifts.filter((g) => g.risky).length, total: gifts.length, onClick: () => navigate('/gifts') },
    { label: DIRECTIONS.integrity, value: integ.filter((q) => q.risky).length, total: integ.length, onClick: () => navigate('/integrity') },
  ];
  // Բաշխում ըստ մակարդակների. ToR-ի ցածր/միջին/բարձր մակարդակները սահմանված չեն (Q-06), ուստի ցույց է տրվում միավորների միջակայքերով
  const thr = decl.find((u) => u.threshold != null)?.threshold ?? 60;
  const buckets = [
    { label: '0 միավոր', test: (s) => s === 0 },
    { label: `1–${Math.floor(thr / 2) - 1}`, test: (s) => s > 0 && s < thr / 2 },
    { label: `${Math.floor(thr / 2)}–${thr - 1}`, test: (s) => s >= thr / 2 && s < thr },
    { label: `≥ ${thr} (վերլուծության ենթակա)`, test: (s) => s >= thr },
  ].map((b) => ({ label: b.label, value: decl.filter((u) => b.test(u.score)).length }));
  const years = [...new Set([...decl.map((u) => u.year), ...gifts.map((g) => g.year), ...parties.map((p) => p.year), ...integ.map((q) => q.year)])].sort();
  const byYear = years.map((y) => ({
    label: String(y),
    value: decl.filter((u) => u.year === y && u.scopes.some((s) => s.score > 0)).length + gifts.filter((g) => g.year === y && g.risky).length + parties.filter((p) => p.year === y && p.risky).length + integ.filter((q) => q.year === y && q.risky).length,
  }));
  const topRules = Object.entries(stats).filter(([, s]) => s.fired).sort((a, b) => b[1].fired - a[1].fired).slice(0, 10)
    .map(([id, s]) => ({ label: `${id} ${results.rules.find((r) => r.id === id)?.title || ''}`, value: s.fired }));

  return (
    <>
      <PageHeader title="Վահանակ" subtitle="Ռիսկային փաստաթղթերի քանակ, բաշխում ըստ մակարդակների և ժամանակահատվածների (COM-21)" />
      {!state.demoApplied && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => navigate('/variables')}>Փոփոխականներ</Button>}>
          Որոշ կանոններ չեն գնահատվել ({notEval} արդյունք), քանի որ դրանց փոփոխականների արժեքները SRS-ում սահմանված չեն (կենսաապահովման նվազագույն բյուջե, նվերի անսովոր արժեքի բազմապատկիչ, համեմատվող տարիների քանակ)։
        </Alert>
      )}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}><StatTile label="Հայտարարագրեր՝ վերլուծության ենթակա" value={`${decl.filter((u) => u.risky).length} / ${decl.length}`} sub={`Առնվազն մեկ նշումով՝ ${declFlagged.length}. շեմ՝ ${thr}`} onClick={() => navigate('/declarations')} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatTile label="Կուսակցություններ՝ ռիսկային" value={`${parties.filter((p) => p.risky).length} / ${parties.length}`} sub={`Ռիսկային ֆիզ. անձինք՝ ${persons.filter((p) => p.risky).length} / ${persons.length}`} onClick={() => navigate('/parties')} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatTile label="Նվերների ձևաթղթեր՝ ռիսկային" value={`${gifts.filter((g) => g.risky).length} / ${gifts.length}`} onClick={() => navigate('/gifts')} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatTile label="Հարցաթերթիկներ՝ ռիսկային" value={`${integ.filter((q) => q.risky).length} / ${integ.length}`} onClick={() => navigate('/integrity')} /></Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}><BarChart title="Ռիսկային փաստաթղթեր՝ ըստ ուղղության" data={byDirection} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><BarChart title="Հայտարարագրեր՝ ըստ համախառն միավորի (առավելագույնը երկու հաշվարկից)" data={buckets} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><BarChart title="Ռիսկային նշումով փաստաթղթեր՝ ըստ տարվա" data={byYear} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><BarChart title="Ամենահաճախ աշխատած կանոններ" data={topRules} unitLabel="Աշխատել է" /></Grid>
      </Grid>
      <Typography variant="caption" color="text.secondary">Ռիսկի մակարդակները (ցածր/միջին/բարձր) սահմանված չեն (Q-06). հայտարարագրերի բաշխումը ցույց է տրված միավորների միջակայքերով։</Typography>
    </>
  );
}
