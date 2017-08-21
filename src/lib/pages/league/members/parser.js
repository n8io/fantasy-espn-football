import $ from 'cheerio';

import { parseKeyFromUrl } from '../../../utils/urls';
import { properCase } from '../../../utils/string';

const parseStringPassthrough = (str, key) => ({ [key]: (str || '').trim() });
const parseTeamAbbrevFromString = str => parseStringPassthrough(str, 'abbrev');
const parseTeamNameFromString = str => parseStringPassthrough(str, 'name');
const parseDivisionFromString = str => parseStringPassthrough(str, 'division');
const parseOwnerNameFromString = str => {
  const tStr = (str || '').trim();

  if (!tStr) {
    return undefined;
  }

  const [firstName, ...lastNames] = tStr.split(' ');

  return {
    firstName: properCase(firstName),
    lastName: properCase(lastNames.join(' ')),
  };
};

export const selector = 'table.tableBody';

export const parseRow = row => {
  const cells = $(row).find('td');
  const href = $(cells[2]).find('a').attr('href');

  const member = {
    id: parseKeyFromUrl(href, 'teamId', 'int'),
    ...parseTeamAbbrevFromString($(cells[1]).text()),
    ...parseTeamNameFromString($(cells[2]).text()),
    ...parseOwnerNameFromString($(cells[4]).text()),
  };

  member.tags = [{ ...parseDivisionFromString($(cells[3]).text()) }];

  return member;
};
