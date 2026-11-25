/**
 * Օգտատերեր և իրավունքներ (NFR-02, NFR-05…NFR-09). ադմինիստրատորը ավելացնում է օգտատիրոջը ՀԾՀ-ով (տվյալները՝ ԲՊՌ-ից),
 * տրամադրում է դեր, ակտիվացնում/ապաակտիվացնում է հաշիվը։ Մուտքը՝ ԵՍ ԵՄ ազգային նույնականացման հարթակով
 */
import { useState } from 'react';
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useStore, ROLES, newId } from '../engine/store.js';
import { ALLOWED_ACM, bprPerson } from '../engine/auth.js';
import { PageHeader, Section, SimpleTable, InfoNote } from '../components/common.jsx';

const fmtDt = (iso) => (iso ? new Date(iso).toLocaleString('hy-AM') : '—');

export default function UsersPage() {
  const { state, update } = useStore();
  const users = state.users || [];
  const me = users.find((u) => u.id === state.session?.userId);
  const [add, setAdd] = useState(null); // { ssn, person, unit, role, error }
  const setUser = (id, patch) => update((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }));

  const lookup = () => {
    const ssn = add.ssn.trim();
    if (!/^\d{10}$/.test(ssn)) return setAdd({ ...add, person: null, error: 'ՀԾՀ-ն պետք է լինի 10 նիշ' });
    if (users.some((u) => u.ssn === ssn)) return setAdd({ ...add, person: null, error: 'Այս ՀԾՀ-ով օգտատերն արդեն գրանցված է' });
    const p = bprPerson(ssn);
    setAdd({ ...add, person: p.ok ? p : null, error: p.ok ? null : p.reason });
  };
  const save = () => {
    const { ssn, person, unit, role } = add;
    update((s) => ({ users: [...s.users, { id: newId('U'), ssn: ssn.trim(), name: person.name, patronymic: person.patronymic, birthDate: person.birthDate, unit: unit.trim(), role, active: true, addedAt: new Date().toISOString(), addedBy: me?.name || '—' }] }));
    setAdd(null);
  };

  return (
    <>
      <PageHeader title="Օգտատերեր և իրավունքներ" subtitle="Ադմինիստրատորը ավելացնում է օգտատերերին ՀԾՀ-ով և տրամադրում դերեր (NFR-02, NFR-05…NFR-09)" />
      <InfoNote>
        Օգտատերը ավելացվում է ՀԾՀ-ով. անունը, ազգանունը և ծննդյան ամսաթիվը ստացվում են ԲՊՌ-ից։ Մուտքն իրականացվում է ԵՍ ԵՄ ազգային նույնականացման հարթակով ({Object.values(ALLOWED_ACM).join(', ')}). մոդուլը ստուգում է նույնականացված անձի ՀԾՀ-ն և թույլ է տալիս մուտքը օգտատիրոջ դերով։ Ապաակտիվ օգտատերը մուտք գործել չի կարող։ Մոդուլը գործում է միայն ԿԿՀ-ի ներքին ցանցում (NFR-03). նախատիպում չի ստուգվում։
      </InfoNote>
      <Section title="Օգտատերեր" actions={<Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setAdd({ ssn: '', person: null, unit: '', role: 'analyst', error: null })}>Ավելացնել օգտատեր</Button>}>
        <SimpleTable rows={users} columns={[
          { key: 'name', label: 'Օգտատեր', render: (u) => <><Typography variant="body2" sx={{ fontWeight: 600 }}>{u.name}{u.id === me?.id && <Chip size="small" label="դուք" sx={{ ml: 1, height: 18 }} />}</Typography><Typography variant="caption" color="text.secondary">ՀԾՀ {u.ssn}{u.birthDate ? ` · ծնվ. ${u.birthDate.replace(/\//g, '.')}` : ''}</Typography></> },
          { key: 'unit', label: 'Ստորաբաժանում', render: (u) => u.unit || '—' },
          { key: 'role', label: 'Դեր', render: (u) => (
            <Tooltip title={u.id === me?.id ? 'Սեփական դերը փոխել հնարավոր չէ' : ''}>
              <span>
                <TextField select size="small" value={u.role} disabled={u.id === me?.id} onChange={(e) => setUser(u.id, { role: e.target.value })} sx={{ minWidth: 230 }}>
                  {Object.entries(ROLES).map(([k, l]) => <MenuItem key={k} value={k}>{l}</MenuItem>)}
                </TextField>
              </span>
            </Tooltip>
          ) },
          { key: 'active', label: 'Ակտիվ', render: (u) => (
            <Tooltip title={u.id === me?.id ? 'Սեփական հաշիվը ապաակտիվացնել հնարավոր չէ' : u.active ? 'Ապաակտիվացնել (մուտքը կարգելվի)' : 'Ակտիվացնել'}>
              <span><Switch checked={!!u.active} disabled={u.id === me?.id} onChange={(e) => setUser(u.id, { active: e.target.checked })} /></span>
            </Tooltip>
          ) },
          { key: 'last', label: 'Վերջին մուտք', render: (u) => <Typography variant="caption">{fmtDt(u.lastLogin)}</Typography> },
          { key: 'added', label: 'Ավելացրել է', render: (u) => <Typography variant="caption" color="text.secondary">{u.addedBy || '—'} · {fmtDt(u.addedAt)}</Typography> },
        ]} />
      </Section>

      <Section title="Մուտքի մատյան">
        {!(state.authLog || []).length ? <Typography color="text.secondary">Մուտքի փորձեր դեռ չկան։</Typography> : (
          <SimpleTable dense rows={(state.authLog || []).slice(0, 50).map((x, i) => ({ ...x, id: i }))} columns={[
            { key: 'at', label: 'Ժամանակ', render: (x) => <Typography variant="caption">{fmtDt(x.at)}</Typography> },
            { key: 'who', label: 'Նույնականացված անձ', render: (x) => <><Typography variant="body2">{x.name}</Typography><Typography variant="caption" color="text.secondary">{x.ssn ? `ՀԾՀ ${x.ssn}` : `փաստաթուղթ ${x.doc || '—'}`}</Typography></> },
            { key: 'acm', label: 'Եղանակ', render: (x) => x.acm },
            { key: 'res', label: 'Արդյունք', render: (x) => (x.ok ? <Chip size="small" color="success" variant="outlined" label="Մուտք" /> : <Tooltip title={x.reason}><Chip size="small" color="error" variant="outlined" label="Մերժված" /></Tooltip>) },
            { key: 'reason', label: 'Պատճառ', render: (x) => <Typography variant="caption">{x.reason || '—'}</Typography> },
          ]} />
        )}
      </Section>

      {add && (
        <Dialog open onClose={() => setAdd(null)} maxWidth="sm" fullWidth>
          <DialogTitle>Նոր օգտատեր</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={1}>
                <TextField size="small" label="ՀԾՀ" value={add.ssn} onChange={(e) => setAdd({ ...add, ssn: e.target.value.replace(/\D/g, '').slice(0, 10), person: null, error: null })} sx={{ flex: 1 }} helperText="Օրինակ՝ 0000100519 (ԲՊՌ-ի ցուցադրական տվյալներում)" />
                <Button variant="outlined" onClick={lookup} sx={{ alignSelf: 'flex-start', height: 40 }}>Ստանալ ԲՊՌ-ից</Button>
              </Stack>
              {add.error && <Alert severity="error">{add.error}</Alert>}
              {add.person && <Alert severity="success">{add.person.name} {add.person.patronymic}{add.person.birthDate ? ` · ծնվ. ${add.person.birthDate.replace(/\//g, '.')}` : ''}</Alert>}
              <TextField size="small" label="Ստորաբաժանում" value={add.unit} onChange={(e) => setAdd({ ...add, unit: e.target.value })} />
              <TextField select size="small" label="Դեր" value={add.role} onChange={(e) => setAdd({ ...add, role: e.target.value })}>
                {Object.entries(ROLES).map(([k, l]) => <MenuItem key={k} value={k}>{l}</MenuItem>)}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAdd(null)}>Չեղարկել</Button>
            <Button variant="contained" disabled={!add.person} onClick={save}>Ավելացնել</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
