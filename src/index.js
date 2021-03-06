/* eslint-disable no-console,no-unused-vars */
import puppeteer from 'puppeteer';
import moment from 'moment-timezone';

import config from './config';
import { save } from './lib/utils/dataWriter';
import log from './lib/utils/domLogger';
import login from './lib/pages/login';
import getLeagueRecentActivity from './lib/pages/league/recentActivity';
import getLeagueMembers from './lib/pages/league/members';
import getLeagueTransactionFees from './lib/pages/league/transactionFees';
import getLeagueSchedule from './lib/pages/league/schedule';
import updatePlayoffSchedule from './lib/pages/league/schedule/playoffBracket';
import getLeagueRosters from './lib/pages/league/weekly';
import getLeagueDraftRecap from './lib/pages/league/draft';

const { puppeteer: puppeteerConfig } = config;

const parseSeason = async (page, league, season, browser) => {
  let msg = ``;
  await log(msg, page);

  msg = `🏈 203 Starting to parse the ${season} season...`;
  await log(msg, page);

  let leagueMembers = await getLeagueMembers(page, season);
  save(season, league, 'league', 'members', leagueMembers);

  let leagueRecentActivity = await getLeagueRecentActivity(page, season, leagueMembers);
  save(season, league, 'league', 'activity', leagueRecentActivity);
  leagueRecentActivity = null;

  let leagueTransactionFees = await getLeagueTransactionFees(page, season);
  save(season, league, 'league', 'fees', leagueTransactionFees);
  leagueTransactionFees = null;

  let leagueSchedule = await getLeagueSchedule(page, season, leagueMembers);
  leagueMembers = null;
  let leagueUpdatedSchedule = await updatePlayoffSchedule(page, season, leagueSchedule);
  save(season, league, 'league', 'schedule', leagueUpdatedSchedule);
  leagueSchedule = null;
  leagueUpdatedSchedule = null;

  let leagueDraftRecap = await getLeagueDraftRecap({ page, league, season });
  await log(`💾 301 Saving ${season} season draft recap...`);
  save(season, league, 'league', 'draft', leagueDraftRecap);
  leagueDraftRecap = null;

  let leagueRosters = await getLeagueRosters({ browser, page, league, season });
  await log(`💾 301 Saving ${season} season rosters...`);
  save(season, league, 'league', 'rosters', leagueRosters);
  leagueRosters = null;

  msg = `🏁 200 Done parsing data for ${season} season.`;
  await log(msg, page);
};

(async () => {
  let browser;
  const startTime = moment();

  try {
    browser = await puppeteer.launch({ ...puppeteerConfig });

    const page = await browser.newPage();
    const { browser: emualteOptions, espn: { seasons, league } } = config;

    await page.setRequestInterception(true);

    // Block image requests bc we dont want the unnecessary overhead
    page.on('request', request => {
      if (/\.(png|jpg|jpeg|gif|webp)$/.test(request.url)) request.abort();
      else request.continue();
    });

    await page.emulate({
      ...emualteOptions,
    });

    const isLoggedIn = await login(page);

    if (isLoggedIn === false) {
      await page.waitFor(config.waitFor || 500);

      throw new Error('Login failed!');
    }

    /* eslint-disable no-plusplus,no-await-in-loop */
    for (let i = 0; i < seasons.length; i++) {
      const season = seasons[i];

      await parseSeason(page, league, season, browser);
    }
    /* eslint-enable no-plusplus,no-await-in-loop */

    await page.waitFor(config.waitFor || 500);
  } catch (e) {
    console.log(e);
  } finally {
    if (browser) {
      await log(`🔌 205 Shutting down`);
      browser.close();
    }

    const duration = moment.duration(moment().diff(startTime));

    await log(`⏱ 203 Total processing time ${duration.minutes()}m${duration.seconds()}s`);
  }
})();
