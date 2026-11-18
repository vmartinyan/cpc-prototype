import { Chip, Typography } from '@mui/material';
import { useStore } from '../engine/store.js';
import { BUILTIN_RULES, MANUAL_RULES } from '../rules/catalog.js';
import { DIRECTIONS } from '../rules/common.js';
import { PageHeader, Section, SimpleTable, InfoNote } from '../components/common.jsx';
import { NotImplementedList } from './Rules.jsx';

export default function StatusPage() {
  const { results } = useStore();
  const enabled = Object.fromEntries(results.rules.map((r) => [r.id, r.enabled]));
  const rows = [...BUILTIN_RULES, ...MANUAL_RULES];
  return (
    <>
      <PageHeader title="Կանոնների ամփոփում" subtitle="Իրականացված և չիրականացված կանոններ՝ SRS-ի հղումներով։ Կանոնները պահանջներ չեն. պահանջները COM, DEC, PAR, GIF, INT, NFR նույնացուցիչներով կետերն են" />
      <InfoNote>SRS-ի կանոնների կատալոգներում կանոնները նույնացուցիչ չունեն. նախատիպում դրանց տրված են պայմանական ID-ներ (DEC-R1…, PAR-R1…, GIF-R1…, INT-R1…)՝ ըստ բաժնի և կանոնի հերթական համարի։</InfoNote>
      <Section title={`Իրականացված կանոններ (${rows.length})`}>
        <SimpleTable dense rows={rows} columns={[
          { key: 'id', label: 'ID' },
          { key: 't', label: 'Կանոն', render: (r) => <><Typography variant="body2" sx={{ fontWeight: 600 }}>{r.title}</Typography>{r.caveats?.map((c, i) => <Typography key={i} variant="caption" color="warning.dark" sx={{ display: 'block' }}>• {c}</Typography>)}</> },
          { key: 'd', label: 'Ուղղություն', render: (r) => DIRECTIONS[r.direction] },
          { key: 's', label: 'SRS', render: (r) => r.srsRef },
          { key: 'q', label: 'Պահանջներ', render: (r) => r.requirements?.join(', ') },
          { key: 'w', label: 'Քաշ', render: (r) => r.weight ?? '—' },
          { key: 'st', label: 'Կարգավիճակ', render: (r) => (r.manual ? <Chip size="small" color="secondary" variant="outlined" label="ձեռքով" /> : <Chip size="small" variant="outlined" color={r.partial ? 'warning' : enabled[r.id] ? 'success' : 'default'} label={r.partial ? 'մասնակի' : enabled[r.id] ? 'միացված' : 'անջատված'} />) },
        ]} />
      </Section>
      <Typography variant="h6" sx={{ mb: 1 }}>Չիրականացված կանոններ</Typography>
      <NotImplementedList />
    </>
  );
}
