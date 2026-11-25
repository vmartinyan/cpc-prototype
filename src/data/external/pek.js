/**
 * ՊԵԿ (tax, ssn/v1) mock — docs/external_web_services/tax.ssn.v1։
 * Հարցում՝ tax_ssn_request { ssn, start_date, end_date }։ Պատասխան՝ tax_ssn_response
 * { error?, taxPayerInfo[ { taxPayerInfoItem: { taxpayerid, personInfoPeriods.personInfoPeriod[ { personInfoPeriodItem: { date, personInfo{...} } } ] } } ] }։
 * Զանգվածի տարրերը՝ Guideline-ի ծառի անուններով (taxPayerInfoItem, personInfoPeriodItem)։
 * Միայն աշխատավարձ/հավասարեցված վճարումներ և քաղաքացիաիրավական պայմանագրեր (այլ եկամտատեսակներ
 * ծառայությունում չկան, Q-50)։ Ամսաթվի ձևաչափը նկարագրված չէ. mock-ում՝ «YYYY-MM»։
 * Ամսական տողերը գեներացվում են ստորև նկարագրված աշխատանքային ժամանակահատվածներից։
 */

// ssn → [{ taxpayerid, from:'YYYY-MM', to:'YYYY-MM', salary, civil }]
const employment = {
  '0000101925': [{ taxpayerid: '02500011', from: '2023-01', to: '2026-09', salary: { 2023: 600000, 2024: 625000, 2025: 650000, 2026: 650000 } }],
  '0000100963': [{ taxpayerid: '01234567', from: '2023-01', to: '2026-09', salary: { 2023: 325000, 2024: 333333, 2025: 350000, 2026: 350000 } }],
  '0000101370': [{ taxpayerid: '02500402', from: '2023-01', to: '2026-09', salary: { 2023: 700000, 2024: 725000, 2025: 750000, 2026: 750000 } }],
  '0000100112': [{ taxpayerid: '02500733', from: '2023-01', to: '2026-09', salary: { 2023: 470000, 2024: 483333, 2025: 500000, 2026: 500000 } }],
  '0000101666': [{ taxpayerid: '03300451', from: '2023-01', to: '2026-09', salary: { 2023: 230000, 2024: 241667, 2025: 250000, 2026: 250000 } }],
  '0000101148': [{ taxpayerid: '02500044', from: '2023-01', to: '2026-09', salary: { 2023: 410000, 2024: 425000, 2025: 450000, 2026: 450000 } }],
  '0000100445': [{ taxpayerid: '02500055', from: '2023-01', to: '2026-09', salary: { 2023: 650000, 2024: 675000, 2025: 700000, 2026: 700000 } }],
  '0000101777': [
    { taxpayerid: '02500666', from: '2023-01', to: '2026-09', salary: { 2023: 400000, 2024: 466667, 2025: 500000, 2026: 500000 } },
    { taxpayerid: '02500099', from: '2024-09', to: '2026-06', civil: { 2024: 75000, 2025: 75000, 2026: 75000 } },
  ],
  // ՊԵԿ-ի տվյալով 2025-ին աշխատավարձը 7 800 000 է, հայտարարագրում՝ 6 600 000 (կառուցիչի օրինակի համար)
  '0000101333': [{ taxpayerid: '02500077', from: '2023-01', to: '2026-09', salary: { 2023: 500000, 2024: 516667, 2025: 650000, 2026: 650000 } }],
  '0000102184': [{ taxpayerid: '04400088', from: '2023-01', to: '2026-09', salary: { 2023: 430000, 2024: 450000, 2025: 450000, 2026: 450000 } }],
  '0000101555': [{ taxpayerid: '02618833', from: '2023-01', to: '2026-09', salary: { 2023: 380000, 2024: 420000, 2025: 450000, 2026: 480000 } }],
  '0000100186': [{ taxpayerid: '02500111', from: '2023-01', to: '2026-09', salary: { 2023: 420000, 2024: 440000, 2025: 460000, 2026: 460000 } }],
  '0000102147': [{ taxpayerid: '02500122', from: '2023-01', to: '2026-09', salary: { 2023: 480000, 2024: 500000, 2025: 520000, 2026: 520000 } }],
  '0000102295': [{ taxpayerid: '00876543', from: '2023-01', to: '2026-09', salary: { 2023: 280000, 2024: 290000, 2025: 300000, 2026: 300000 } }],
  '0000100852': [{ taxpayerid: '01987654', from: '2023-01', to: '2026-09', salary: { 2023: 900000, 2024: 950000, 2025: 1000000, 2026: 1000000 } }],
  '0000100297': [{ taxpayerid: '00345678', from: '2023-01', to: '2026-09', salary: { 2023: 1500000, 2024: 1500000, 2025: 1600000, 2026: 1600000 } }],
  '0000102036': [{ taxpayerid: '00911223', from: '2023-01', to: '2026-09', salary: { 2023: 250000, 2024: 250000, 2025: 260000, 2026: 260000 } }],
  '0000101000': [{ taxpayerid: '02233445', from: '2023-01', to: '2026-09', salary: { 2023: 2000000, 2024: 2100000, 2025: 2200000, 2026: 2200000 } }],
};

function months(from, to) {
  const out = [];
  let [y, m] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

function buildTaxPayerInfo(ssn) {
  return (employment[ssn] || []).map((e) => ({
    taxpayerid: e.taxpayerid,
    personInfoPeriods: {
      personInfoPeriod: months(e.from, e.to).map((date) => {
        const y = Number(date.slice(0, 4));
        const salary = e.salary?.[y] || 0;
        const civil = e.civil?.[y] || 0;
        const gross = salary + civil;
        return {
          date,
          personInfo: {
            incomeTax: Math.round(gross * 0.2),
            workinghours: salary ? 168 : 0,
            socialpayments: Math.round(Math.min(gross, 1125000) * 0.05),
            socialpaymentspaid: Math.round(Math.min(gross, 1125000) * 0.05),
            salaryEquivPayments: salary,
            civilLowContractPayments: civil,
          },
        };
      }),
    },
  }));
}

/** ssn/v1 ծառայության mock կատարում */
export function taxSsn(req) {
  const { ssn, start_date, end_date } = req?.tax_ssn_request || {};
  if (!employment[ssn]) return { tax_ssn_response: { error: { errorcode: '404', errortext: 'Տվյալներ չեն գտնվել' }, taxPayerInfo: [] } };
  const from = (start_date || '0000-00').slice(0, 7);
  const to = (end_date || '9999-12').slice(0, 7);
  const info = buildTaxPayerInfo(ssn)
    .map((t) => ({ ...t, personInfoPeriods: { personInfoPeriod: t.personInfoPeriods.personInfoPeriod.filter((p) => p.date >= from && p.date <= to) } }))
    .filter((t) => t.personInfoPeriods.personInfoPeriod.length)
    .map((t) => ({ taxPayerInfoItem: { ...t, personInfoPeriods: { personInfoPeriod: t.personInfoPeriods.personInfoPeriod.map((p) => ({ personInfoPeriodItem: p })) } } }));
  return { tax_ssn_response: { taxPayerInfo: info } };
}
export const pekKnownSsns = Object.keys(employment);
