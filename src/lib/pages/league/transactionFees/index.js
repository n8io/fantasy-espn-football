/* eslint-disable no-console */
import cheerio from 'cheerio';

import config from '../../../../config';
import { parseUrl } from '../../../utils/urls';
import { selector, parseRow } from './parser';
import log from '../../../utils/domLogger';

const { urls: { LEAGUE_TRANSACTIONS: url } } = config;

const getLeagueTransactionFees = async (page, seasonId) => {
  const { url: urlLeagueMembers } = parseUrl(url, {
    search: {
      seasonId,
    },
  });

  let msg = `➡️ 302 Redirecting to league transactions: ${urlLeagueMembers} ...`;
  await log(msg, page);

  await page.goto(urlLeagueMembers);

  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  const $ = cheerio.load(bodyHtml);
  const tRows = $(selector).first('table').find('tr');

  // Trim off header row
  const rows = Array.from(tRows).splice(2);

  if (!rows || !rows.length) {
    return [];
  }

  msg = `💰 203 Parsing league transactions...`;
  await log(msg, page);

  const transactions = rows.map(parseRow);

  msg = `👍 200 League transactions parsed successfully. Transactions accumulated for ${transactions.length} team owners.`;
  await log(msg, page);

  return transactions;
};

export default getLeagueTransactionFees;
