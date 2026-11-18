import { useState } from 'react';
import { MenuItem, TextField, Typography } from '@mui/material';
import { ROLES } from '../engine/store.js';
import { PageHeader, Section, SimpleTable, InfoNote } from '../components/common.jsx';

const INITIAL = [
  { id: 'U1', name: 'Աննա Մելքումյան', unit: 'Հայտարարագրերի վերլուծության վարչություն', role: 'analyst' },
  { id: 'U2', name: 'Գոռ Սահակյան', unit: 'Հայտարարագրերի վերլուծության վարչություն', role: 'analyst' },
  { id: 'U3', name: 'Լուսինե Առաքելյան', unit: 'Մեթոդաբանության բաժին', role: 'rules_officer' },
  { id: 'U4', name: 'Արամ Թադևոսյան', unit: 'Ղեկավարություն', role: 'manager' },
  { id: 'U5', name: 'Հովհաննես Բեգլարյան', unit: 'Տեղեկատվական տեխնոլոգիաների բաժին', role: 'admin' },
];

export default function UsersPage() {
  const [users, setUsers] = useState(INITIAL);
  return (
    <>
      <PageHeader title="Օգտատերեր և իրավունքներ" subtitle="Ադմինիստրատորը կառավարում է օգտատերերին և իրավունքները (բաժին 2, NFR-02)" />
      <InfoNote>Ցուցադրական ցանկ. նախատիպում իրական նույնականացում չկա, դերը ընտրվում է վերևի ցանկից։ Մոդուլը գործում է միայն ԿԿՀ-ի ներքին ցանցում (NFR-03). նախատիպում չի ստուգվում։</InfoNote>
      <Section>
        <SimpleTable rows={users} columns={[
          { key: 'name', label: 'Օգտատեր' },
          { key: 'unit', label: 'Ստորաբաժանում' },
          { key: 'role', label: 'Դեր', render: (u) => (
            <TextField select size="small" value={u.role} onChange={(e) => setUsers(users.map((x) => (x.id === u.id ? { ...x, role: e.target.value } : x)))} sx={{ minWidth: 240 }}>
              {Object.entries(ROLES).map(([k, l]) => <MenuItem key={k} value={k}>{l}</MenuItem>)}
            </TextField>
          ) },
        ]} />
        <Typography variant="caption" color="text.secondary">Փոփոխությունները չեն պահպանվում (ցուցադրական)։</Typography>
      </Section>
    </>
  );
}
