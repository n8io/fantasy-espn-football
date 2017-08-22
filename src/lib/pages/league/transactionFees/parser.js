import $ from 'cheerio';
import math from 'mathjs';

import { parseKeyFromUrl } from '../../../utils/urls';

const parseValueFromStringByRegex = (str, reg, fallback, castType) => {
  const matches = reg.exec(str);

  if (matches && matches.length && matches.length >= 2) {
    switch (castType) {
      case 'int':
        return math.eval(matches[1]);
      case 'float':
        return parseFloat(math.eval(matches[1]), 10);
      default:
        return matches[1].trim();
    }
  }

  return fallback;
};

const parseMoneyFromString = str => {
  const reg = /([0-9]+([.][0-9]+))/gi;

  return parseValueFromStringByRegex(str, reg, 0.0, 'float');
};

const parseCountFromString = str => {
  const reg = /[(]([0-9]+)[)]/gi;

  return parseValueFromStringByRegex(str, reg, 0, 'int');
};

const parseTeamIdFromLink = href => ({ teamId: parseKeyFromUrl(href, 'teamId', 'int') });
const parseTransactionFromString = (str, key) => ({
  [key]: {
    count: parseCountFromString(str),
    fee: parseMoneyFromString(str),
  },
});

export const selector = 'table.tableBody';

export const parseRow = row => {
  const cells = $(row).find('td');

  const teamLink = $(cells[0]).find('a');

  const teamTransactions = [
    'entries',
    'losses',
    'trades',
    'adds',
    'drops',
    'irPlacements',
    'misc',
    'total',
    'paid',
  ].reduce((acc, col, index) => {
    // eslint-disable-next-line no-param-reassign
    acc = {
      ...acc,
      ...parseTransactionFromString($(cells[index + 1]).text(), col),
    };

    return acc;
  }, {});

  const item = {
    ...parseTeamIdFromLink(teamLink.attr('href')),
    ...teamTransactions,
  };

  return item;
};
