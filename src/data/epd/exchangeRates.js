/**
 * Փոխարժեքներ (mock). EPD-ում փոխարժեքները currency-rate սխեմայում են (currency, currencyrate), իսկ
 * յուրաքանչյուր գումարի հետ պահվում է կիրառված փոխարժեքը (<f>_ratetodefault) և դրա ամսաթիվը (<f>_timestamp)
 * (Database Guide, 2.9, 8)։ Արժեքները հավանական են, բայց իրական ԿԲ տվյալներ չեն։
 * Արժույթների id-ները՝ ըստ ուղեցույցի. 2 AMD, 1 USD, 3 EUR, 4 RUB, 5 GBP, 32 «առանց արժույթի» (XXX)։
 */
export const CURRENCY = { USD: 1, AMD: 2, EUR: 3, RUB: 4, GBP: 5, XXX: 32 };
export const CURRENCY_CODE = Object.fromEntries(Object.entries(CURRENCY).map(([k, v]) => [v, k]));

const table = [
  // date, USD, EUR, RUB
  ['2024-01-01', 404.8, 446.0, 4.48],
  ['2024-03-01', 404.1, 437.8, 4.42],
  ['2024-06-01', 387.6, 420.3, 4.31],
  ['2025-01-01', 396.6, 412.9, 3.66],
  ['2025-03-01', 393.2, 409.5, 4.39],
  ['2025-06-01', 389.4, 441.6, 4.83],
  ['2026-01-01', 383.5, 446.2, 4.82],
  ['2026-03-01', 388.2, 421.6, 4.71],
  ['2026-06-01', 385.9, 432.4, 4.66],
];

/** Տվյալ ամսաթվին գործող (վերջին նախորդ) փոխարժեքը */
export function rateOn(currency, date) {
  if (!currency || currency === 'AMD') return { rate: 1, date };
  if (currency === 'XXX') return { rate: null, date };
  const d = date || table[table.length - 1][0];
  let pick = table[0];
  for (const row of table) if (row[0] <= d) pick = row;
  const idx = { USD: 1, EUR: 2, RUB: 3 }[currency];
  return { rate: pick[idx], date: d };
}
