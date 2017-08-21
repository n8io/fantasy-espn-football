/* eslint-disable no-console */
import cheerio from 'cheerio';

import config from '../../../../config';
import { parseUrl } from '../../../utils/urls';
import { selector, parseRows } from './parser';
import log from '../../../utils/domLogger';

const { urls: { LEAGUE_SCHEDULE: url } } = config;

const getSchedule = async (page, seasonId, members) => {
  const { url: gotoUrl } = parseUrl(url, {
    search: {
      seasonId,
    },
  });

  let msg = `➡️ 302 Redirecting to league schedule: ${gotoUrl} ...`;
  await log(msg, page);

  await page.goto(gotoUrl);

  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  const $ = cheerio.load(bodyHtml);
  const tRows = $(selector).first('table').find('tr');

  const rows = Array.from(tRows);

  if (!rows || !rows.length) {
    return [];
  }

  msg = `📅 203 Parsing league schedule...`;
  await log(msg, page);

  const schedule = parseRows(rows, members);

  msg = `👍 200 League schedule parsed successfully. Schedule accumulated for ${Object.keys(schedule).length} weeks.`;
  await log(msg, page);

  return schedule;
};

export default getSchedule;
