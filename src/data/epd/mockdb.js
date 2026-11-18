/**
 * Mock EPD բազայի կառուցիչ։ Ստեղծում է աղյուսակներ EPD-ի կանոններով (Database Guide, գլ. 2).
 *   • versioned աղյուսակներ (roots, sections). entityid + instanceid, ընթացիկ տարբերակը՝ de_<table>publisheditem-ում
 *   • sections. parentid = root-ի instanceid
 *   • detail rows. parentid = section-ի (կամ սեփականատիրոջ) entityid, առանց instanceid
 *   • money (ACCOUNTING). <f>_amount, <f>_currencyid, <f>_timestamp, <f>_ratetodefault
 *   • yes/no. c_yesno (1 այո, 2 ոչ)
 * Id-ները հատկացվում են հաջորդականությամբ (ինչպես պլատֆորմում՝ ամբողջ թվեր, կրկին չեն օգտագործվում)։
 */
import { rateOn, CURRENCY } from './exchangeRates.js';

export const YES = 1;
export const NO = 2;
export const yn = (b) => (b === undefined || b === null ? null : b ? YES : NO);

export class MockDb {
  constructor() {
    this.tables = {};
    this.seq = 100000;
    this.inst = 500000;
  }
  t(name) {
    return (this.tables[name] ||= []);
  }
  nextId() {
    return ++this.seq;
  }
  /** Versioned row (root/section). opts.current=false՝ ոչ ընթացիկ տարբերակ (publisheditem-ում չի գրանցվում) */
  versioned(table, fields, { instanceid, current = true, date = '2026-01-01T00:00:00' } = {}) {
    const row = { entityid: this.nextId(), instanceid: instanceid ?? ++this.inst, datecreated: date, dateupdated: date, ...fields };
    this.t(table).push(row);
    if (current) this.t(`${table}publisheditem`).push({ entityid: row.entityid, instanceid: row.instanceid, datecreated: date });
    return row;
  }
  /** Section. parentid = root-ի instanceid */
  section(table, root, fields = {}, opts = {}) {
    return this.versioned(table, { parentid: root.instanceid, ...fields }, opts);
  }
  /** Detail row. parentid = սեփականատիրոջ entityid */
  detail(table, owner, fields = {}) {
    const row = { entityid: this.nextId(), parentid: owner.entityid, ...fields };
    this.t(table).push(row);
    return row;
  }
}

/** ACCOUNTING դաշտ. currency՝ 'AMD' | 'USD' | ...; rateDate՝ փոխարժեքի ամսաթիվ (օգտատերն է ընտրում, լռելյայն՝ մուտքագրման օրը) */
export function money(prefix, amount, currency = 'AMD', rateDate = null) {
  if (amount === undefined) return {};
  const cid = CURRENCY[currency];
  const r = rateOn(currency, rateDate);
  return {
    [`${prefix}_amount`]: amount,
    [`${prefix}_currencyid`]: cid,
    [`${prefix}_timestamp`]: r.date ? `${r.date}T00:00:00` : null,
    [`${prefix}_ratetodefault`]: r.rate,
  };
}
