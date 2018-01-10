/* eslint-disable no-console */
import cheerio from 'cheerio';

import config from '../../../../config';
import { parseUrl } from '../../../../lib/utils/urls';
import { selector, parseMatchupLinks } from './scoreboardParser';
import { parseMatchup } from './matchupParser';
import getDefaultPage from '../../../../lib/utils/page';
import log from '../../../../lib/utils/domLogger';

const { urls: { SCOREBOARD } } = config;
const seconds = 1000;

const getRosters = async ({ browser, page, season, week }) => {
  const { url: uri } = parseUrl(SCOREBOARD, {
    search: {
      seasonId: season,
      scoringPeriodId: week,
    },
  });

  let msg = `➡️ 302 Redirecting to scoreboard: ${uri} ...`;
  await log(msg, page);

  await page.goto(uri, { waitUntil: 'networkidle2' });

  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  const $ = cheerio.load(bodyHtml);
  const matchupLinks = Array.from($(selector));

  if (!matchupLinks || !matchupLinks.length) {
    return [];
  }

  msg = `🛠 203 Parsing scoreboard for ${season}-WK${week.toString().padStart(2, '0')}...`;
  await log(msg, page);

  const links = matchupLinks.map(parseMatchupLinks);

  const prefix = 'http://games.espn.com';

  msg = `👍 200 ${season}-WK${week.toString().padStart(2, '0')} scoreboard parsed successfully. ${
    links.length
  } matchups found.`;
  await log(msg, page);

  const pagePromises = links.map(() => getDefaultPage(browser));

  const pages = await Promise.all(pagePromises);

  const pageOptions = { waitUntil: 'networkidle2', timeout: 15 * seconds };

  const gotoMatchupPromises = links
    .map(link => `${prefix}${link}`)
    .map((address, index) => pages[index].goto(address, { ...pageOptions }));

  await Promise.all(gotoMatchupPromises);

  const markupPromises = links.map((_, index) => pages[index].evaluate(() => document.body.innerHTML));

  const markups = await Promise.all(markupPromises);

  const matchups = markups.map(parseMatchup);

  // Cleanup: close all the matchup tabs
  pages.forEach(p => p.close());

  // for (let i = 0; i < links.length; i++) {
  //   const link = links[i];
  //
  //   const msg = `➡️ 302 Redirecting to scoreboard: ${link} ...`;
  //   await log(msg, page);
  //
  //   await page.goto(`${prefix}${link}`);
  //
  //   const html = await page.evaluate(() => document.body.innerHTML);
  //
  //   const matchup = parseMatchup(html);
  //
  //   matchups.push(matchup);
  // }

  // console.log(JSON.stringify(matchups, null, 2));

  return matchups;

  // return activities.filter(a => !!a).sort((a, b) => {
  //   const aDate = moment(a.date);
  //   const bDate = moment(b.date);
  //
  //   if (aDate.isBefore(bDate)) {
  //     return -1;
  //   } else if (aDate.isAfter(bDate)) {
  //     return 1;
  //   }
  //
  //   return 0;
  // });
};

export default getRosters;
