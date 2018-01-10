/* eslint-disable no-bitwise, import/prefer-default-export */
import $ from 'cheerio';
import { parseKeyFromUrl } from '../../../../lib/utils/urls';

const replaceMultipleSpaces = (str = '') => str.toString().replace(/[ ]+/g, ' ');

const parseTeamInfos = html => {
  const info = $(html).find('#teamInfos');
  const teamNames = Array.from($(info).find('.bodyCopy b:first-child')).map(el =>
    replaceMultipleSpaces(
      $(el)
        .text()
        .trim(),
    ),
  );
  const teamIds = Array.from($(info).find('a')).map(a => parseKeyFromUrl($(a).attr('href'), 'teamId', 'int'));

  const ownerNames = Array.from($(info).find('.teamInfoOwnerData')).map(div =>
    $(div)
      .text()
      .trim(),
  );

  const teams = teamNames.map((tn, index) => ({
    id: teamIds[index],
    name: tn,
    owner: ownerNames[index],
  }));

  return teams;
};

const parsePlayerIdFromRow = tr =>
  $(tr).attr('id')
    ? ~~$(tr)
        .attr('id')
        .replace(/[a-z]+/g, '')
    : -1;

const POS = {
  QB: { key: 'QB', category: 'OFF' },
  RB: { key: 'RB', category: 'OFF' },
  HB: { key: 'RB', category: 'OFF' },
  FB: { key: 'RB', category: 'OFF' },
  'RB/WR': { key: 'FLEX', category: 'OFF' },
  WR: { key: 'WR', category: 'OFF' },
  TE: { key: 'TE', category: 'OFF' },
  LB: { key: 'LB', category: 'DEF' },
  OLB: { key: 'LB', category: 'DEF' },
  ILB: { key: 'LB', category: 'DEF' },
  MLB: { key: 'LB', category: 'DEF' },
  DL: { key: 'DL', category: 'DEF' },
  DE: { key: 'DL', category: 'DEF' },
  DT: { key: 'DL', category: 'DEF' },
  NT: { key: 'DL', category: 'DEF' },
  DB: { key: 'DB', category: 'DEF' },
  CB: { key: 'DB', category: 'DEF' },
  S: { key: 'DB', category: 'DEF' },
  K: { key: 'K', category: 'ST' },
  P: { key: 'P', category: 'ST' },
  BENCH: { key: 'BENCH', category: 'BENCH' },
  IR: { key: 'IR', category: 'IR' },
};

const INJURY_STATII = {
  D: 'DOUBTFUL',
  Q: 'QUESTIONABLE',
  O: 'OUT',
  P: 'PROBABLE',
  PUP: 'PHYISCALLY_UNABLE_TO_PLAY',
  IR: 'INJURED_RESERVER',
  SSPD: 'SUSPENDED',
  ACTIVE: 'ACTIVE',
  UNKNOWN: 'UNKNOWN',
};

const getPlayerInjuryStatus = str => {
  const status =
    INJURY_STATII[
      (str || '')
        .toString()
        .trim()
        .toUpperCase()
    ] || INJURY_STATII.UNKNOWN;

  return status;
};

const parsePlayerSlotFromCell = td => {
  const key = $(td)
    .text()
    .toUpperCase();

  return POS[key] ? POS[key].key : 'UNKNOWN';
};

const parsePlayerPointsFromCell = td => {
  const points = parseFloat(
    $(td)
      .text()
      .trim(),
    0,
  );

  if (isNaN(points)) {
    return 0;
  }

  return points;
};

const parsePlayerCategoryFromCell = td => {
  const key = $(td)
    .text()
    .toUpperCase();

  return POS[key] ? POS[key].category : 'UNKNOWN';
};

const parsePlayerFromCell = td => {
  const raw = $(td)
    .remove('span')
    .text()
    .trim();
  const normalized = raw
    .replace(/[\s]+/, ' ')
    .replace(/[^a-z'. ,-]+/gi, ' ')
    .replace(/[ ]+/gi, ' ')
    .replace(' , ', ', ');

  const nameParts = normalized.split(',');

  if (!normalized || nameParts.length <= 1) {
    throw new Error(`Unexpected player name cell: ${raw}`);
  }

  const firstNameReg = /^([a-z'.-]+)/gi;
  const firstNameMatches = firstNameReg.exec(nameParts[0]);
  const firstName = firstNameMatches[1];

  let lastName = nameParts[0]
    .replace(`${firstName} `, '')
    .replace('*', '')
    .trim();

  const suffixReg = /[ ]([sj]r[.]|[iv]+$)/i;
  const suffixMatches = suffixReg.exec(lastName);
  let suffix;

  if (suffixMatches && suffixMatches.length === 2) {
    suffix = suffixMatches[1].trim();
    lastName = lastName.replace(` ${suffix}`, '');
  }

  const reg = /[\s]+([A-Za-z]{2,3})[\s]+([A-Z]{1,3})(,[\s]+[A-Z]{1,3})?(,[\s]+[A-Z]{1,3})?([\s]+[A-Z])?/g;
  let matches = reg.exec(normalized);

  if (!matches) {
    throw new Error(normalized);
  }

  matches.shift(); // remove the first entry of the arr

  matches = matches.map(
    o =>
      !o
        ? o
        : o
            .toString()
            .trim()
            .replace(/[\s,]+/g, ''),
  );

  let injuryStatus = getPlayerInjuryStatus(matches.pop());

  if (injuryStatus === INJURY_STATII.UNKNOWN) {
    injuryStatus = INJURY_STATII.ACTIVE;
  }

  const fullname = `${firstName} ${lastName}${suffix ? ` ${suffix}` : ''}${
    injuryStatus === INJURY_STATII.IR ? '*' : ''
  }`;
  const team = normalized
    .replace(`${fullname}, `, '')
    .trim()
    .split(' ')[0];

  let positions = [];
  try {
    positions =
      normalized
        .split(`,`)[1]
        .split(`${team} `)[1]
        .split(' ')
        .filter(p => ['IR', 'Q', 'D', 'O', 'SSPD'].indexOf(p) === -1)
        .join(' ')
        .replace(/[ ]+/gi, '')
        .split(',')
        .map(p => (p || '').trim()) || [];
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          team,
          split: normalized.split(`,`)[1].split(`${team} `)[1],
          normalized,
        },
        null,
        2,
      ),
    );

    throw e;
  }
  return { team: team.toUpperCase(), positions, firstName, lastName, suffix, injuryStatus, raw: normalized };
};

const parsePlayerRow = (tr, hasSlot) => {
  const id = parsePlayerIdFromRow(tr);

  if (!id || id === -1) {
    return { id };
  }

  const cells = Array.from($(tr).find('td'));

  const player = parsePlayerFromCell(cells[hasSlot ? 1 : 0]);
  const position = player.positions[0];
  const posObj = POS[position];

  if (!posObj) {
    console.error(JSON.stringify({ player, position, posObj }, null, 2)); // eslint-disable-line no-console

    throw new Error(`Unexpected player position found: ${position}`);
  }

  const slot = hasSlot ? parsePlayerSlotFromCell(cells[0]) : posObj.key;
  const category = hasSlot ? parsePlayerCategoryFromCell(cells[0]) : posObj.category;
  const points = parsePlayerPointsFromCell(cells[cells.length - 1]);

  return {
    id,
    category,
    slot,
    player,
    points,
  };
};

const parseTeamRoster = table => {
  const hasSlot =
    $(table)
      .find('.playerTableBgRowSubhead2.tableSubHead td')
      .first()
      .text() === 'SLOT';
  const rows = Array.from($(table).find('tr.pncPlayerRow')).map(tr => parsePlayerRow(tr, hasSlot));

  // Only those with valid playerIds
  return rows.filter(({ id }) => id !== -1);
};

const parseTeamRosters = html => {
  const hasBench = $(html).find('.playerTableShowHideGroupLink').length > 0;
  const t1Starters = parseTeamRoster($(html).find(`#playertable_0`));
  const t1Bench = parseTeamRoster($(html).find(`#playertable_${hasBench ? 1 : 99}`));
  const t2Starters = parseTeamRoster($(html).find(`#playertable_${hasBench ? 2 : 1}`));
  const t2Bench = parseTeamRoster($(html).find(`#playertable_${hasBench ? 3 : 99}`));

  return [
    {
      starters: t1Starters,
      bench: t1Bench,
    },
    {
      starters: t2Starters,
      bench: t2Bench,
    },
  ];
};

const parseMatchup = html => {
  const teamInfos = parseTeamInfos(html);
  const teamRosters = parseTeamRosters(html);

  const matchupRosters = teamInfos.map((ti, index) => ({
    team: {
      ...ti,
      roster: {
        starters: [...teamRosters[index].starters],
        bench: [...teamRosters[index].bench],
      },
    },
  }));

  return matchupRosters;
};

export { parseMatchup };
