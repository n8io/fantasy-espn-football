/* eslint-disable no-console */
import cheerio from 'cheerio';

import config from '../../../../config';
import { parseUrl } from '../../../utils/urls';
import { selector, parseRow } from './parser';
import log from '../../../utils/domLogger';
import amend from './amendments';

const { urls: { LEAGUE_MEMBERS } } = config;

const getLeagueMembers = async (page, seasonId) => {
  const { url: urlLeagueMembers } = parseUrl(LEAGUE_MEMBERS, {
    search: {
      seasonId,
    },
  });

  let msg = `➡️ 302 Redirecting to league members: ${urlLeagueMembers} ...`;
  await log(msg, page);

  await page.goto(urlLeagueMembers);

  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  const $ = cheerio.load(bodyHtml);
  const tRows = $(selector).first().find('tr:not([style])');

  // Trim off header row
  const rows = Array.from(tRows).splice(1);

  if (!rows || !rows.length) {
    return [];
  }

  msg = `👨‍👨‍👦‍ 203 Parsing league members...`;
  await log(msg, page);

  const members = rows.map(parseRow).sort((a, b) => {
    if (a.id < b.id) {
      return -1;
    } else if (a.id > b.id) {
      return 1;
    }

    return 0;
  });

  msg = `👍 200 League members parsed successfully. ${members.length} members found.`;
  await log(msg, page);

  return amend(members, seasonId);
};

export default getLeagueMembers;
