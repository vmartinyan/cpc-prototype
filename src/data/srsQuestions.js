/**
 * SRS-ի (docs/SRS.md) «Բաց հարցեր և ընդունված որոշումներ» աղյուսակի ընթերցում։
 * Աղբյուրը մեկն է՝ SRS.md-ն (ներառվում է կառուցման ժամանակ), ուստի նախատիպը միշտ ցույց է տալիս SRS-ի ընթացիկ հարցերը
 */
const SECTION = '## Բաց հարցեր և ընդունված որոշումներ';

/** Աղյուսակի տողը → բջիջներ («\|»-ը բջջի ներսում է) */
const cells = (line) => line.slice(1, -1).split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));

/** Ընդունված է համարվում միայն «Ընդունված» կարգավիճակը («Մասամբ ընդունված»-ը բաց է) */
export const isAccepted = (status) => /^ընդունված$/i.test(status.trim());

/** @returns [{ id, text, source, status, accepted }] */
export function parseOpenQuestions(md) {
  const start = md.indexOf(SECTION);
  if (start < 0) return [];
  const rest = md.slice(start + SECTION.length);
  const end = rest.search(/\n## /);
  const block = end >= 0 ? rest.slice(0, end) : rest;
  return block.split('\n')
    .filter((l) => /^\| Q-\d+/.test(l))
    .map((l) => {
      const [id, text, source, status] = cells(l.trim());
      return { id, text, source, status, accepted: isAccepted(status || '') };
    });
}
