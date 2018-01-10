import $ from 'cheerio';

import { parseKeyFromUrl } from '../../../../lib/utils/urls';
import { properCase } from '../../../../lib/utils/string';

const parseStringPassthrough = (str, key) => ({ [key]: (str || '').trim().replace(/[ ]+/g, ' ') });
const parseTeamAbbrevFromString = str => {
  const obj = parseStringPassthrough(str, 'abbrev');

  return { ...obj, abbrev: obj.abbrev.toUpperCase() };
};
const parseTeamNameFromString = str => parseStringPassthrough(str, 'name');
const parseDivisionFromString = str => parseStringPassthrough(str, 'division');
const parseOwnerNameFromString = str => {
  const tStr = (str || '').trim();

  if (!tStr) {
    return undefined;
  }

  const [firstName, ...lastNames] = tStr.split(' ');

  return {
    firstName: properCase(firstName).replace(/[ ]+/g, ' '),
    lastName: properCase(lastNames.join(' ')).replace(/[ ]+/g, ' '),
  };
};

export const selector = '.boxscoreLinks a:first-child';

export const parseMatchupLinks = link => $(link).attr('href');

export const parseRow = row => {
  const cells = $(row).find('td');
  const href = $(cells[2])
    .find('a')
    .attr('href');

  const member = {
    id: parseKeyFromUrl(href, 'teamId', 'int'),
    ...parseTeamAbbrevFromString($(cells[1]).text()),
    ...parseTeamNameFromString($(cells[2]).text()),
    ...parseOwnerNameFromString($(cells[4]).text()),
  };

  member.tags = [{ ...parseDivisionFromString($(cells[3]).text()) }];

  return member;
};
