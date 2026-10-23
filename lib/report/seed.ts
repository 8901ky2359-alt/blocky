// LINE報告から集計した進捗（2026/10/23時点）。この時点より古い記録しかない現場にだけ反映する。
// ページで状況を変えると、そちらが新しいので上書きされない。

import { SITES } from './data';
import { SiteProgress, Stage, stagePatch } from './types';
import { typeOf } from './status';

export const SEED_AT = Date.parse('2026-10-23T00:00:00+09:00');

const WEEDED = [
  'WEST-L-25', 'WEST-L-290', 'WEST-L-641', 'WEST-L-693', 'WEST-L-898', 'WEST-L-1015', 'WEST-L-1029',
  'WEST-L-1098', 'WEST-L-1102', 'WEST-L-1108', 'WEST-L-1169', 'WEST-L-1203', 'WEST-L-1217', 'WEST-L-1241',
  'WEST-L-1281', 'WEST-L-1282', 'WEST-L-1335', 'WEST-L-1357', 'WEST-L-1386', 'WEST-L-1390', 'WEST-L-1442',
  'WEST-L-1455', 'WEST-L-1471', 'WEST-L-1472', 'WEST-L-1479', 'WEST-L-1491', 'WEST-L-1541',
  'Lohas-925', 'Lohas-1029', 'Lohas-1075', 'Lohas-1102', 'Lohas-1185', 'Lohas-1281', 'Lohas-1357', 'Lohas-1374',
];
const SHEET_DONE = ['WEST-L-903', 'WEST-L-1075', 'WEST-L-1171', 'WEST-L-1228', 'WEST-L-1244', 'WEST-L-1249', 'WEST-L-1250', 'WEST-L-1437'];
const SHEETING = ['WEST-L-1246'];
const WEEDING = ['WEST-L-1185'];
const BEE = ['Lohas-925', 'Lohas-1185'];

export function seedProgress(): SiteProgress[] {
  const rows: SiteProgress[] = [];
  const add = (names: string[], stageFor: (sheetSite: boolean) => Stage) => {
    for (const name of names) {
      const site = SITES.find((s) => s.name === name);
      if (!site) continue;
      const base: SiteProgress = { workNo: site.workNo, weedDone: false, done: false, nextWeek: false, updatedAt: SEED_AT };
      const sheetSite = typeOf(site, base) === 'シートあり';
      rows.push({ ...base, ...stagePatch(stageFor(sheetSite)), bee: BEE.includes(name) });
    }
  };
  // 除草のみの現場（草刈りだけの依頼）は除草完了＝完工
  add(WEEDED, (sheetSite) => (sheetSite ? 'weeded' : 'done'));
  add(SHEET_DONE, () => 'done');
  add(SHEETING, () => 'sheeting');
  add(WEEDING, () => 'weeding');
  return rows;
}
