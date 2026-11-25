/**
 * Մուտք ԵՍ ԵՄ ազգային նույնականացման հարթակով (NAP, NFR-05…NFR-09)։
 * Նախատիպում NAP-ը մոդելավորված է. «Մուտք» կոճակը բացում է ցուցադրական պատուհան, որտեղ ընտրվում են նույնականացվող անձը
 * և եղանակը (eID, mID, email). պատասխանը (ID token) ստուգվում է մոդուլի կանոններով (engine/auth.js)
 */
import { useState } from 'react';
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import { useStore, ROLES } from '../engine/store.js';
import { ALLOWED_ACM, NAP, authenticate } from '../engine/auth.js';
import { bprRecords } from '../data/external/bpr.js';

const ACM_DEMO = { ...ALLOWED_ACM, email: 'Էլ. փոստ (email)' };
const cap = (s) => (s ? s.charAt(0) + s.slice(1).toLocaleLowerCase('hy') : '');
const personOf = (r) => { const p = r.AVVPerson.AVVDocuments.Document[0].Document_object; return { ssn: r.AVVPerson.PNum, first: cap(p.Person.First_Name), last: cap(p.Person.Last_Name), doc: p.Document_Number }; };

export default function LoginPage() {
  const { state, update } = useStore();
  const [nap, setNap] = useState(false);
  const [error, setError] = useState(null);
  // ցուցադրական ինքնություններ. օգտատերերը առաջինը, հետո՝ ԲՊՌ-ի մյուս անձինք (չգրանցված)
  const people = bprRecords.map(personOf).sort((a, b) => (state.users.some((u) => u.ssn === b.ssn) - state.users.some((u) => u.ssn === a.ssn)));
  const [form, setForm] = useState({ ssn: state.users.find((u) => u.active)?.ssn || people[0].ssn, acm: 'eid', noPsn: false });

  const submit = () => {
    const p = people.find((x) => x.ssn === form.ssn);
    // NAP-ի ID token (ստորագրությունը, iss, aud, exp, nonce, state-ը ստուգված են սերվերում)
    const idToken = { iss: NAP.url, aud: 'cpc-risk-module', acm: form.acm, sub: form.noPsn ? p.doc : p.ssn, profile: { given_name: p.first, family_name: p.last, ...(form.noPsn ? { document_number: p.doc } : { psn: p.ssn }) } };
    const res = authenticate(state.users, idToken);
    const at = new Date().toISOString();
    const log = { at, ssn: idToken.profile.psn || null, doc: idToken.profile.document_number || null, name: `${p.first} ${p.last}`, acm: form.acm, ok: res.ok, reason: res.ok ? null : res.reason };
    update((s) => ({
      authLog: [log, ...(s.authLog || [])].slice(0, 200),
      ...(res.ok ? { session: { userId: res.user.id, ssn: res.user.ssn, acm: form.acm, at }, role: res.user.role, users: s.users.map((u) => (u.id === res.user.id ? { ...u, lastLogin: at } : u)) } : {}),
    }));
    setNap(false);
    setError(res.ok ? null : res.reason);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Paper sx={{ p: { xs: 3, sm: 4 }, maxWidth: 460, width: '100%' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>ԿԿՀ · Ռիսկերի վերլուծության մոդուլ</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>Մուտքն իրականացվում է ԵՍ ԵՄ ազգային նույնականացման հարթակով (նույնականացման քարտ կամ բջջային ID)։ Մուտք կարող են գործել միայն ադմինիստրատորի գրանցած օգտատերերը։</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
        <Button fullWidth size="large" variant="contained" startIcon={<LoginIcon />} onClick={() => setNap(true)}>Մուտք ԵՍ ԵՄ-ով</Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>Նախատիպ. ազգային նույնականացման հարթակը ({NAP.url}) մոդելավորված է։</Typography>
      </Paper>

      <Dialog open={nap} onClose={() => setNap(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          ԵՍ ԵՄ · ազգային նույնականացման հարթակ
          <Typography variant="body2" color="text.secondary">Ցուցադրական մոդելավորում ({NAP.authorize})</Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Իրական համակարգում մոդուլը օգտատիրոջն ուղղորդում է NAP (OpenID Connect, PKCE), որտեղ նա նույնականացվում է։ Վերադարձից հետո մոդուլի սերվերը կոդը փոխանակում է ID token-ի հետ և ստուգում այն։ Այստեղ ընտրեք, թե ով և ինչ եղանակով է նույնականացվում։
          </Alert>
          <Stack spacing={1.5}>
            <TextField select size="small" label="Նույնականացվող անձ" value={form.ssn} onChange={(e) => setForm({ ...form, ssn: e.target.value })}>
              {people.map((p) => {
                const u = state.users.find((x) => x.ssn === p.ssn);
                return <MenuItem key={p.ssn} value={p.ssn}>{p.first} {p.last} · ՀԾՀ {p.ssn} · {u ? `${ROLES[u.role]}${u.active ? '' : ' (ապաակտիվ)'}` : 'օգտատեր չէ'}</MenuItem>;
              })}
            </TextField>
            <TextField select size="small" label="Նույնականացման եղանակ (acm)" value={form.acm} onChange={(e) => setForm({ ...form, acm: e.target.value })}>
              {Object.entries(ACM_DEMO).map(([k, l]) => <MenuItem key={k} value={k}>{l}</MenuItem>)}
            </TextField>
            <FormControlLabel control={<Checkbox checked={form.noPsn} onChange={(e) => setForm({ ...form, noPsn: e.target.checked })} />} label="Պատասխանում ՀԾՀ չկա (միայն փաստաթղթի համար)" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNap(false)}>Չեղարկել</Button>
          <Button variant="contained" onClick={submit}>Նույնականացնել և վերադառնալ մոդուլ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
