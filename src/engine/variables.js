/**
 * Մոդուլի համակարգային փոփոխականներ — SRS բաժին 9 (կանոնի 3-րդ տեսակի փոփոխական, COM-03)։
 * Յուրաքանչյուր փոփոխական ունի արժեքների պատմություն՝ գործողության սկզբի ամսաթվով։
 * Կանոնը վերցնում է փաստաթղթի հաշվետու ամսաթվին գործող արժեքը։
 *
 * ԿԱՐԵՎՈՐ. այն փոփոխականները, որոնց արժեքը SRS-ում տրված չէ («ԿԿՀ-ից», «Արժեքը սահմանված չէ»),
 * թողնված են դատարկ։ Դրանցից կախված կանոնները ստանում են «չի գնահատվել» կարգավիճակ, մինչև
 * կանոնների պատասխանատուն արժեք չմուտքագրի «Փոփոխականներ» էջում։
 * Բացառություն՝ կենսաապահովման նվազագույն բյուջե. նախասահմանված են նվազագույն սպառողական զամբյուղի արժեքները։
 */

/** Կենսաապահովման նվազագույն բյուջե (1 անձ, ամսական)՝ ըստ տարիների */
const MIN_LIVING_BUDGET = [[2023, 75326], [2024, 75529], [2025, 78836], [2026, 85091]].map(([y, v]) => ({ value: v, effectiveFrom: `${y}-01-01` }));

export const VARIABLE_DEFS = [
  // ── Հայտարարագրեր
  { key: 'min_living_budget', direction: 'declarations', label: 'Կենսաապահովման նվազագույն բյուջե (1 անձի հաշվով, ամսական)', unit: 'AMD', type: 'number',
    history: MIN_LIVING_BUDGET, srsValue: 'ԿԿՀ-ից (արժեքը SRS-ում տրված չէ)', note: 'Նախասահմանված արժեքները (2023–2026՝ 75 326, 75 529, 78 836, 85 091 ֏) վերցված են «Նվազագույն սպառողական զամբյուղ» փոփոխականից՝ Q-47(բ) վարկածով, որ դրանք նույն մեծությունն են։ Տարեկան է, ունի գործողության սկզբի ամսաթիվ, հաշվարկն օգտագործում է հաշվետու տարվա արժեքը։ Ընտանիքի կազմով հաշվարկում բազմապատկվում է անձանց թվով (DEC-02)։ Ամսական/տարեկան լինելը SRS-ում ճշտված չէ. նախատիպում DEC-R1-ը ստուգում է՝ ԸՏԾ − բյուջե × 12 × անձանց թիվ ≤ 0։', usedBy: ['DEC-R1'] },
  { key: 'dec_threshold', direction: 'declarations', label: 'Հայտարարագրի վերլուծության շեմ (համախառն միավոր)', unit: 'միավոր', type: 'number',
    history: [{ value: 60, effectiveFrom: '2020-01-01' }], srsValue: '60 միավոր', note: 'Կիրառվում է առանձին և ընդհանուր ընտանիքի կազմով հաշվարկի վրա (DEC-04)', usedBy: ['համախառն միավոր'] },
  { key: 'cash_threshold', direction: 'declarations', directions: ['declarations', 'integrity'], label: 'Կանխիկի շեմ', unit: 'AMD', type: 'number',
    history: [{ value: 5000000, effectiveFrom: '2020-01-01' }], srsValue: '5 մլն ՀՀ դրամ', note: 'Կանխիկի չափորոշիչ (DEC-R6) և բարեվարքության չափորոշիչ 11', usedBy: ['DEC-R6', 'INT-R11'] },
  { key: 'cash_ratio', direction: 'declarations', label: 'Կանխիկի և անկանխիկ միջոցների հարաբերակցություն', unit: 'անգամ', type: 'number',
    history: [{ value: 3, effectiveFrom: '2020-01-01' }], srsValue: '3 անգամ', note: 'Կանխիկի չափորոշիչ (DEC-R6)', usedBy: ['DEC-R6'] },
  { key: 'manual_max_weight', direction: 'declarations', label: 'Ձեռքով դրվող ռիսկային նշման առավելագույն քաշ', unit: 'միավոր', type: 'number',
    history: [{ value: 25, effectiveFrom: '2020-01-01' }], srsValue: '25', note: 'COM-20', usedBy: ['DEC-R7'] },

  // ── Նվերներ
  { key: 'gift_large_threshold', direction: 'gifts', label: 'Խոշոր արժեքի նվերի շեմ', unit: 'AMD', type: 'number',
    history: [{ value: 1000000, effectiveFrom: '2020-01-01' }], srsValue: '1 մլն ՀՀ դրամ', usedBy: ['GIF-R1'] },
  { key: 'gift_count_growth', direction: 'gifts', label: 'Նվերների քանակի աճի շեմ (ընթացիկ/նախորդ տարի)', unit: 'անգամ', type: 'number',
    history: [{ value: 3, effectiveFrom: '2020-01-01' }], srsValue: 'ԿԿՀ-ի օրինակ՝ 30/10 նվեր', note: 'SRS-ում շեմի ձևը (հարաբերակցություն, թե տարբերություն) սահմանված չէ. նախատիպում 30/10 օրինակը մեկնաբանված է որպես 3 անգամ հարաբերակցություն', usedBy: ['GIF-R2'] },
  { key: 'gift_value_growth', direction: 'gifts', label: 'Նվերների արժեքի աճի շեմ (ընթացիկ/նախորդ տարի)', unit: 'անգամ', type: 'number',
    history: [{ value: 6, effectiveFrom: '2020-01-01' }], srsValue: 'ԿԿՀ-ի օրինակ՝ 3 մլն/500 հազար', note: '3 մլն/500 հազար օրինակը մեկնաբանված է որպես 6 անգամ հարաբերակցություն', usedBy: ['GIF-R3'] },
  { key: 'gift_unusual_mult', direction: 'gifts', label: 'Նվերի անսովոր արժեքի բազմապատկիչ (նվազագույն արժեքի նկատմամբ)', unit: 'անգամ', type: 'number',
    history: [], srsValue: 'Արժեքը սահմանված չէ (կանոնի տեքստում օրինակ՝ 5)', usedBy: ['GIF-R4'] },
  { key: 'gift_ai_upper_mult', direction: 'gifts', label: 'Նվերի արժեքի վերին բազմապատկիչ (AI գնահատականի նկատմամբ)', unit: 'անգամ', type: 'number',
    history: [], srsValue: 'Արժեքը սահմանված չէ', note: 'Կանոնը չի իրականացված (Q-21)', usedBy: [] },
  { key: 'gift_ai_lower_mult', direction: 'gifts', label: 'Նվերի արժեքի ստորին բազմապատկիչ (AI գնահատականի նկատմամբ)', unit: 'անգամ', type: 'number',
    history: [], srsValue: 'Արժեքը սահմանված չէ', note: 'Կանոնը չի իրականացված (Q-21)', usedBy: [] },

  // ── Բարեվարքություն
  { key: 'kw_disciplinary', direction: 'integrity', label: 'Բանալի բառեր՝ կարգապահական պատասխանատվություն (չափորոշիչ 5)', type: 'list',
    history: [{ value: ['ՀՀ սահմանը', 'ապացույց կորցնել', 'ձգձգել'], effectiveFrom: '2020-01-01' }], srsValue: '«ՀՀ սահմանը», «ապացույց կորցնել», «ձգձգել»', usedBy: ['INT-R5b'] },
  { key: 'kw_prosecution', direction: 'integrity', label: 'Բանալի բառեր՝ քրեական հետապնդման դադարեցում (չափորոշիչ 7)', type: 'list',
    history: [{ value: ['ոչ արդարացնող', 'ոչ արդարացման', 'ոչ ռեաբիլիտացնող', 'բողոքի բացակայություն'], effectiveFrom: '2020-01-01' }], srsValue: '«ոչ արդարացնող», «ոչ արդարացման», «ոչ ռեաբիլիտացնող», «բողոքի բացակայություն»', usedBy: ['INT-R7b'] },
  { key: 'kw_administrative', direction: 'integrity', label: 'Բանալի բառեր՝ վարչական պատասխանատվություն (չափորոշիչ 8)', type: 'list',
    history: [{ value: ['ոչ սթափ'], effectiveFrom: '2020-01-01' }], srsValue: '«ոչ սթափ»', usedBy: ['INT-R8c'] },
  { key: 'kw_civil', direction: 'integrity', label: 'Բանալի բառեր՝ քաղաքացիական գործեր (չափորոշիչ 9)', type: 'list',
    history: [{ value: ['սնանկություն', 'ալիմենտ'], effectiveFrom: '2020-01-01' }], srsValue: '«սնանկություն», «ալիմենտ»', usedBy: ['INT-R9c'] },
  { key: 'int_admin_count', direction: 'integrity', label: 'Վարչական պատասխանատվությունների քանակի շեմ', unit: 'հատ', type: 'number',
    history: [{ value: 10, effectiveFrom: '2020-01-01' }], srsValue: '10 (օրինակ)', usedBy: ['INT-R8b'] },
  { key: 'int_civil_count', direction: 'integrity', label: 'Քաղաքացիական գործերի քանակի շեմ', unit: 'հատ', type: 'number',
    history: [{ value: 3, effectiveFrom: '2020-01-01' }], srsValue: '3 (օրինակ)', usedBy: ['INT-R9b'] },

  // ── Կուսակցություններ
  { key: 'party_max_donation', direction: 'parties', label: 'Նվիրատվության առավելագույն չափ', unit: 'AMD', type: 'number',
    history: [{ value: 10000000, effectiveFrom: '2020-01-01' }], srsValue: '10 մլն ՀՀ դրամ (օրենքով)', usedBy: ['PAR-R1'] },
  { key: 'party_study_threshold', direction: 'parties', label: 'Ուսումնասիրվող նվիրատուի շեմ', unit: 'AMD', type: 'number',
    history: [{ value: 5000000, effectiveFrom: '2020-01-01' }], srsValue: '5 մլն ՀՀ դրամ', note: 'Կանոն 3-ը չի իրականացված (Q-43)', usedBy: [] },
  { key: 'party_income_years', direction: 'parties', label: 'Եկամուտների դիտարկվող ժամանակահատված', unit: 'տարի', type: 'number',
    history: [{ value: 10, effectiveFrom: '2020-01-01' }], srsValue: '10 տարի', note: 'Կանոն 3-ը չի իրականացված', usedBy: [] },
  { key: 'consumer_basket', direction: 'parties', label: 'Նվազագույն սպառողական զամբյուղ (1 անձի հաշվով, ամսական)', unit: 'AMD', type: 'number',
    history: [[2017, 55591], [2018, 60057], [2019, 60394], [2020, 61014], [2021, 71570], [2022, 76459], [2023, 75326], [2024, 75529], [2025, 78836], [2026, 85091]].map(([y, v]) => ({ value: v, effectiveFrom: `${y}-01-01` })),
    srsValue: 'Ըստ տարիների (2017–2026)', note: 'Կանոններ 3 և 4 (չիրականացված)։ Նույն փոփոխականն է արդյոք, ինչ կենսաապահովման նվազագույն բյուջեն՝ Q-47', usedBy: [] },
  { key: 'party_return_days_excess', direction: 'parties', label: 'Չափը գերազանցող նվիրատվության վերադարձի ժամկետ', unit: 'օր', type: 'number',
    history: [{ value: 90, effectiveFrom: '2020-01-01' }], srsValue: '90 օր', note: 'Կանոն 5-ը չի իրականացված (Q-45)', usedBy: [] },
  { key: 'party_return_days_prohibited', direction: 'parties', label: 'Չթույլատրված աղբյուրից նվիրատվության վերադարձի ժամկետ', unit: 'օր', type: 'number',
    history: [{ value: 14, effectiveFrom: '2020-01-01' }], srsValue: '2 շաբաթ', note: 'Կանոն 5-ը չի իրականացված (Q-45)', usedBy: [] },
  { key: 'party_realestate_pct', direction: 'parties', label: 'Անշարժ գույքի օգտագործման արժեքի տոկոս', unit: '%', type: 'number',
    history: [{ value: 2.5, effectiveFrom: '2020-01-01' }], srsValue: '2.5%', note: 'Կանոն 7-ը չի իրականացված (Q-46, Q-51)', usedBy: [] },
  { key: 'party_rent_deviation', direction: 'parties', label: 'Շուկայականից ցածր վարձավճարի շեղման շեմ', unit: '%', type: 'number',
    history: [{ value: 20, effectiveFrom: '2020-01-01' }], srsValue: '20%', note: 'Կանոն 7-ը չի իրականացված', usedBy: [] },
];

export const variableDefByKey = Object.fromEntries(VARIABLE_DEFS.map((v) => [v.key, v]));

/**
 * Բոլոր համակարգային փոփոխականները. կոդով սահմանվածները (VARIABLE_DEFS) և մասնագետի ստեղծածները (state.customVariableDefs,
 * COM-03)։ Մասնագետի ստեղծածի արժեքների պատմությունը պահվում է state.variables-ում, ինչպես մյուսներինը
 */
/** Ուղղություններ, որոնց վերաբերում է փոփոխականը (մեկ կամ մի քանի). մի քանի ուղղության փոփոխականն ունի մեկ արժեք */
export const varDirections = (d) => (d?.directions?.length ? d.directions : d?.direction ? [d.direction] : []);
export const variableAppliesTo = (d, direction) => varDirections(d).includes(direction);
// Նախասահմանված փոփոխականների բնութագրերը (անվանում, միավոր, նկարագրություն, ուղղություններ) կարող են փոխվել
// (state.variableDefOverrides[key]). նշանը և տեսակը չեն փոխվում (դրանցից կախված են կանոնները). չօգտագործվողը կարող է
// հեռացվել (hidden) և վերականգնվել
const withOverride = (d, ov) => (ov ? { ...d, ...ov, overridden: true } : d);
export const allVariableDefs = (state) => [
  ...VARIABLE_DEFS.map((d) => withOverride(d, state?.variableDefOverrides?.[d.key])).filter((d) => !d.hidden),
  ...(state?.customVariableDefs || []).map((d) => ({ ...d, custom: true, history: [] })),
];
export const variableDefOf = (state, key) => (variableDefByKey[key] ? withOverride(variableDefByKey[key], state?.variableDefOverrides?.[key]) : (state?.customVariableDefs || []).find((d) => d.key === key) || null);
export const hiddenCodeVariables = (state) => VARIABLE_DEFS.filter((d) => state?.variableDefOverrides?.[d.key]?.hidden);

/** Փոփոխականներ, որոնք օգտագործվում են անմիջապես հաշվարկում (ոչ կանոնի պարամետրով) */
export const ENGINE_USAGE = {
  dec_threshold: { id: 'Հայտարարագրի վերլուծության շեմ', direction: 'declarations' },
  manual_max_weight: { id: 'DEC-R7', direction: 'declarations' },
};

/** Որտեղ է օգտագործվում համակարգային փոփոխականը (կառուցիչի պայմաններ, պարամետրեր, բարդ փոփոխականներ) */
export function variableUsage(state, key) {
  const re = new RegExp(`\\bvar\\.${key}\\b`);
  const out = [];
  for (const r of state?.customRules || []) if ((r.kind === 'expression' && re.test(r.expression || '')) || Object.values(r.params || {}).some((b) => b?.var === key)) out.push(r.id);
  for (const [id, c] of Object.entries(state?.ruleConfig || {})) if (re.test(c.expression || '') || Object.values(c.params || {}).some((b) => b?.var === key)) out.push(id);
  for (const d of state?.derivedVars || []) if (re.test(d.expression || '')) out.push(`doc.${d.key}`);
  return [...new Set(out)];
}

/** Վերադարձնում է փոփոխականի արժեքը տվյալ ամսաթվին (null, եթե սահմանված չէ) */
export function variableValue(variables, key, date) {
  const history = variables[key] ?? variableDefByKey[key]?.history ?? [];
  const d = date || '9999-12-31';
  let pick = null;
  for (const h of [...history].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))) if (h.effectiveFrom <= d) pick = h;
  if (!pick || pick.value === null || pick.value === '' || (Array.isArray(pick.value) && !pick.value.length)) return null;
  return pick.value;
}

/**
 * «Ցուցադրական արժեքներ». օգտատիրոջ կողմից սեղմելով լրացվող արժեքներ այն փոփոխականների
 * և կանոնի պարամետրերի համար, որոնք SRS-ում սահմանված չեն։ Լռելյայն չեն կիրառվում։
 */
export const DEMO_VALUES = {
  variables: {
    gift_unusual_mult: { history: [{ value: 5, effectiveFrom: '2020-01-01' }], why: 'Օրինակը վերցված է SRS 6-ի կանոնի տեքստից («եթե բազմապատիկը 5 է»)' },
  },
  ruleParams: {
    'INT-R2': { years: 3 },
    'INT-R3': { years: 3 },
    'INT-R4': { years: 3 },
    why: 'Համեմատվող տարիների քանակը SRS-ում սահմանված չէ (Q-32). 3-ը ցուցադրական արժեք է',
  },
};
