/* eslint-disable no-console,no-unused-vars */
import puppeteer from 'puppeteer';
import moment from 'moment-timezone';

import getDefaultPage from '../../../../lib/utils/page';
import config from '../../../../config';
import { save } from '../../../../lib/utils/dataWriter';
import log from '../../../../lib/utils/domLogger';
import login from '../../../../lib/pages/login';
import parseWeeksRosters from './parser';
import getSeasonRosters from '../../../../reporting/data/league/rosters';
import getMatchups from '../../../../reporting/data/league/matchups';

const { puppeteer: puppeteerConfig } = config;

const parseWeek = async ({ browser, page, league, season, week }) => {
  let msg = ``;
  await log(msg, page);

  msg = `🏈 203 Starting to parse ${season}-WK${week.toString().padStart(2, '0')}...`;
  await log(msg, page);

  const rosterScores = await parseWeeksRosters({ browser, page, season, week });

  msg = `🏁 200 Done parsing data ${season}-${week.toString().padStart(2, '0')}.`;
  await log(msg, page);

  return rosterScores;
};

const getLeagueRosters = async ({ browser, league, season }) => {
  const page = await getDefaultPage(browser);
  const { espn: { weeks } } = config;

  const allMatchups = getMatchups();

  const getWeeks = matchups =>
    Number(matchups[matchups.length - 1].tags.find(t => t.startsWith('WEEK_')).replace('WEEK_', ''));

  /* eslint-disable no-plusplus,no-await-in-loop */
  const weekRosterScores = [];

  const thisSeasonsMatchups = m => m.tags.indexOf(`SEASON_${season}`) > -1;

  const seasonMatchups = allMatchups.filter(thisSeasonsMatchups);
  const weeksMax = getWeeks(seasonMatchups);

  for (let weekIndex = 0; weekIndex < weeksMax; weekIndex++) {
    const week = weekIndex + 1;

    if (weeks.length && weeks.indexOf(week) === -1) {
      await log(`302 ⏩ Skip week ${week.toString().padStart(2, '0')} (not in list of requested weeks)`);

      continue; // eslint-disable-line no-continue
    }

    const rosterScores = await parseWeek({ browser, page, league, season, week });

    weekRosterScores.push({
      week,
      rosters: rosterScores,
    });
  }

  return weekRosterScores;
};

export default getLeagueRosters;
