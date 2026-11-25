/**
 * Մոդուլի մուտք և օգտատերեր (NFR-05…NFR-09).
 *   1. Ադմինիստրատորը ավելացնում է օգտատիրոջը ՀԾՀ-ով. անուն-ազգանունը և ծննդյան ամսաթիվը ստացվում են ԲՊՌ-ից (search_by_psn)
 *   2. Ադմինիստրատորը տրամադրում է դեր
 *   3. Մուտքի ժամանակ օգտատերը ուղղորդվում է ԵՍ ԵՄ ազգային նույնականացման հարթակ (NAP, OpenID Connect + PKCE,
 *      docs/external_web_services/nap/nap.pdf). նույնականացումից հետո մոդուլի սերվերը փոխանակում է կոդը ID token-ի հետ
 *      և ստուգում այն (ստորագրություն, iss, aud, exp, nonce, state)
 *   4. Մոդուլը ստուգում է նույնականացման եղանակը (միայն eid, mid), ՀԾՀ-ն (profile.psn) և օգտատիրոջ առկայությունն ու
 *      կարգավիճակը, և թույլ է տալիս մուտքը համապատասխան դերով
 * Նախատիպում NAP-ը և token-ի ստուգումը մոդելավորված են (ID token-ը կազմվում է մուտքի էջի ցուցադրական պատուհանում)
 */
import { searchByPsn } from '../data/external/bpr.js';

export const NAP = { url: 'https://nid.e-gov.am', authorize: 'https://nid.e-gov.am/hy/auth', token: 'https://nid.e-gov.am/auth/token', discovery: 'https://nid.e-gov.am/.well-known/openid-configuration' };
/** Թույլատրված նույնականացման եղանակներ (acm). ԵՍ ԵՄ-ում՝ միայն նույնականացման քարտ և բջջային ID */
export const ALLOWED_ACM = { eid: 'Նույնականացման քարտ (eID)', mid: 'Բջջային ID (mID)' };

/** ԲՊՌ-ից անձի տվյալներ ըստ ՀԾՀ-ի (օգտատիրոջ ավելացում) */
export function bprPerson(ssn) {
  const p = searchByPsn({ pr_search_by_psn_request: { psn: ssn } })?.pr_search_response?.AVVPerson;
  if (!p) return { ok: false, reason: 'ԲՊՌ-ում այս ՀԾՀ-ով անձ չի գտնվել' };
  const person = p.AVVDocuments?.Document?.[0]?.Document_object?.Person || {};
  if (String(p.IsDead) === 'true') return { ok: false, reason: 'ԲՊՌ-ի տվյալներով անձը մահացած է' };
  const cap = (s) => (s ? s.charAt(0) + s.slice(1).toLocaleLowerCase('hy') : '');
  return { ok: true, name: `${cap(person.First_Name)} ${cap(person.Last_Name)}`, patronymic: cap(person.Patronymic_Name), birthDate: person.Birth_Date || '' };
}

const user = (id, ssn, unit, role) => ({ id, ssn, ...(({ name, patronymic, birthDate }) => ({ name, patronymic, birthDate }))(bprPerson(ssn)), unit, role, active: true, addedAt: '2026-11-01T09:00:00.000Z', addedBy: 'Տեղակայում' });
/**
 * Նախնական օգտատերեր. առաջին ադմինիստրատորը սահմանվում է տեղակայման ժամանակ (կարգավորմամբ), մյուսներին ավելացնում է նա
 */
export const DEFAULT_USERS = [
  user('U5', '0000102110', 'Տեղեկատվական տեխնոլոգիաների բաժին', 'admin'),
  user('U1', '0000100741', 'Հայտարարագրերի վերլուծության վարչություն', 'analyst'),
  user('U2', '0000101814', 'Հայտարարագրերի վերլուծության վարչություն', 'analyst'),
  user('U3', '0000100408', 'Մեթոդաբանության բաժին', 'rules_officer'),
  user('U4', '0000101222', 'Ղեկավարություն', 'manager'),
];

/**
 * ID token-ի (արդեն ստուգված ստորագրությամբ, iss/aud/exp/nonce) ստուգում մոդուլում.
 * @param idToken { acm, sub, profile: { given_name, family_name, psn?, document_number? } }
 * @returns { ok: true, user } | { ok: false, reason }
 */
export function authenticate(users, idToken) {
  if (!ALLOWED_ACM[idToken?.acm]) return { ok: false, reason: `Նույնականացման եղանակը («${idToken?.acm || '—'}») թույլատրված չէ. թույլատրված են միայն նույնականացման քարտը (eID) և բջջային ID-ն (mID)` };
  const ssn = idToken.profile?.psn;
  if (!ssn) return { ok: false, reason: 'Նույնականացման պատասխանում ՀԾՀ չկա (միայն փաստաթղթի համար). մուտքը հնարավոր չէ' };
  const u = (users || []).find((x) => x.ssn === ssn);
  if (!u) return { ok: false, reason: 'Այս ՀԾՀ-ով օգտատեր գրանցված չէ. դիմեք ադմինիստրատորին' };
  if (!u.active) return { ok: false, reason: 'Օգտատիրոջ հաշիվը ապաակտիվ է. դիմեք ադմինիստրատորին' };
  return { ok: true, user: u };
}
