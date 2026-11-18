import { useState, useSyncExternalStore } from 'react';
import { Box, Button, Chip, Grid, MenuItem, Paper, Stack, Switch, TextField, Typography, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useStore, can } from '../engine/store.js';
import { SERVICES, getLog, subscribeLog, clearLog, call, setOutages } from '../adapters/transport.js';
import { PageHeader, Section, SimpleTable, JsonView, InfoNote } from '../components/common.jsx';

const USES = {
  bpr: 'PAR-R6 (կանոն 6), կառուցիչ՝ ext.bpr_name_match, ext.bpr_is_dead',
  pek: 'Կառուցիչ՝ ext.pek_income_year, ext.pek_income_prev_year (SRS-ի կատալոգի կանոններ 3, 4՝ չիրականացված)',
  cadastre: 'Կառուցիչ՝ ext.cadastre_owned_count',
  police: 'Կառուցիչ՝ ext.vehicles_count',
  civil: 'Չի օգտագործվում (բարեվարքության կանոն 1՝ չիրականացված, Q-29, Q-49)',
  business: 'Չի օգտագործվում (անձով որոնում չկա, Q-53)',
};

export default function ExternalPage() {
  const { state, update } = useStore();
  const log = useSyncExternalStore(subscribeLog, getLog);
  const [sb, setSb] = useState({ service: 'bpr', endpoint: 'search_by_psn', body: JSON.stringify(SERVICES.bpr.endpoints.search_by_psn.sample, null, 2) });
  const [resp, setResp] = useState(null);
  const [open, setOpen] = useState(null);
  const editable = can(state.role, 'external') || can(state.role, 'edit_rules');

  const send = () => {
    try {
      setOutages(state.outages);
      const r = call(sb.service, sb.endpoint, JSON.parse(sb.body), { sandbox: true });
      setResp({ ok: true, data: r });
    } catch (e) {
      setResp({ ok: false, error: e.message });
    }
  };

  return (
    <>
      <PageHeader title="Արտաքին համակարգեր (mock)" subtitle="Պետական շտեմարանների նոր (gip.ekeng.am) տարբերակների mock՝ SRS 11.5-ի դաշտերի անուններով և կառուցվածքով։ Իրական հարցումներ չեն կատարվում" />
      <InfoNote>
        Յուրաքանչյուր աղբյուր միանում է առանձին ադապտերով (COM-13)։ Արտաքին տվյալը հարցվում է միայն այն կանոնի համար, որն այն օգտագործում է, և մեկ փաստաթղթի գնահատման ընթացքում կրկին չի հարցվում (COM-14)։
        Աղբյուրը «անջատելով» կարելի է տեսնել COM-17-ի վարքը. կախված կանոնները ստանում են «չի գնահատվել» կարգավիճակ և ավտոմատ վերագնահատվում են միացնելուց հետո։
      </InfoNote>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {Object.entries(SERVICES).map(([k, s]) => (
          <Grid key={k} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 600 }}>{s.name}</Typography>
                <Switch checked={!state.outages[k]} disabled={!editable} onChange={(e) => update((st) => ({ outages: { ...st.outages, [k]: !e.target.checked } }))} />
              </Stack>
              <Chip size="small" color={state.outages[k] ? 'warning' : 'success'} variant="outlined" label={state.outages[k] ? 'Անհասանելի (սիմուլյացիա)' : 'Հասանելի'} sx={{ mb: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>SRS {s.srs}</Typography>
              {Object.entries(s.endpoints).map(([ek, ep]) => <Typography key={ek} variant="caption" sx={{ display: 'block', fontFamily: 'monospace', wordBreak: 'break-all' }}>{ep.url}</Typography>)}
              <Typography variant="body2" sx={{ mt: 1 }}>{USES[k]}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
      <Section title="Փորձնական հարցում (sandbox)">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
          <TextField size="small" select label="Ծառայություն" value={sb.service} sx={{ minWidth: 240 }} onChange={(e) => { const ek = Object.keys(SERVICES[e.target.value].endpoints)[0]; setSb({ service: e.target.value, endpoint: ek, body: JSON.stringify(SERVICES[e.target.value].endpoints[ek].sample, null, 2) }); setResp(null); }}>
            {Object.entries(SERVICES).map(([k, s]) => <MenuItem key={k} value={k}>{s.name}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Մեթոդ" value={sb.endpoint} sx={{ minWidth: 200 }} onChange={(e) => setSb({ ...sb, endpoint: e.target.value, body: JSON.stringify(SERVICES[sb.service].endpoints[e.target.value].sample, null, 2) })}>
            {Object.keys(SERVICES[sb.service].endpoints).map((k) => <MenuItem key={k} value={k}>{k}</MenuItem>)}
          </TextField>
          <Button variant="contained" onClick={send}>Ուղարկել (mock)</Button>
        </Stack>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 5 }}>
            <TextField label="Հարցում (JSON)" multiline minRows={8} fullWidth value={sb.body} onChange={(e) => setSb({ ...sb, body: e.target.value })} slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: 12 } } }} />
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            {resp ? (resp.ok ? <JsonView data={resp.data} maxHeight={420} /> : <Alert severity="error">{resp.error}</Alert>) : <Typography color="text.secondary">Պատասխանը կցուցադրվի այստեղ</Typography>}
          </Grid>
        </Grid>
      </Section>
      <Section title={`Հարցումների մատյան (${log.length})`} actions={<Button size="small" onClick={clearLog}>Մաքրել</Button>}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Մատյանը ցույց է տալիս, որ հարցումներ կատարվում են միայն արտաքին տվյալ օգտագործող կանոնների համար (COM-14)։ Ամեն վերագնահատում (օր.՝ փոփոխականի փոփոխություն) կրկին կատարում է հարցումները։</Typography>
        <SimpleTable dense rows={log.slice(0, 100).map((l, i) => ({ ...l, id: i }))} onRowClick={setOpen} columns={[
          { key: 'at', label: 'Ժամ', render: (l) => new Date(l.at).toLocaleTimeString('hy-AM') },
          { key: 's', label: 'Ծառայություն', render: (l) => `${SERVICES[l.service].short} · ${l.endpoint}` },
          { key: 'm', label: 'Համատեքստ', render: (l) => (l.meta?.sandbox ? 'sandbox' : `${l.meta?.direction || ''} ${l.meta?.unit || ''}`) },
          { key: 'r', label: 'Հարցում', render: (l) => <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{JSON.stringify(l.request).slice(0, 90)}</Typography> },
          { key: 'ok', label: 'Արդյունք', render: (l) => <Chip size="small" variant="outlined" color={l.ok ? 'success' : 'warning'} label={l.ok ? (l.response ? 'OK' : 'Չի գտնվել') : 'Անհասանելի'} /> },
        ]} />
      </Section>
      <Dialog open={!!open} onClose={() => setOpen(null)} maxWidth="md" fullWidth>
        <DialogTitle>{open && `${SERVICES[open.service].name} · ${open.endpoint}`}</DialogTitle>
        <DialogContent>
          {open && <><Typography variant="subtitle2">Հարցում</Typography><JsonView data={open.request} /><Typography variant="subtitle2" sx={{ mt: 1 }}>Պատասխան</Typography><JsonView data={open.response ?? open.error} maxHeight={420} /></>}
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(null)}>Փակել</Button></DialogActions>
      </Dialog>
    </>
  );
}
